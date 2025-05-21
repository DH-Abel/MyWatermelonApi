import api from '../../api/axios';
import { database } from '../database/database';
import { Q } from '@nozbe/watermelondb';
import { syncHistory } from './syncHistory';

let syncInProgress = false;

const getLastSync = async (tableName) => {
  try {
    const syncCollection = database.collections.get('t_sync');
    const registros = await syncCollection
      .query(Q.where('f_tabla', tableName))
      .fetch();
    if (registros.length > 0) {
      return parseInt(registros[0].f_fecha, 10);
    }
  } catch (error) {
    console.error(`Error obteniendo última sincronización para ${tableName}:`, error);
  }
  return 0;
};

const trimString = (v) => (v == null ? '' : String(v).trim());
const toInt = (v) => {
  const n = parseInt(v, 10);
  return isNaN(n) ? 0 : n;
};

const sincronizarConceptosDev = async () => {
  if (syncInProgress) return;
  const nombreTabla = 't_concepto_devolucion';
  const INTERVALO = 500 * 10 * 10 * 1000; 
  const lastSync = await getLastSync(nombreTabla);

  if (Date.now() - lastSync < INTERVALO) {
    console.log(
      `Sincronización de conceptos dev omitida, faltan ${Math.round(
        (INTERVALO - (Date.now() - lastSync)) / 1000 / 60
      )} minutos`
    );
    return;
  }

  syncInProgress = true;
  try {
    const syncCol = database.collections.get('t_sync');
    const syncRecords = await syncCol.query(Q.where('f_tabla', nombreTabla)).fetch();
    const lastSyncRaw = syncRecords.length > 0 ? syncRecords[0].f_fecha : null;

    let lastSync;
    if (lastSyncRaw) {
      const asNumber = Number(lastSyncRaw);
      const date = !isNaN(asNumber) ? new Date(asNumber) : new Date(lastSyncRaw);
      lastSync = !isNaN(date.getTime()) ? date.toISOString() : new Date(0).toISOString();
    } else {
      lastSync = new Date(0).toISOString();
    }

    console.log('Sincronizando conceptos dev');

    // 1) Traer y normalizar remotos
    const { data: raw } = await api.get(`/devoluciones/conceptos`);
    if (!Array.isArray(raw)) return;
    const remoteItems = raw.map(item => ({
      id: toInt(item.f_id),
      concepto: trimString(item.f_concepto),
    }));
    console.log(`Fetched ${remoteItems.length} conceptos dev remotos.`);

    // 2) Leer locales
    const col = database.collections.get(nombreTabla);
    const locales = await col.query().fetch();
    const localMap = new Map(locales.map(r => [r.f_id, r]));

    // 3) Preparar batch
    const batchActions = [];
    for (const b of remoteItems) {
      const local = localMap.get(b.id);
      if (local) {
        const changed =
          local.f_concepto !== b.concepto
        if (changed) {
          batchActions.push(
            local.prepareUpdate(record => {
              record.f_concepto = b.concepto;
            })
          );
        }
      } else {
        batchActions.push(
          col.prepareCreate(record => {
            // ID interno de WatermelonDB
            record._raw.id = String(b.id);
            record.f_id = b.id;
            record.f_concepto = b.concepto;
          })
        );
      }
    }

    // 4) Ejecutar batch dentro de un writer
    await database.write(async () => {
      if (batchActions.length > 0) {
        await database.batch(batchActions);
        console.log(`Batch concepto dev ejecutado: ${batchActions.length} acciones.`);
      } else {
        console.log('No hay cambios de concepto dev que aplicar.');
      }
    });

    // 5) Registrar historial y finalizar
    await syncHistory(nombreTabla);
    console.log('Sincronización de concepto dev completada.');
  } catch (error) {
    console.error('Error sincronizando concepto dev:', error);
  } finally {
    syncInProgress = false;
  }
};

export default sincronizarConceptosDev;

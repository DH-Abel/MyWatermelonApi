import api from '../../api/axios';
import { database } from '../database/database';
import { Q } from '@nozbe/watermelondb';
import { syncHistory } from './syncHistory';

let syncInProgress = false;

const getLastSync = async (tableName) => {
  try {
    const syncCollection = database.collections.get('t_sync');
    const registros = await syncCollection.query(Q.where('f_tabla', tableName)).fetch();
    if (registros.length > 0) {
      const raw = registros[0].f_fecha;
      // Si es numérico (string de dígitos), lo parseo:
      if (/^\d+$/.test(raw)) {
        return parseInt(raw, 10);
      }
      // Si no, falseamos a Date ISO:
      const ms = new Date(raw).getTime();
      return isNaN(ms) ? 0 : ms;
    }
  } catch (error) {
    console.error(`Error obteniendo última sincronización para ${tableName}:`, error);
  }
  return 0;
};


const normalizeNumber = (v) => {
  // parseFloat maneja sufijos (%) y deja solo la parte numérica
  const n = parseFloat(v);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
};

const sincronizarDescuentos = async () => {
  const nombreTabla = 't_desc_x_pago_cliente';
  const INTERVALO = 24 * 60 * 60 * 1000; // 48 h – evita ejecutar con demasiada frecuencia

  const lastSyncTimestamp = await getLastSync(nombreTabla);

  if (Date.now() - lastSyncTimestamp < INTERVALO) {
    console.log(
      `Sincronización de descuentos omitida, faltan ${Math.round(
        (INTERVALO - (Date.now() - lastSyncTimestamp)) / 1000 / 60
      )} minutos`
    );
    return;
  }



  syncInProgress = true;
  const tableName = 't_desc_x_pago_cliente';
  try {

    // 1) Obtener fecha de última sincronización
    const syncCol = database.collections.get('t_sync');
    const syncRecords = await syncCol.query(Q.where('f_tabla', tableName)).fetch();
    const lastSyncRaw = syncRecords.length > 0 ? syncRecords[0].f_fecha : null;

    // 2) Formatear lastSync o usar epoch
    let lastSync;
    if (lastSyncRaw) {
      const asNumber = Number(lastSyncRaw);
      const date = !isNaN(asNumber) ? new Date(asNumber) : new Date(lastSyncRaw);
      lastSync = !isNaN(date.getTime()) ? date.toISOString() : new Date(0).toISOString();
    } else {
      lastSync = new Date(0).toISOString();
    }
    console.log('Sincronizando descuentos…');

    // 1) Traer datos remotos
    const { data: raw } = await api.get(`/descuentos/${encodeURIComponent(lastSync)}`);
    if (!Array.isArray(raw)) {
      console.warn('/descuentos no devolvió un array');
      return;
    }

    // 2) Leer existentes y mapearlos
    const col = database.collections.get(nombreTabla);
    const locales = await col.query().fetch();
    const localMap = new Map(
      locales.map((r) => [`${r.f_cliente}-${r.f_dia_inicio}-${r.f_dia_fin}`, r])
    );

    // 3) Preparar acciones de create/update
    const batchActions = [];
    raw.forEach((item) => {
      const f_cliente = parseInt(item.f_cliente, 10);
      const f_dia_inicio = parseInt(item.f_dia_inicio, 10);
      const f_dia_fin = parseInt(item.f_dia_fin, 10);
      const f_descuento1 = normalizeNumber(item.f_descuento1);
      const key = `${f_cliente}-${f_dia_inicio}-${f_dia_fin}`;
      const local = localMap.get(key);

      if (local) {
        if (local.f_descuento1 !== f_descuento1) {
          batchActions.push(
            local.prepareUpdate((r) => {
              r.f_descuento1 = f_descuento1;
              r.f_dia_inicio = f_dia_inicio;
              r.f_dia_fin = f_dia_fin;
            })
          );
        }
      } else {
        batchActions.push(
          col.prepareCreate((r) => {
            r.f_cliente = f_cliente;
            r.f_dia_inicio = f_dia_inicio;
            r.f_dia_fin = f_dia_fin;
            r.f_descuento1 = f_descuento1;
          })
        );
      }
    });

    // 4) Ejecutar batch dentro de un writer
    await database.write(async () => {
      if (batchActions.length > 0) {
        await database.batch(batchActions);
        console.log(`Batch descuentos ejecutado: ${batchActions.length} acciones.`);
      } else {
        console.log('No hay cambios de descuentos que aplicar.');
      }
    });

    // 5) Registrar historial
    await syncHistory(nombreTabla);
    console.log('Sincronización de descuentos completada.');
  } catch (error) {
    console.error('Error sincronizando descuentos:', error);
  } finally {
    syncInProgress = false;
  }
};

export default sincronizarDescuentos;

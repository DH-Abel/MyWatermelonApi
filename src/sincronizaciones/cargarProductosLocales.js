import api from '../../api/axios';
import { database } from '../database/database';
import { Q } from '@nozbe/watermelondb';
import { syncHistory } from './syncHistory';


let syncInProgress = false;

// Reemplaza tu función getLastSync por esta versión que maneja timestamps numéricos e ISO:
const getLastSync = async (tableName) => {
  try {
    const syncCollection = database.collections.get('t_sync');
    const registros = await syncCollection
      .query(Q.where('f_tabla', tableName))
      .fetch();
    if (registros.length === 0) return 0;

    const raw = registros[0].f_fecha;
    let timestamp;

    // Si es un string sólo de dígitos, parsearlo directamente
    if (/^\d+$/.test(raw)) {
      timestamp = parseInt(raw, 10);
    } else {
      // Si es ISO (p.ej. "2025-05-15T14:30:00.000Z"), convertirlo a ms
      const ms = new Date(raw).getTime();
      timestamp = isNaN(ms) ? 0 : ms;
    }

    console.log(
      'Fecha de la última sincronización PRODUCTOS:',
      new Date(timestamp).toLocaleString()
    );
    return timestamp;
  } catch (error) {
    console.error(
      `Error al obtener el historial de sincronización para ${tableName}:`,
      error
    );
    return 0;
  }
};


const trimString = (v) => (v == null ? '' : String(v).trim());
const toFloat = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
};

const sincronizarProductos = async () => {
  if (syncInProgress) return;

   const INTERVALO = 1 * 60 * 60 * 1000; // 1 hora
  const tableName = 't_productos_sucursal';


  const lastSync = await getLastSync(tableName);
  if (Date.now() - lastSync < INTERVALO) {
    console.log(
      `Sincronización de descuentos omitida, faltan ${Math.round(
        (INTERVALO - (Date.now() - lastSync)) / 1000 / 60
      )} minutos`
    );
    return;
  }


  syncInProgress = true;
  try {
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
    console.log('Sincronizando productos…');

    console.log('Llamando a /productos con fecha:', lastSync);
    // 1) Traer y normalizar remotos
    const { data: raw } = await api.get(`/productos/${encodeURIComponent(lastSync)}`);
    if (!Array.isArray(raw)) {
      console.warn('Respuesta de /productos no es un array');
      return;
    }
    const productosRemotos = raw.map((p) => ({
      referencia: parseInt(p.f_referencia, 10),
      descripcion: trimString(p.f_descripcion),
      referenciaSuplidor: trimString(p.f_referencia_suplidor),
      precio5: toFloat(p.f_precio5),
      existencia: toFloat(p.f_existencia),
    }));
    console.log(`Fetched ${productosRemotos.length} productos remotos.`);

    // 2) Leer locales
    const col = database.collections.get(tableName);
    const locales = await col.query().fetch();
    const localMap = new Map(
      locales.map((r) => [r.f_referencia, r])
    );

    // 3) Preparar batch
    const batchActions = [];
    for (const prod of productosRemotos) {
      const local = localMap.get(prod.referencia);
      if (local) {
        // Comparar campos clave
        const dif =
          Math.abs(local.f_existencia - prod.existencia) > 0.001 ||
          local.f_descripcion !== prod.descripcion ||
          Math.abs(local.f_precio5 - prod.precio5) > 0.001 ||
          local.f_referencia_suplidor !== prod.referenciaSuplidor;

        if (dif) {
          batchActions.push(
            local.prepareUpdate((record) => {
              record.f_existencia = prod.existencia;
              record.f_descripcion = prod.descripcion;
              record.f_precio5 = prod.precio5;
              record.f_referencia_suplidor = prod.referenciaSuplidor;
            })
          );
        }
      } else {
        batchActions.push(
          col.prepareCreate((record) => {
            // El ID interno de WatermelonDB
            record._raw.id = String(prod.referencia);
            record.f_referencia = prod.referencia;
            record.f_descripcion = prod.descripcion;
            record.f_referencia_suplidor = prod.referenciaSuplidor;
            record.f_precio5 = prod.precio5;
            record.f_existencia = prod.existencia;
          })
        );
      }
    }

    // 4) Ejecutar batch dentro de un writer
    await database.write(async () => {
      if (batchActions.length > 0) {
        await database.batch(batchActions);
        console.log(`Batch ejecutado: ${batchActions.length} acciones.`);
      } else {
        console.log('No hay cambios de productos que aplicar.');
      }
    });

    // 5) Registrar historial y finalizar
    await syncHistory(tableName);
    console.log('Sincronización de productos completada.2');
  } catch (error) {
    console.error('Error en la sincronización de productos:', error);
  } finally {
    syncInProgress = false;
  }
};

export default sincronizarProductos;

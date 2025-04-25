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
      const timestamp = parseInt(registros[0].f_fecha, 10);
      console.log(
        'Fecha de la última sincronización:',
        new Date(timestamp).toLocaleString()
      );
      return timestamp;
    }
    console.log(
      `No se encontraron registros de sincronización para la tabla ${tableName}`
    );
  } catch (error) {
    console.error(
      `Error al obtener el historial de sincronización para ${tableName}:`,
      error
    );
  }
  return 0;
};

const trimString = (v) => (v == null ? '' : String(v).trim());
const toFloat = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
};

const sincronizarProductos = async () => {
  if (syncInProgress) return;
  const INTERVAL_MS = 60 * 60 * 1000; // 1 hora
  const tableName = 't_productos_sucursal';
  const lastSync = await getLastSync(tableName);

  if (Date.now() - lastSync < INTERVAL_MS) {
    console.log(
      `Sincronización de productos omitida, faltan ${Math.round(
        (INTERVAL_MS - (Date.now() - lastSync)) / 60000
      )} minutos`
    );
    return;
  }

  syncInProgress = true;
  try {
    console.log('Sincronizando productos…');
    // 1) Traer y normalizar remotos
    const { data: raw } = await api.get('/productos');
    if (!Array.isArray(raw)) {
      console.warn('Respuesta de /productos no es un array');
      return;
    }
    const productosRemotos = raw.map((p) => ({
      referencia:         parseInt(p.f_referencia, 10),
      descripcion:        trimString(p.f_descripcion),
      referenciaSuplidor: trimString(p.f_referencia_suplidor),
      precio5:            toFloat(p.f_precio5),
      existencia:         toFloat(p.f_existencia),
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
              record.f_existencia           = prod.existencia;
              record.f_descripcion          = prod.descripcion;
              record.f_precio5              = prod.precio5;
              record.f_referencia_suplidor  = prod.referenciaSuplidor;
            })
          );
        }
      } else {
        batchActions.push(
          col.prepareCreate((record) => {
            // El ID interno de WatermelonDB
            record._raw.id                = String(prod.referencia);
            record.f_referencia           = prod.referencia;
            record.f_descripcion          = prod.descripcion;
            record.f_referencia_suplidor  = prod.referenciaSuplidor;
            record.f_precio5              = prod.precio5;
            record.f_existencia           = prod.existencia;
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
    console.log('Sincronización de productos completada.');
  } catch (error) {
    console.error('Error en la sincronización de productos:', error);
  } finally {
    syncInProgress = false;
  }
};

export default sincronizarProductos;

import api from '../../api/axios';
import { database } from '../database/database';
import { Q } from '@nozbe/watermelondb';
import { syncHistory } from './syncHistory';

let syncInProgress = false;

/**
 * Devuelve la última fecha de sincronización registrada para la tabla indicada.
 * La usamos únicamente para espaciar las ejecuciones (INTERVALO), NO para filtrar la consulta al servidor.
 */
const getLastSync = async (tableName) => {
  try {
    const syncCollection = database.collections.get('t_sync');
    const registros = await syncCollection.query(Q.where('f_tabla', tableName)).fetch();
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

/**
 * Sincroniza **TODAS** las ofertas de productos desde la API `/oferta_productos`
 * hacia la tabla local `t_productos_ofertas` de WatermelonDB.
 * 
 * A diferencia de otros módulos (ej. bancos.js) esta función **no** pasa la marca
 * de tiempo de la última sincronización al servidor; siempre trae el dataset
 * completo y lo reconcilia localmente.
 */
const sincronizarProductosOfertas = async () => {
  if (syncInProgress) return;

  const nombreTabla = 't_productos_ofertas';

  //SELECT * FR
  const INTERVALO = 48 * 60 * 60 * 1000; // 48 h – evita ejecutar con demasiada frecuencia

  const lastSyncTimestamp = await getLastSync(nombreTabla);

  if (Date.now() - lastSyncTimestamp < INTERVALO) {
    console.log(
      `Sincronización de ofertas omitida, faltan ${Math.round(
        (INTERVALO - (Date.now() - lastSyncTimestamp)) / 1000 / 60
      )} minutos`
    );
    return;
  }

  syncInProgress = true;
  try {
    console.log('Sincronizando ofertas de productos…');

    // 1) Traer dataset completo del servidor
    const { data: raw } = await api.get('/oferta_productos');
    if (!Array.isArray(raw)) {
      console.warn('Respuesta inesperada al obtener ofertas:', raw);
      return;
    }

    // 2) Normalizar
    const remoteItems = raw.map((item) => ({
      referencia: toInt(item.f_referencia ?? item.F_REFERENCIA),
      referenciaOferta: toInt(item.f_referencia_oferta ?? item.F_REFERENCIA_OFERTA),
      cantidadReq: toInt(item.f_cantidad_req ?? item.F_CANTIDAD_REQ),
      cantidad: toInt(item.f_cantidad ?? item.F_CANTIDAD),
    }));

    console.log(`Se recibieron ${remoteItems.length} ofertas remotas.`);

    // 3) Leer registros locales
    const col = database.collections.get(nombreTabla);
    const locales = await col.query().fetch();
    const localMap = new Map(
      locales.map((r) => [`${r.f_referencia}_${r.f_referencia_oferta}_${r.f_cantidad_req}`, r])
    );

    // 4) Preparar batch
    const batchActions = [];
    for (const o of remoteItems) {
      const key = `${o.referencia}_${o.referenciaOferta}_${o.cantidadReq}`;
      const local = localMap.get(key);

      if (local) {
        const changed =
          local.f_cantidad !== o.cantidad ||
          local.f_cantidad_req !== o.cantidadReq;
        if (changed) {
          batchActions.push(
            local.prepareUpdate((record) => {
              record.f_cantidad = o.cantidad;
              record.f_cantidad_req = o.cantidadReq;
            })
          );
        }
      } else {
        batchActions.push(
          col.prepareCreate((record) => {
            record._raw.id = key; // ID único combinando referencia y referenciaOferta
            record.f_referencia = o.referencia;
            record.f_referencia_oferta = o.referenciaOferta;
            record.f_cantidad_req = o.cantidadReq;
            record.f_cantidad = o.cantidad;
          })
        );
      }
    }

    // 5) Ejecutar batch
    await database.write(async () => {
      if (batchActions.length > 0) {
        await database.batch(batchActions);
        console.log(`Batch ejecutado: ${batchActions.length} acciones.`);
      } else {
        console.log('No hay cambios de ofertas que aplicar.');
      }
    });

    // 6) Registrar historial
    await syncHistory(nombreTabla);
    console.log('Sincronización de ofertas de productos completada.');
  } catch (error) {
    console.error('Error sincronizando ofertas de productos:', error);
  } finally {
    syncInProgress = false;
  }
};

export default sincronizarProductosOfertas;

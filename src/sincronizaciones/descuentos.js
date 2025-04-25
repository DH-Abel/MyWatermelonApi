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

const normalizeNumber = (v) => {
  // parseFloat maneja sufijos (%) y deja solo la parte numérica
  const n = parseFloat(v);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
};

const sincronizarDescuentos = async () => {
  const nombreTabla = 't_desc_x_pago_cliente';
  const INTERVALO = 0 * 0 * 1 * 1000; // 8 horas en ms

  if (syncInProgress) return;
  const lastSync = await getLastSync(nombreTabla);
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
    console.log('Sincronizando descuentos…');

    // 1) Traer datos remotos
    const { data: raw } = await api.get('/descuentos');
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
      const f_cliente    = parseInt(item.f_cliente, 10);
      const f_dia_inicio = parseInt(item.f_dia_inicio, 10);
      const f_dia_fin    = parseInt(item.f_dia_fin, 10);
      const f_descuento1 = normalizeNumber(item.f_descuento1);
      const key = `${f_cliente}-${f_dia_inicio}-${f_dia_fin}`;
      const local = localMap.get(key);

      if (local) {
        if (local.f_descuento1 !== f_descuento1) {
          batchActions.push(
            local.prepareUpdate((r) => {
              r.f_descuento1 = f_descuento1;
            })
          );
        }
      } else {
        batchActions.push(
          col.prepareCreate((r) => {
            r.f_cliente    = f_cliente;
            r.f_dia_inicio = f_dia_inicio;
            r.f_dia_fin    = f_dia_fin;
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

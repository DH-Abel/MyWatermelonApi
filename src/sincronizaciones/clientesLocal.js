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
    console.log(`No se encontraron registros de sincronización para la tabla ${tableName}`);
  } catch (error) {
    console.error(
      `Error al obtener el historial de sincronización para ${tableName}:`,
      error
    );
  }
  return 0;
};

const trimString = (v) => (v == null ? '' : String(v).trim());
const toNumber = (v) => {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

const sincronizarClientes = async () => {
  if (syncInProgress) return;

  const INTERVALO = 0 * 0 * 1000; // 1 hora
  const tableName = 't_clientes';

  const lastSync = await getLastSync(tableName);
  if (Date.now() - lastSync < INTERVALO) {
    console.log(
      `Sincronización de clientes omitida, faltan ${Math.round(
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

    let lastSyncIso;
    if (lastSyncRaw) {
      const asNumber = Number(lastSyncRaw);
      const date = !isNaN(asNumber) ? new Date(asNumber) : new Date(lastSyncRaw);
      lastSyncIso = !isNaN(date.getTime()) ? date.toISOString() : new Date(0).toISOString();
    } else {
      lastSyncIso = new Date(0).toISOString();
    }

    console.log('Sincronizando clientes…');
    console.log('Llamando a /clientes con fecha:', lastSyncIso);

    const { data: raw } = await api.get(`/clientes/${encodeURIComponent(lastSyncIso)}`);
    if (!Array.isArray(raw)) {
      console.warn('Respuesta de /clientes no es un array');
      return;
    }

    const clientesRemotos = raw.map((cli) => ({
      f_id: parseInt(cli.f_id, 10),
      f_nombre: trimString(cli.f_nombre),
      f_d_municipio: trimString(cli.f_d_municipio),
      f_telefono: trimString(cli.f_telefono),
      f_telefono_pro: trimString(cli.f_telefono_pro),
      f_direccion: trimString(cli.f_direccion),
      f_cedula: trimString(cli.f_cedula),
      f_vendedor: toNumber(cli.f_vendedor),
      f_zona: toNumber(cli.f_zona),
      f_descuento_maximo: toNumber(cli.f_descuento_maximo),
      f_descuento1: toNumber(cli.f_descuento1),
      f_clasificacion: toNumber(cli.f_clasificacion),
      f_dias_aviso: toNumber(cli.f_dias_aviso),
      f_limite_credito: toNumber(cli.f_limite_credito),
      f_termino: toNumber(cli.f_termino),
      f_activo: cli.f_activo,
      f_bloqueo_credito: cli.f_bloqueo_credito,
      f_facturar_contra_entrega: cli.f_facturar_contra_entrega,
      f_bloqueo_ck: cli.f_bloqueo_ck,
    }));
    console.log(`Fetched ${clientesRemotos.length} clientes remotos.`);

    const col = database.collections.get(tableName);
    const locales = await col.query().fetch();
    const localMap = new Map(locales.map((r) => [r.f_id, r]));

    const batchActions = [];
    for (const cli of clientesRemotos) {
      const local = localMap.get(cli.f_id);
      if (local) {
        const dif =
          local.f_nombre !== cli.f_nombre ||
          local.f_d_municipio !== cli.f_d_municipio ||
          local.f_telefono !== cli.f_telefono ||
          local.f_telefono_pro !== cli.f_telefono_pro ||
          local.f_direccion !== cli.f_direccion ||
          local.f_cedula !== cli.f_cedula ||
          local.f_vendedor !== cli.f_vendedor ||
          local.f_zona !== cli.f_zona ||
          local.f_descuento_maximo !== cli.f_descuento_maximo ||
          local.f_descuento1 !== cli.f_descuento1 ||
          local.f_clasificacion !== cli.f_clasificacion ||
          local.f_dias_aviso !== cli.f_dias_aviso ||
          local.f_limite_credito !== cli.f_limite_credito ||
          local.f_termino !== cli.f_termino ||
          local.f_activo !== cli.f_activo ||
          local.f_bloqueo_credito !== cli.f_bloqueo_credito ||
          local.f_facturar_contra_entrega !== cli.f_facturar_contra_entrega ||
          local.f_bloqueo_ck !== cli.f_bloqueo_ck;

        if (dif) {
          batchActions.push(
            local.prepareUpdate((record) => {
              record.f_nombre = cli.f_nombre;
              record.f_d_municipio = cli.f_d_municipio;
              record.f_telefono = cli.f_telefono;
              record.f_telefono_pro = cli.f_telefono_pro;
              record.f_direccion = cli.f_direccion;
              record.f_cedula = cli.f_cedula;
              record.f_vendedor = cli.f_vendedor;
              record.f_zona = cli.f_zona;
              record.f_descuento_maximo = cli.f_descuento_maximo;
              record.f_descuento1 = cli.f_descuento1;
              record.f_clasificacion = cli.f_clasificacion;
              record.f_dias_aviso = cli.f_dias_aviso;
              record.f_limite_credito = cli.f_limite_credito;
              record.f_termino = cli.f_termino;
              record.f_activo = cli.f_activo;
              record.f_bloqueo_credito = cli.f_bloqueo_credito;
              record.f_facturar_contra_entrega = cli.f_facturar_contra_entrega;
              record.f_bloqueo_ck = cli.f_bloqueo_ck;
            })
          );
        }
      } else {
        batchActions.push(
          col.prepareCreate((record) => {
            record._raw.id = String(cli.f_id);
            record.f_id = cli.f_id;
            record.f_nombre = cli.f_nombre;
            record.f_d_municipio = cli.f_d_municipio;
            record.f_telefono = cli.f_telefono;
            record.f_telefono_pro = cli.f_telefono_pro;
            record.f_direccion = cli.f_direccion;
            record.f_cedula = cli.f_cedula;
            record.f_vendedor = cli.f_vendedor;
            record.f_zona = cli.f_zona;
            record.f_descuento_maximo = cli.f_descuento_maximo;
            record.f_descuento1 = cli.f_descuento1;
            record.f_clasificacion = cli.f_clasificacion;
            record.f_dias_aviso = cli.f_dias_aviso;
            record.f_limite_credito = cli.f_limite_credito;
            record.f_termino = cli.f_termino;
            record.f_activo = cli.f_activo;
            record.f_bloqueo_credito = cli.f_bloqueo_credito;
            record.f_facturar_contra_entrega = cli.f_facturar_contra_entrega;
            record.f_bloqueo_ck = cli.f_bloqueo_ck;
          })
        );
      }
    }

    await database.write(async () => {
      if (batchActions.length > 0) {
        await database.batch(batchActions);
        console.log(`Batch ejecutado: ${batchActions.length} acciones.`);
      } else {
        console.log('No hay cambios de clientes que aplicar.');
      }
    });

    await syncHistory(tableName);
    console.log('Sincronización de clientes completada.');
  } catch (error) {
    console.error('Error en la sincronización de clientes:', error);
  } finally {
    syncInProgress = false;
  }
};

export default sincronizarClientes;
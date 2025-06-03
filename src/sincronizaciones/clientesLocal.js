import api from '../../api/axios';
import { database } from '../database/database';
import { Q } from '@nozbe/watermelondb';
import sincronizarDescuentos from './descuentos';
import sincronizarBancos from './bancos';
import sincronizarProductosOfertas from './ofertasProductos';
import { syncHistory } from './syncHistory';

let syncInProgress = false;

const getLastSync = async (tableName) => {
  try {
    const syncCollection = database.collections.get('t_sync');
    const registros = await syncCollection.query(
      Q.where('f_tabla', tableName)
    ).fetch();
    if (registros.length > 0) {
      const raw = registros[0].f_fecha;
      // Si es string numérico, parsear; si no, convertir ISO a ms
      const ms = /^\d+$/.test(raw)
        ? parseInt(raw, 10)
        : (new Date(raw).getTime() || 0);
      console.log(
        `Fecha de la última sincronización ${tableName}:`,
        new Date(ms).toLocaleString()
      );
      return ms;
    }
    console.log(`No hay historial de sincronización para ${tableName}`);
  } catch (error) {
    console.error(`Error al obtener sincronización para ${tableName}:`, error);
  }
  return 0;
};

const normalizeText = (value) =>
  value == null ? '' : String(value).trim();

const normalizeNumberField = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(value);
  return isNaN(n) ? 0 : n;
};

const needsUpdate = (local, remote) => {
  return (
    normalizeText(local.f_nombre) !== remote.f_nombre ||
    normalizeText(local.f_d_municipio) !== remote.f_d_municipio ||
    normalizeText(local.f_telefono) !== remote.f_telefono ||
    normalizeText(local.f_telefono_pro) !== remote.f_telefono_pro ||
    normalizeText(local.f_direccion) !== remote.f_direccion ||
    normalizeText(local.f_cedula) !== remote.f_cedula ||
    local.f_vendedor !== remote.f_vendedor ||
    local.f_zona !== remote.f_zona ||
    local.f_descuento_maximo !== remote.f_descuento_maximo ||
    local.f_descuento1 !== remote.f_descuento1 ||
    local.f_clasificacion !== remote.f_clasificacion ||
    local.f_dias_aviso !== remote.f_dias_aviso ||
    local.f_limite_credito !== remote.f_limite_credito ||
    local.f_termino !== remote.f_termino ||
    local.f_activo !== remote.f_activo ||
    local.f_bloqueo_credito !== remote.f_bloqueo_credito ||
    local.f_facturar_contra_entrega !== remote.f_facturar_contra_entrega ||
    local.f_bloqueo_ck !== remote.f_bloqueo_ck
  );
};

const sincronizarClientes = async (vendedor) => {
  if (syncInProgress) return;

  const tableName = 't_clientes';
  const lastSyncTimestamp = await getLastSync(tableName);
  const INTERVALO = 0 * 0 * 0 * 1000;

  if (Date.now() - lastSyncTimestamp < INTERVALO) {
    console.log(
      `Sincronización de clientes omitida, faltan ${Math.round(
        (INTERVALO - (Date.now() - lastSyncTimestamp)) / 1000 / 60
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
    // 1) Fetch y normaliza
    const { data: raw } = await api.get(`/clientes/${vendedor}/${encodeURIComponent(lastSync)}`);
    const clientesRemotos = raw.map((cli) => ({
      f_id: parseInt(cli.f_id, 10),
      f_nombre: normalizeText(cli.f_nombre),
      f_d_municipio: normalizeText(cli.f_d_municipio),
      f_telefono: normalizeText(cli.f_telefono),
      f_telefono_pro: normalizeText(cli.f_telefono_pro),
      f_direccion: normalizeText(cli.f_direccion),
      f_cedula: normalizeText(cli.f_cedula),
      f_vendedor: normalizeNumberField(cli.f_vendedor),
      f_zona: normalizeNumberField(cli.f_zona),
      f_descuento_maximo: normalizeNumberField(cli.f_descuento_maximo),
      f_descuento1: normalizeNumberField(cli.f_descuento1),
      f_clasificacion: normalizeNumberField(cli.f_clasificacion),
      f_dias_aviso: normalizeNumberField(cli.f_dias_aviso),
      f_limite_credito: normalizeNumberField(cli.f_limite_credito),
      f_termino: normalizeNumberField(cli.f_termino),
      f_activo: cli.f_activo,
      f_bloqueo_credito: cli.f_bloqueo_credito,
      f_facturar_contra_entrega: cli.f_facturar_contra_entrega,
      f_bloqueo_ck: cli.f_bloqueo_ck,
    }));
    console.log(`Fetched ${clientesRemotos.length} clientes remotos.`);

    // 2) Carga locales y prepara mapas
    const clientesCollection = database.collections.get('t_clientes');
    const clientesLocales = await clientesCollection.query().fetch();
    const localMap = new Map(clientesLocales.map(r => [r.f_id, r]));
    const remoteIds = new Set(clientesRemotos.map(c => c.f_id));

    // 3) Preparar acciones
    const batchActions = [];

    for (const cli of clientesRemotos) {
      const local = localMap.get(cli.f_id);
      if (local) {
        if (needsUpdate(local, cli)) {
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
          clientesCollection.prepareCreate((record) => {
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

    for (const local of clientesLocales) {
      if (!remoteIds.has(local.f_id)) {
        batchActions.push(local.prepareDestroyPermanently());
      }
    }

    // 4) Ejecutar batch DENTRO de un writer, pasando el array completo
    await database.write(async () => {
      if (batchActions.length > 0) {
        await database.batch(batchActions);
        console.log(`Batch ejecutado: ${batchActions.length} acciones.`);
      } else {
        console.log('No hay cambios que aplicar.');
      }
    });

    // 5) Continuar con las demás sincronizaciones
    await sincronizarDescuentos(vendedor);
    await sincronizarBancos();
    await sincronizarProductosOfertas();
    await syncHistory(tableName);

    console.log('Sincronización de clientes completada.');
  } catch (error) {
    console.error('Error en la sincronización de clientes:', error);
  } finally {
    syncInProgress = false;
  }
};

export default sincronizarClientes;

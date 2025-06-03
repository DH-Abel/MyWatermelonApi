import api from '../../api/axios';
import { database } from '../database/database';
import { Q } from '@nozbe/watermelondb';
import { syncHistory } from './syncHistory';
import { InteractionManager } from 'react-native';



let syncInProgress = false;

const trimString = (v) => (v == null ? '' : String(v).trim());
const toInt = (v) => {
  const n = parseInt(v, 10);
  return isNaN(n) ? 0 : n;
};
const toFloat = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

const cargarCuentasCobrarLocales = async (vendedor) => {
  if (syncInProgress) return;
  syncInProgress = true;
  const tableName = 't_cuenta_cobrar';
  let batchActions = [];

  try {
    console.log('vendedor ', vendedor)
   
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

    const isFirstSync = !lastSyncRaw
      || lastSync === '1970-01-01T00:00:00.000Z';  // o tu placeholder inicial
    
    const endPoint = isFirstSync
      ? `/cuenta_cobrar/cxc/first_sync/${encodeURIComponent(vendedor)}`
      : `/cuenta_cobrar/cxc/${encodeURIComponent(vendedor)}/${encodeURIComponent(lastSync)}`;  // <-- backticks

    console.log('[SYNC] lastSyncRaw=', lastSyncRaw,
      'formatted=', lastSync,
      'isFirstSync=', isFirstSync,
      '→ calling', endPoint);

    const { data: raw } = await api.get(endPoint);

    const remote = Array.isArray(raw) ? raw : [raw];
    const cuentasRemotas = remote.map(item => ({
      documento: trimString(item.f_documento),
      idCliente: toInt(item.f_idcliente),
      tipoDoc: trimString(item.f_tipodoc),
      noDoc: toInt(item.f_nodoc),
      fecha: trimString(item.f_fecha),
      fechaVencimiento: trimString(item.f_fecha_vencimiento),
      monto: toFloat(item.f_monto),
      balance: toFloat(item.f_balance),
      impuesto: toFloat(item.f_impuesto),
      baseImponible: toFloat(item.f_base_imponible),
      descuento: toFloat(item.f_descuento),
    }));

    // 4) Leer sólo locales necesarios
    const col = database.collections.get(tableName);
    const uniqueDocIDs = Array.from(new Set(cuentasRemotas.map(c => c.documento)));
    const locales = uniqueDocIDs.length > 0
      ? await col.query(Q.where('f_documento', Q.oneOf(uniqueDocIDs))).fetch()
      : [];
    const localMap = new Map(locales.map(rec => [rec.f_documento, rec]));

    // 5) Preparar batch de acciones
    for (const c of cuentasRemotas) {
      const local = localMap.get(c.documento);
      if (local) {
        const changed =
          local.f_nodoc !== c.noDoc ||
          local.f_tipodoc !== c.tipoDoc ||
          local.f_fecha !== c.fecha ||
          local.f_fecha_vencimiento !== c.fechaVencimiento ||
          Math.abs(local.f_monto - c.monto) > 0.001 ||
          Math.abs(local.f_balance - c.balance) > 0.001 ||
          Math.abs(local.f_impuesto - c.impuesto) > 0.001 ||
          Math.abs(local.f_base_imponible - c.baseImponible) > 0.001 ||
          Math.abs(local.f_descuento - c.descuento) > 0.001;
        if (changed) {
          batchActions.push(
            local.prepareUpdate(rec => {
              rec.f_nodoc = c.noDoc;
              rec.f_tipodoc = c.tipoDoc;
              rec.f_fecha = c.fecha;
              rec.f_fecha_vencimiento = c.fechaVencimiento;
              rec.f_monto = c.monto;
              rec.f_balance = c.balance;
              rec.f_impuesto = c.impuesto;
              rec.f_base_imponible = c.baseImponible;
              rec.f_descuento = c.descuento;
            })
          );
        }
      } else {
        batchActions.push(
          col.prepareCreate(rec => {
            rec._raw.id = c.documento;
            rec.f_idcliente = c.idCliente;
            rec.f_documento = c.documento;
            rec.f_tipodoc = c.tipoDoc;
            rec.f_nodoc = c.noDoc;
            rec.f_fecha = c.fecha;
            rec.f_fecha_vencimiento = c.fechaVencimiento;
            rec.f_monto = c.monto;
            rec.f_balance = c.balance;
            rec.f_impuesto = c.impuesto;
            rec.f_base_imponible = c.baseImponible;
            rec.f_descuento = c.descuento;
          })
        );
      }
    }
  } catch (error) {
    console.error('Error preparando sincronización:', error);
    syncInProgress = false;
    return;
  }

  // 6) Ejecutar batch después de interacciones para no bloquear UI
  try {
    // Espera a que el hilo de UI esté libre
    await new Promise(resolve =>
      InteractionManager.runAfterInteractions(resolve)
    );

    // Aplica el batch en la base de datos
    await database.write(async () => {
      if (batchActions.length > 0) {
        const chunkSize = 500;
        for (let i = 0; i < batchActions.length; i += chunkSize) {
          const slice = batchActions.slice(i, i + chunkSize);
          await database.batch(slice);
        }
      }
    });

    // Actualiza el historial
    await syncHistory(tableName);
  } catch (error) {
    console.error('Error en sincronización completa:', error);
  } finally {
    syncInProgress = false;
  }
};

export default cargarCuentasCobrarLocales;
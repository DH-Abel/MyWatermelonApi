import api from '../../api/axios';
import { database } from '../database/database';
import { Q } from '@nozbe/watermelondb';
import { syncHistory } from './syncHistory';

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

const cargarCuentasCobrarLocales = async (idCliente) => {
  if (syncInProgress) return;
  syncInProgress = true;
  const tableName = 't_cuenta_cobrar';

  try {
    // 1) Fetch y normalizar remotos
    const { data: raw } = await api.get(`/cuenta_cobrar/cxc/${idCliente}`);
    let remote = Array.isArray(raw) ? raw : [raw];
    const cuentasRemotas = remote.map(item => ({
      documento:          trimString(item.f_documento),
      idCliente:          toInt(item.f_idcliente),
      tipoDoc:            trimString(item.f_tipodoc),
      noDoc:              toInt(item.f_nodoc),
      fecha:              trimString(item.f_fecha),
      fechaVencimiento:   trimString(item.f_fecha_vencimiento),
      monto:              toFloat(item.f_monto),
      balance:            toFloat(item.f_balance),
      impuesto:           toFloat(item.f_impuesto),
      baseImponible:      toFloat(item.f_base_imponible),
      descuento:          toFloat(item.f_descuento),
    }));

    // 2) Leer locales del mismo cliente
    const col = database.collections.get(tableName);
    const locales = await col
      .query(Q.where('f_idcliente', idCliente))
      .fetch();
    const localMap = new Map(
      locales.map(rec => [rec.f_documento, rec])
    );

    // 3) Preparar batch de acciones
    const batchActions = [];
    for (const c of cuentasRemotas) {
      const local = localMap.get(c.documento);
      if (local) {
        // Sólo actualizar si cambió algún campo
        const changed =
          local.f_nodoc             !== c.noDoc ||
          local.f_tipodoc           !== c.tipoDoc ||
          local.f_fecha             !== c.fecha ||
          local.f_fecha_vencimiento !== c.fechaVencimiento ||
          Math.abs(local.f_monto - c.monto) > 0.001 ||
          Math.abs(local.f_balance - c.balance) > 0.001 ||
          Math.abs(local.f_impuesto - c.impuesto) > 0.001 ||
          Math.abs(local.f_base_imponible - c.baseImponible) > 0.001 ||
          Math.abs(local.f_descuento - c.descuento) > 0.001;

        if (changed) {
          batchActions.push(
            local.prepareUpdate(record => {
              record.f_nodoc             = c.noDoc;
              record.f_tipodoc           = c.tipoDoc;
              record.f_fecha             = c.fecha;
              record.f_fecha_vencimiento = c.fechaVencimiento;
              record.f_monto             = c.monto;
              record.f_balance           = c.balance;
              record.f_impuesto          = c.impuesto;
              record.f_base_imponible    = c.baseImponible;
              record.f_descuento         = c.descuento;
            })
          );
        }
      } else {
        batchActions.push(
          col.prepareCreate(record => {
            // Usar el documento como ID en WatermelonDB
            record._raw.id              = c.documento;
            record.f_idcliente          = c.idCliente;
            record.f_documento          = c.documento;
            record.f_tipodoc            = c.tipoDoc;
            record.f_nodoc              = c.noDoc;
            record.f_fecha              = c.fecha;
            record.f_fecha_vencimiento  = c.fechaVencimiento;
            record.f_monto              = c.monto;
            record.f_balance            = c.balance;
            record.f_impuesto           = c.impuesto;
            record.f_base_imponible     = c.baseImponible;
            record.f_descuento          = c.descuento;
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
        console.log('No hay cambios en cuentas por cobrar.');
      }
    });

    // 5) Registrar historial de sincronización
    await syncHistory(tableName);
    console.log('Sincronización de cuentas por cobrar completada.');
  } catch (error) {
    console.error('Error sincronizando cuentas por cobrar:', error);
  } finally {
    syncInProgress = false;
  }
};

export default cargarCuentasCobrarLocales;

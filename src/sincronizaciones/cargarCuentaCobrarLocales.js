import api from '../../api/axios';
import { database } from '../database/database';
import { Q } from '@nozbe/watermelondb';
import { syncHistory } from './syncHistory';

let syncInProgress = false;

const getLastSync = async (table) => {
  try {
    const syncCollection = database.collections.get('t_sync');
    const registros = await syncCollection.query(Q.where('f_tabla', table)).fetch();
    if (registros.length > 0) {
      return parseInt(registros[0].f_fecha, 10);
    }
  } catch (error) {
    console.error(`Error obteniendo última sincronización para ${table}:`, error);
  }
  return 0;
};

const cargarCuentasCobrarLocales = async (idCliente) => {
  if (syncInProgress) return;
  const tableName = 't_cuenta_cobrar';
  syncInProgress = true;
  try {
    const response = await api.get(`/cuenta_cobrar/cxc/${idCliente}`);
    let cuentas = response.data;
    if (!Array.isArray(cuentas)) cuentas = [cuentas];

    await database.write(async () => {
      const cuentaCollection = database.collections.get(tableName);
      for (const item of cuentas) {
        // Convertir campos numéricos
        const f_nodoc = item.f_nodoc != null ? parseInt(item.f_nodoc) : 0;
        const f_monto = item.f_monto != null ? parseFloat(item.f_monto) : 0;
        const f_balance = item.f_balance != null ? parseFloat(item.f_balance) : 0;

        const existentes = await cuentaCollection.query(
          Q.where('f_documento', item.f_documento)
        ).fetch();

        if (existentes.length > 0) {
          await existentes[0].update(record => {
            record.f_idcliente = parseInt(item.f_idcliente, 10);
            record.f_tipodoc = (item.f_tipodoc);
            record.f_nodoc = f_nodoc;
            record.f_fecha = item.f_fecha;
            record.f_fecha_vencimiento = item.f_fecha_vencimiento;
            record.f_monto = f_monto;
            record.f_balance = f_balance;
          });
        } else {
          await cuentaCollection.create(record => {
            record.f_idcliente = parseInt(item.f_idcliente, 10);
            record.f_documento = item.f_documento;
            record.f_tipodoc = item.f_tipodoc;
            record.f_nodoc = f_nodoc;
            record.f_fecha = item.f_fecha;
            record.f_fecha_vencimiento = item.f_fecha_vencimiento;
            record.f_monto = f_monto;
            record.f_balance = f_balance;
          });
        }
      }
    });
    await syncHistory(tableName);
  } catch (error) {
    console.error('Error sincronizando cuentas por cobrar:', error);
  } finally {
    syncInProgress = false;
  }
};

export default cargarCuentasCobrarLocales;

import api from '../../api/axios';
import { database } from '../database/database';
import { Q } from '@nozbe/watermelondb';
import { syncHistory } from './syncHistory';

let syncInProgress = false;

const getLastSync = async (nombreTabla) => {
  try {
    const syncCollection = database.collections.get('t_sync');
    const registros = await syncCollection.query(
      Q.where('f_tabla', nombreTabla)
    ).fetch();
    if (registros.length > 0) {
      return parseInt(registros[0].f_fecha, 10);
    }
  } catch (error) {
    console.error(`Error obteniendo última sincronización para ${nombreTabla}:`, error);
  }
  return 0;
};

/**
 * Sincroniza tabla t_desc_x_pago_cliente con la API
 */
const sincronizarDescuentos = async () => {
  console.log('Sincronizando descuentos...');
  console.log(Object.keys(database.collections.map));
  if (syncInProgress) return;
  const nombreTabla = 't_desc_x_pago_cliente';
  const intervalo = 8; // 24 horas en ms
  const lastSync = await getLastSync(nombreTabla);
  
  if (Date.now() - lastSync < intervalo) {
    console.log(`Sincronización de descuentos omitida, faltan ${{
      ms: intervalo - (Date.now() - lastSync)
    }} ms`);
    return;
  }
  
  syncInProgress = true;
  try {
    const response = await api.get('/descuentos');
    const remote = response.data;
    
    if (!Array.isArray(remote)) return;
    
    await database.write(async () => {
      const descCollection = database.collections.get(nombreTabla);
      
      for (const item of remote) {
        const f_cliente = parseInt(item.f_cliente, 10);
        const f_dia_inicio = parseInt(item.f_dia_inicio, 10);
        const f_dia_fin = parseInt(item.f_dia_fin, 10);
        const f_descuento1 = parseFloat(item.f_descuento1) || 0;
        
        const existentes = await descCollection.query(
          Q.where('f_cliente', f_cliente),
          Q.where('f_dia_inicio', f_dia_inicio),
          Q.where('f_dia_fin', f_dia_fin)
        ).fetch();

        if (existentes.length > 0) {
          await existentes[0].update(record => {
            record.f_descuento1 = f_descuento1;
          });
        } else {
          await descCollection.create(record => {
            record.f_cliente = f_cliente;
            record.f_dia_inicio = f_dia_inicio;
            record.f_dia_fin = f_dia_fin;
            record.f_descuento1 = f_descuento1;
          });
        }
      }
    });

    await syncHistory(nombreTabla);
    console.log('Sincronización de descuentos completada');
  } catch (error) {
    console.error('Error sincronizando descuentos:', error);
  } finally {
    syncInProgress = false;
  }
};

export default sincronizarDescuentos;

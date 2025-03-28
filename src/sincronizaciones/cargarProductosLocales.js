import api from '../../api/axios';
import { database } from '../database/database';
import { Q } from '@nozbe/watermelondb';
import { syncHistory } from './syncHistory';

let syncInProgress = false;

const getLastSync = async (nombreTabla) => {
  try {
    const syncCollection = database.collections.get('t_sync');
    const registros = await syncCollection.query(Q.where('f_tabla', nombreTabla)).fetch();
    if (registros.length > 0) {
      // Convierte el string a número y crea un objeto Date para mostrarlo o usarlo en comparaciones
      const timestamp = parseInt(registros[0].f_fecha, 10);
      console.log("Fecha de la última sincronización: " + new Date(timestamp).toLocaleString());
      return timestamp;
    }
    console.log('No se encontraron registros de sincronización para la tabla ' + nombreTabla);
  } catch (error) {
    console.error('Error al obtener el historial de sincronización:', error);
  }
  return 0;
};



const sincronizarProductos = async () => {
  if (syncInProgress) return; // Evitar operaciones concurrentes
  const intervalMS = 3600000
  const lastSync = await getLastSync('t_productos_sucursal');

  if (Date.now() - lastSync < intervalMS) {
  console.log('Se realizo hace menos de 1 hora, no se sincroniza, faltan ' + ((intervalMS - (Date.now() - lastSync)) / 60000) + ' minutos');
  return
  }
  syncInProgress = true;
  try {
    // Obtén los productos desde la API
    const response = await api.get('/productos');
    const productosRemotos = response.data;

    await database.write(async () => {
      const productosCollection = database.collections.get('t_productos_sucursal');

      for (let prod of productosRemotos) {
        // Formatea para quitar espacios al principio y al final
        prod.f_descripcion = prod.f_descripcion ? prod.f_descripcion.trim() : prod.f_descripcion;
        prod.f_referencia_suplidor = prod.f_referencia_suplidor ? prod.f_referencia_suplidor.trim() : prod.f_referencia_suplidor;

        // Busca el producto local por su referencia (clave única)
        const productosLocales = await productosCollection.query(
          Q.where('f_referencia', parseInt(prod.f_referencia, 10))
        ).fetch();

        if (productosLocales.length > 0) {
          // Producto ya existe, actualizar si alguno de los campos difiere
          const roundToTwo = (num) => Math.round(num * 100) / 100;

          const productoLocal = productosLocales[0];
          const existenciaRemota = roundToTwo(parseFloat(prod.f_existencia));
          const existenciaLocal = roundToTwo(productoLocal.f_existencia);
          const precioRemoto = roundToTwo(parseFloat(prod.f_precio5));
          const referenciaRemota = parseInt(prod.f_referencia, 10);

          let updateNeeded = false;
          let differences = [];
          if (Math.abs(existenciaLocal - existenciaRemota) > 0.001) {
            updateNeeded = true;
            differences.push(`existencia: local (${existenciaLocal}) vs remoto (${existenciaRemota})`);
          }
          if (productoLocal.f_descripcion !== prod.f_descripcion) {
            updateNeeded = true;
            differences.push(`descripción: local (${productoLocal.f_descripcion}) vs remoto (${prod.f_descripcion})`);
          }
          if (Math.abs(productoLocal.f_precio5 - precioRemoto) > 0.001) {
            updateNeeded = true;
            differences.push(`precio5: local (${productoLocal.f_precio5}) vs remoto (${precioRemoto})`);
          }
          if (productoLocal.f_referencia !== referenciaRemota) {
            updateNeeded = true;
            differences.push(`referencia: local (${productoLocal.f_referencia}) vs remoto (${referenciaRemota})`);
          }
          if (productoLocal.f_referencia_suplidor !== prod.f_referencia_suplidor) {
            updateNeeded = true;
            differences.push(`referencia_suplidor: local (${productoLocal.f_referencia_suplidor}) vs remoto (${prod.f_referencia_suplidor})`);
          }

          if (updateNeeded) {
            await productoLocal.update(record => {
              record.f_existencia = existenciaRemota;
              record.f_descripcion = prod.f_descripcion;
              record.f_precio5 = precioRemoto;
              record.f_referencia = referenciaRemota;
              record.f_referencia_suplidor = prod.f_referencia_suplidor;
            });
            console.log(`Producto ${productoLocal.f_referencia} actualizado. Cambios: ${differences.join(', ')}`);
          }
        } else {
          // Si el producto no existe, créalo con todos los campos
          await productosCollection.create(record => {
            record.f_referencia = parseInt(prod.f_referencia, 10);
            record.f_referencia_suplidor = prod.f_referencia_suplidor;
            record.f_descripcion = prod.f_descripcion;
            record.f_precio5 = parseFloat(prod.f_precio5);
            record.f_existencia = parseFloat(prod.f_existencia);
          });
          console.log(`Producto ${prod.f_referencia} insertado.`);
        }
      }
    });
    await syncHistory('t_productos_sucursal');

  } catch (error) {
    console.error('Error en la sincronización de productos:', error);
  } 
  finally {
  console.log('Sincronización de productos completada. 2' + lastSync);
    syncInProgress = false;
  }
};

export default sincronizarProductos;

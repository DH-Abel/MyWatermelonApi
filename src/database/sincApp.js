import { database } from './database';
import { Producto } from './models';
import api from '../../api/axios';

const sincronizarProductos = async () => {
  try {
    // Obtén los productos desde la API
    const response = await api.get('/productos');
    const productosRemotos = response.data;

    // Ejecuta la acción en WatermelonDB
    await database.action(async () => {
      const productosCollection = database.collections.get('t_productos_sucursal');
      for (let prod of productosRemotos) {
        // Aquí podrías buscar si ya existe el producto para actualizarlo
        // o simplemente crearlo. Por simplicidad se muestra cómo crear uno nuevo.
        await productosCollection.create(record => {
          // Asigna los campos según tu esquema y modelo
          record.f_referencia = prod.f_referencia;  // ✅ Debería ser este campo
          record.f_referencia_suplidor = prod.f_referencia_suplidor;
          record.f_descripcion = prod.f_descripcion;
          record.f_precio5 = prod.f_precio5;
        });
      }
    });
  } catch (error) {
    console.error('Error en la sincronización de productos:', error);
  }
};

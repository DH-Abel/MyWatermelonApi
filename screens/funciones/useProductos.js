// hooks/useProductos.js
import { useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import sincronizarProductos from '../../src/sincronizaciones/cargarProductosLocales'; // ajusta la ruta
import { Q } from '@nozbe/watermelondb';
 
export function useProductos(clienteSeleccionado) {
  const database = useDatabase();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Carga solo los productos locales
  const cargarLocales = useCallback(async () => {
    try {
      const lista = await database.collections.get('t_productos_sucursal')
        .query()
        .fetch();
      setProductos(lista);
    } catch (err) {
      console.error('error al cargar productos locales:', err);
    }
  }, [database]);

  // Hook principal que hace “cargarLocales” + sincronización remota
  const cargarTodos = useCallback(async () => {
    setLoading(true);
    try {
      await cargarLocales();
      const netState = await NetInfo.fetch();
      if (netState.isConnected) {
        await sincronizarProductos();
        await cargarLocales();
      }
    } catch (error) {
      console.error('Error sincronizando productos:', error);
    } finally {
      setLoading(false);
    }
  }, [cargarLocales]);

  // Cuando cambie el cliente, recargo
  useEffect(() => {
    if (clienteSeleccionado && clienteSeleccionado.f_id) {
      cargarTodos();
    } else {
      setProductos([]);
      setLoading(false);
    }
  }, [clienteSeleccionado, cargarTodos]);

  return { productos, loading };
}

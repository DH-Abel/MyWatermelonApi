import NetInfo from '@react-native-community/netinfo';

useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(state => {
    if (state.isConnected) {
      // Hay conexión: sincroniza con la API
      sincronizarProductos();
    } else {
      // Sin conexión: carga productos de la base local
      cargarProductosLocales();
    }
  });
  return () => unsubscribe();
}, []);

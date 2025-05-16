// MapsContext.js
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { InteractionManager } from 'react-native';
import { database } from '../../src/database/database';
import NetInfo from '@react-native-community/netinfo';
import sincronizarClientes from '../../src/sincronizaciones/clientesLocal';

export const MapsContext = createContext({
  productos: {},
  clientes: {},
  syncClients: async () => {},
});

export function MapsProvider({ children }) {
  const [productos, setProductos] = useState({});
  const [clientes, setClientes]   = useState({});

    // Función para recargar el mapa de clientes desde la BD local
  const reloadClientes = useCallback(async () => {
    const cliCol = database.collections.get('t_clientes');
    const allC = await cliCol.query().fetch();
    setClientes(allC.reduce((m, c) => { m[c.f_id] = c._raw; return m; }, {}));
  }, []);

  // Función que sincroniza con el servidor y luego recarga el mapa
  const syncClients = useCallback(async () => {
    console.log('[MapsContext] syncClients ▶️ start');
    const netState = await NetInfo.fetch();
    if (netState.isConnected) {
        console.log('[MapsContext] netState.isConnected =', netState.isConnected);
      await sincronizarClientes();
      await reloadClientes();
    }
  }, [reloadClientes]);


  useEffect(() => {
    InteractionManager.runAfterInteractions(async () => {
      const prodCol = database.collections.get('t_productos_sucursal');
      const allP = await prodCol.query().fetch();
      setProductos(allP.reduce((m,p) => { m[p.f_referencia]=p._raw; return m; }, {}));

      const cliCol = database.collections.get('t_clientes');
      const allC = await cliCol.query().fetch();
      setClientes(allC.reduce((m,c) => { m[c.f_id]=c._raw; return m; }, {}));
    });
  }, []);

  return (
   <MapsContext.Provider value={{ productos, clientes, syncClients }}>
      {children}
    </MapsContext.Provider>
  );
}

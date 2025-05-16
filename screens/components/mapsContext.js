// MapsContext.js
import React, { createContext, useState, useEffect } from 'react';
import { InteractionManager } from 'react-native';
import { database } from '../../src/database/database';

export const MapsContext = createContext({ productos: {}, clientes: {} });

export function MapsProvider({ children }) {
  const [productos, setProductos] = useState({});
  const [clientes, setClientes]   = useState({});

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
    <MapsContext.Provider value={{ productos, clientes }}>
      {children}
    </MapsContext.Provider>
  );
}

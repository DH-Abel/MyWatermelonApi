// MainTabsDejarFactura.js
import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useRoute } from '@react-navigation/native';

// Importa los componentes renombrados para “Dejar Factura”
import SelectedClienteDejarFactura from '../components/selectedClienteDejarFactura';
import DejarFactura from '../DejarFactura';

const Tab = createBottomTabNavigator();

const MainTabsDejarFactura = () => {
  // Se espera que la pantalla que invoque MainTabsDejarFactura le pase
  // el objeto clienteSeleccionado en route.params, igual que en Cobranza
  const route = useRoute();
  const initialCliente = route.params?.clienteSeleccionado || {};
  const [clienteSeleccionado, setClienteSeleccionado] = useState(initialCliente);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      {/* Pestaña “Cliente” */}
      <Tab.Screen
        name="Cliente"
        children={() => (
          <SelectedClienteDejarFactura
            clienteSeleccionado={clienteSeleccionado}
            setClienteSeleccionado={setClienteSeleccionado}
          />
        )}
        options={{ title: 'Cliente' }}
      />

      {/* Pestaña “DejarFactura” */}
      <Tab.Screen
        name="DejarFactura"
        children={() => (
          <DejarFactura clienteSeleccionado={clienteSeleccionado} />
        )}
        options={{ title: 'Dejar Factura' }}
      />
    </Tab.Navigator>
  );
};

export default MainTabsDejarFactura;

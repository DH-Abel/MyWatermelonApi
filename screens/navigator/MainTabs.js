// MainTabs.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import SelectedCliente from '../components/selectedCliente';
import Pedido from '../pedido';
import { useRoute } from '@react-navigation/native';


const Tab = createBottomTabNavigator();

const MainTabs = () => {
  const route = useRoute();

  const {
    clienteSeleccionado = {},
    balanceCliente = 0,
    descuentoGlobal = 0,
    descuentoCredito = 0,
    condicionSeleccionada = null,
    creditoDisponible = 0
  } = route.params || {};

  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Cliente"
        children={() => <SelectedCliente 
          clienteSeleccionado={clienteSeleccionado}
          balanceCliente={balanceCliente}
          descuentoGlobal={descuentoGlobal}
          descuentoCredito={descuentoCredito}
          condicionSeleccionada={condicionSeleccionada}
          creditoDisponible={creditoDisponible}
          />}
        options={{ title: 'Cliente' }}
      />
      <Tab.Screen
        name="Productos"
        children={() => <Pedido clienteSeleccionado={clienteSeleccionado} />}
        options={{ title: 'Productos' }}
      />
    </Tab.Navigator>
  );
};

export default MainTabs;

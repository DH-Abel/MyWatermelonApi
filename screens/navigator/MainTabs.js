// MainTabs.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import SelectedCliente from '../components/selectedCliente';
import Pedido from '../pedido';
import { useRoute } from '@react-navigation/native';


const Tab = createBottomTabNavigator();

const MainTabs = () => {
  const route = useRoute();
  const { clienteSeleccionado } = route.params;

  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Cliente"
        children={() => <SelectedCliente clienteSeleccionado={clienteSeleccionado} />}
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

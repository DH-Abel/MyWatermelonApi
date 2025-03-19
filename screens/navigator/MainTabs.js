import React, { useState,useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import SelectedCliente from '../components/selectedCliente';
import Pedido from '../pedido';
import { useRoute } from '@react-navigation/native';
import api from '../../api/axios';

const Tab = createBottomTabNavigator();

const MainTabs = () => {

  
  const route = useRoute();
  const {
    clienteSeleccionado = {},
    balanceCliente = 0,
    descuentoGlobal = 0,
    descuentoCredito = 0,
    condicionSeleccionada = null,
  } = route.params || {};

  

  // Levantamos el estado de crédito disponible en el padre
  const [creditoDisponible, setCreditoDisponible] = useState(
    clienteSeleccionado.f_limite_credito ? clienteSeleccionado.f_limite_credito - balanceCliente : 0
  );

  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Cliente"
        children={() => (
          <SelectedCliente 
            clienteSeleccionado={clienteSeleccionado}
            balanceCliente={balanceCliente}
            descuentoGlobal={descuentoGlobal}
            descuentoCredito={descuentoCredito}
            condicionSeleccionada={condicionSeleccionada}
            creditoDisponible={creditoDisponible}
            setCreditoDisponible={setCreditoDisponible}
          />
        )}
        options={{ title: 'Cliente' }}
      />
      <Tab.Screen
        name="Productos"
        children={() => (
          <Pedido 
            clienteSeleccionado={clienteSeleccionado} 
            creditoDisponible={creditoDisponible}
            setCreditoDisponible={setCreditoDisponible}
          />
        )}
        options={{ title: 'Productos' }}
      />
    </Tab.Navigator>
  );
};

export default MainTabs;

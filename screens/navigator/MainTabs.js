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
    condicionSeleccionada = null,
  } = route.params || {};

  const [creditoDisponible, setCreditoDisponible] = useState(
    clienteSeleccionado.f_limite_credito ? clienteSeleccionado.f_limite_credito - balanceCliente : 0
  );
  // Inicializa el descuento como string para que el TextInput lo maneje bien
  const [descuentoCredito, setDescuentoCredito] = useState("10");


  const descuento = () => {
    if (clienteSeleccionado && condicionSeleccionada) {
      if (condicionSeleccionada.id === 0 || condicionSeleccionada.id === 2) {
        return clienteSeleccionado.f_descuento_maximo
      } else {
        return clienteSeleccionado.f_descuento1;
      }
    }
    return 0; // En caso de que clienteSeleccionado o condicionSeleccionada sean null
  };

  const descuentoGlobal = descuento();

  

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
            setDescuentoCredito={setDescuentoCredito}
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
            descuentoCredito={descuentoCredito}
            setDescuentoCredito={setDescuentoCredito}
          />
        )}
        options={{ title: 'Productos' }}
      />
    </Tab.Navigator>
  );
};

export default MainTabs;

import React, { useState, useEffect, useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import SelectedClienteCobranza from '../components/selectedClienteCobranza';
import SelectClientesCobranza from '../components/selectClientesCobranza';
import Cobranza from '../cobranza';
import { useRoute, useNavigation } from '@react-navigation/native';



const Tab = createBottomTabNavigator();

const MainTabsCobranza = () => {
  const route = useRoute();
  const initialCliente = route.params?.clienteSeleccionado || {};
  const [clienteSeleccionado, setClienteSeleccionado] = useState(initialCliente);
  const [balanceCliente, setBalanceCliente] = useState(route.params?.balanceCliente || 0);

  const [nota, setNota] = useState("");


  const [creditoDisponible, setCreditoDisponible] = useState(
    clienteSeleccionado.f_limite_credito - balanceCliente
  );

  useEffect(() => {
    setCreditoDisponible(
      clienteSeleccionado.f_limite_credito - balanceCliente
    );
  }, [clienteSeleccionado, balanceCliente]);

  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }}>
      <Tab.Screen
        name="Cliente"
        children={() => (
          <SelectedClienteCobranza
            clienteSeleccionado={clienteSeleccionado}
            setClienteSeleccionado={setClienteSeleccionado}
            balanceCliente={balanceCliente}
            setBalanceCliente={setBalanceCliente}
            nota={nota}
            setNota={setNota}
            creditoDisponible={creditoDisponible}
            setCreditoDisponible={setCreditoDisponible}
          />
        )}
        options={{ title: 'Cliente' }}
      />
      <Tab.Screen
        name="Cobranza"
        children={() => (
          <Cobranza clienteSeleccionado={clienteSeleccionado} />
        )}
        options={{ title: 'Cobranza' }}
      />
    </Tab.Navigator>
  );
};

export default MainTabsCobranza;


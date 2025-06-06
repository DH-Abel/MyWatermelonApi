import React, { useState, useEffect, useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useRoute, useNavigation } from '@react-navigation/native';

import { Q } from '@nozbe/watermelondb';
import { database } from '../../src/database/database';
import SelectedClienteCobranza from '../components/selectedClienteCobranza';
import Cobranza from '../cobranza';



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
    if (!clienteSeleccionado?.f_id) {
      setBalanceCliente(0);
      return;
    }
    // 1) Carga todas las cuentas de cobrar para el cliente en WatermelonDB
    const loadBalanceLocal = async () => {
      try {
        const rows = await database
          .collections
          .get('t_cuenta_cobrar')
          .query(
            Q.where('f_idcliente', clienteSeleccionado.f_id)
          )
          .fetch();

        // 2) Filtrar sólo las filas con balance > 0 (activas)
        const activas = rows.filter(row => parseFloat(row.f_balance) > 0);

        // 3) Sumar el campo f_balance de cada una
        const total = activas.reduce(
          (acc, row) => acc + parseFloat(row.f_balance),
          0
        );

        setBalanceCliente(total);
      } catch (err) {
        console.error('Error calculando balance local:', err);
        setBalanceCliente(0);
      }
    };

    loadBalanceLocal();
  }, [clienteSeleccionado]);

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


import React, { useState, useEffect, useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import SelectedClienteCobranza from '../components/selectedClienteCobranza';
import SelectClientesCobranza from '../components/selectClientesCobranza';
import Cobranza from '../cobranza';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';


const Tab = createBottomTabNavigator();

const MainTabsCobranza = () => {
  const route = useRoute();
  const initialCliente = route.params?.clienteSeleccionado || {};
  const [clienteSeleccionado, setClienteSeleccionado] = useState(initialCliente);
  const [balanceCliente, setBalanceCliente] = useState(route.params?.balanceCliente || 0);

  const [modalVisibleCondicion, setModalVisibleCondicion] = useState(false);
  const [descuentoCredito, setDescuentoCredito] = useState("10");
  const [nota, setNota] = useState("");
  const [condicionSeleccionada, setCondicionSeleccionada] = useState(null);

  const condicionPedido = [
    { id: 0, nombre: 'Contado' },
    { id: 1, nombre: 'Crédito' },
    { id: 2, nombre: 'Contra entrega' },
    { id: 3, nombre: 'Vuelta viaje' },
  ];

  useEffect(() => {
    if (clienteSeleccionado.f_termino != null) {
      const found = condicionPedido.find(
        item => item.id === Number(clienteSeleccionado.f_termino)
      );
      if (found) setCondicionSeleccionada(found);
    }
  }, [clienteSeleccionado]);

  const [creditoDisponible, setCreditoDisponible] = useState(
    clienteSeleccionado.f_limite_credito - balanceCliente
  );

  useEffect(() => {
    setCreditoDisponible(
      clienteSeleccionado.f_limite_credito - balanceCliente
    );
  }, [clienteSeleccionado, balanceCliente]);

  const descuentoGlobal = useMemo(() => {
    if (!condicionSeleccionada) return 0;
    const descMax = Number(clienteSeleccionado.f_descuento_maximo);
    const desc1 = Number(clienteSeleccionado.f_descuento1);
    return condicionSeleccionada.id === 0 || condicionSeleccionada.id === 2
      ? descMax
      : desc1;
  }, [clienteSeleccionado, condicionSeleccionada]);

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
            descuentoGlobal={descuentoGlobal}
            descuentoCredito={descuentoCredito}
            setDescuentoCredito={setDescuentoCredito}
            condicionSeleccionada={condicionSeleccionada}
            condicionPedido={condicionPedido}
            condicionPedidoElegida={setCondicionSeleccionada}
            modalVisibleCondicion={modalVisibleCondicion}
            setModalVisibleCondicion={setModalVisibleCondicion}
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


import React, { useState, useEffect, useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import SelectedClienteCobranza from '../../screens/components/selectedClienteCobranza';
import Cobranza from '../../screens/cobranza';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Tab = createBottomTabNavigator();

const MainTabsCobranza = () => {
  const [modalVisibleCondicion, setModalVisibleCondicion] = useState(false);
  const [descuentoCredito, setDescuentoCredito] = useState("10");
  const [nota, setNota] = useState("");

  const route = useRoute();
  const navigation = useNavigation();

  const { clienteSeleccionado = {}, balanceCliente = 0 } = route.params || {};

  const condicionPedido = [
    { id: 0, nombre: 'Contado' },
    { id: 1, nombre: 'Crédito' },
    { id: 2, nombre: 'Contra entrega' },
    { id: 3, nombre: 'Vuelta viaje' },
  ];

  const [condicionSeleccionada, setCondicionSeleccionada] = useState(() => {
    if (clienteSeleccionado && clienteSeleccionado.f_termino != null) {
      return condicionPedido.find(item => item.id === Number(clienteSeleccionado.f_termino)) || null;
    }
    return null;
  });

  const [creditoDisponible, setCreditoDisponible] = useState(
    clienteSeleccionado.f_limite_credito ? clienteSeleccionado.f_limite_credito - balanceCliente : 0
  );

  const condicionPedidoElegida = (option) => {
    if ((option.id === 3 || option.id === 1) && clienteSeleccionado.f_bloqueo_credito) {
      Alert.alert('El cliente tiene bloqueo de crédito');
      return;
    }
    setCondicionSeleccionada(option);
    setModalVisibleCondicion(false);
  };

  const descuentoGlobal = useMemo(() => {
    if (clienteSeleccionado && condicionSeleccionada) {
      const descMax = Number(clienteSeleccionado.f_descuento_maximo);
      const desc1 = Number(clienteSeleccionado.f_descuento1);
      return (condicionSeleccionada.id === 0 || condicionSeleccionada.id === 2) ? descMax : desc1;
    }
    return 0;
  }, [clienteSeleccionado, condicionSeleccionada]);

  useEffect(() => {
    if (clienteSeleccionado && clienteSeleccionado.f_termino != null) {
      const defaultCondicion = condicionPedido.find(item => item.id === Number(clienteSeleccionado.f_termino));
      if (defaultCondicion) setCondicionSeleccionada(defaultCondicion);
    }
  }, [clienteSeleccionado]);

  useEffect(() => {
    if (clienteSeleccionado) {
      const nuevoCredito = clienteSeleccionado.f_limite_credito - balanceCliente;
      setCreditoDisponible(nuevoCredito);
    }
  }, [clienteSeleccionado, balanceCliente]);

  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }}>
      <Tab.Screen
        name="Cliente"
        children={() => (
          <SelectedClienteCobranza
            clienteSeleccionado={clienteSeleccionado}
            balanceCliente={balanceCliente}
            descuentoGlobal={descuentoGlobal}
            descuentoCredito={descuentoCredito}
            setDescuentoCredito={setDescuentoCredito}
            condicionSeleccionada={condicionSeleccionada}
            creditoDisponible={creditoDisponible}
            setCreditoDisponible={setCreditoDisponible}
            condicionPedido={condicionPedido}
            condicionPedidoElegida={condicionPedidoElegida}
            modalVisibleCondicion={modalVisibleCondicion}
            setModalVisibleCondicion={setModalVisibleCondicion}
            nota={nota}
            setNota={setNota}
          />
        )}
        options={{ title: 'Cliente' }}
      />
      <Tab.Screen
        name="Cobranza"
        component={Cobranza}
        options={{ title: 'Cobranza' }}
      />
    </Tab.Navigator>
  );
};

export default MainTabsCobranza;

import React, { useState, useEffect, useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import SelectedCliente from '../components/selectedCliente';
import Pedido from '../pedido';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';
import { DatabaseProvider } from '@nozbe/watermelondb/DatabaseProvider';
import { database } from '../../src/database/database';    // ajusta la ruta si es necesario
import AsyncStorage from '@react-native-async-storage/async-storage';

const Tab = createBottomTabNavigator();

const MainTabs = () => {

  const [modalVisibleCondicion, setModalVisibleCondicion] = useState(false);
  const [descuentoCredito, setDescuentoCredito] = useState("10");
  const [nota, setNota] = useState("");
  const [hasPedido, setHasPedido] = useState(false)
  const [storageHasPedido, setStorageHasPedido] = useState(false);

  const route = useRoute();
  const navigation = useNavigation();

  const {
    clienteSeleccionado = {},
    balanceCliente = 0,
    orderToEdit
  } = route.params || {};


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
    // Aquí puedes usar tanto el id como el name de la opción seleccionada
    console.log("Seleccionaste:", option.id, option.nombre);
    if ((option.id === 3 || option.id === 1) && clienteSeleccionado.f_bloqueo_credito == true) {
      Alert.alert("El cliente tiene bloqueo de crédito");
      return
    } else {
      setCondicionSeleccionada(option);
      setModalVisibleCondicion(false);
    }
  };


  const descuentoGlobal = useMemo(() => {
    if (clienteSeleccionado && condicionSeleccionada) {
      const descMax = Number(clienteSeleccionado.f_descuento_maximo);
      const desc1 = Number(clienteSeleccionado.f_descuento1);
      console.log('Calculando descuentoGlobal: ', { condicion: condicionSeleccionada, descMax, desc1 });
      return (condicionSeleccionada.id === 0 || condicionSeleccionada.id === 2)
        ? descMax
        : desc1;
    }
    return 0;
  }, [clienteSeleccionado, condicionSeleccionada]);




  useEffect(() => {
    if (clienteSeleccionado && clienteSeleccionado.f_termino != null) {
      const defaultCondicion = condicionPedido.find(
        item => item.id === Number(clienteSeleccionado.f_termino)
      );
      if (defaultCondicion) {
        setCondicionSeleccionada(defaultCondicion);
      }
    }
  }, [clienteSeleccionado]);

  //f_descuento1 es transparentado
  useEffect(() => {
    if (clienteSeleccionado && (condicionSeleccionada.id === 0 || condicionSeleccionada.id === 2)) 
      {
        setDescuentoCredito(clienteSeleccionado.f_descuento_maximo ? clienteSeleccionado.f_descuento_maximo.toString() : 0);
      } else if (clienteSeleccionado && clienteSeleccionado.f_descuento1>0) {
        setDescuentoCredito(clienteSeleccionado.f_descuento1 ? clienteSeleccionado.f_descuento1.toString() : 0 );
      }
  }, [condicionSeleccionada,clienteSeleccionado]);


  
useEffect(() => {
  const checkStoragePedido = async () => {
    try {
      const stored = await AsyncStorage.getItem('pedido_guardado');
      if (stored) {
        const parsed = JSON.parse(stored);
        setStorageHasPedido(Object.keys(parsed).length > 0);
      } else {
        setStorageHasPedido(false);
      }
    } catch (error) {
      console.error(error);
      setStorageHasPedido(false);
    }
  };
  checkStoragePedido();
}, []);

  useEffect(() => {
    if (!hasPedido || !storageHasPedido) return; // Si no hay cliente, no se añade el listener
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      e.preventDefault();

      Alert.alert(
        'CANCELAR PEDIDO',
        '¿Estás seguro que deseas cancelar el pedido?',
        [
          { text: 'No, continuar', style: 'cancel', onPress: () => {  navigation.dispatch(e.data.action)} },
          {
            text: 'Si, eliminar pedido',
            style: 'destructive',
            onPress: () => {
              AsyncStorage.removeItem('pedido_guardado');
              navigation.dispatch(e.data.action);
            }
          },
        ]
      );
    });
    

    return unsubscribe;
  }, [navigation, clienteSeleccionado,hasPedido]);


  return (
    <DatabaseProvider database={database}>
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }}>
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
        name="Productos"
        headerShown={false}
        children={() => (
          <Pedido
            clienteSeleccionado={clienteSeleccionado}
            creditoDisponible={creditoDisponible}
            setCreditoDisponible={setCreditoDisponible}
            descuentoCredito={descuentoCredito}
            setDescuentoCredito={setDescuentoCredito}
            modalVisibleCondicion={modalVisibleCondicion}
            setModalVisibleCondicion={setModalVisibleCondicion}
            descuentoGlobal={descuentoGlobal}
            nota={nota}
            setNota={setNota}
            condicionSeleccionada={condicionSeleccionada}
            orderToEdit={orderToEdit}
            setHasPedido={setHasPedido}
          />
        )}
        options={{ title: 'Productos' }}
      />
    </Tab.Navigator>
    </DatabaseProvider>
  );
};

export default MainTabs;

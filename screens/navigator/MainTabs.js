import React, { useState,useEffect,useMemo } from 'react';
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
  } = route.params || {};


  const condicionPedido = [
    { id: 0, nombre: 'Contado' },
    { id: 1, nombre: 'Crédito' },
    { id: 2, nombre: 'Contra entrega' },
    { id: 3, nombre: 'Vuelta viaje' },
  ];

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
  
  const [condicionSeleccionada, setCondicionSeleccionada] = useState(() => {
  if (clienteSeleccionado && clienteSeleccionado.f_termino != null) {
    return condicionPedido.find(item => item.id === Number(clienteSeleccionado.f_termino)) || null;
  }
  return null;
});

  
  
    const [modalVisibleCondicion, setModalVisibleCondicion] = useState(false);
  

  const [creditoDisponible, setCreditoDisponible] = useState(
    clienteSeleccionado.f_limite_credito ? clienteSeleccionado.f_limite_credito - balanceCliente : 0
  );
  // Inicializa el descuento como string para que el TextInput lo maneje bien
  const [descuentoCredito, setDescuentoCredito] = useState("10");

  

  const condicionPedidoElegida = (option) => {
    // Aquí puedes usar tanto el id como el name de la opción seleccionada
    console.log("Seleccionaste:", option.id, option.nombre);
    setCondicionSeleccionada(option);
    setModalVisibleCondicion(false);
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
            condicionPedido={condicionPedido}
            condicionPedidoElegida={condicionPedidoElegida}
            modalVisibleCondicion={modalVisibleCondicion}
            setModalVisibleCondicion={setModalVisibleCondicion}
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
            modalVisibleCondicion={modalVisibleCondicion}
            setModalVisibleCondicion={setModalVisibleCondicion}
          />
        )}
        options={{ title: 'Productos' }}
      />
    </Tab.Navigator>
  );
};

export default MainTabs;

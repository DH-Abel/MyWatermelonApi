import { React, useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../../assets/styles';
import MyCheckbox from '../utilities/checkbox.js';
import { formatear } from '../../assets/formatear.js';
import api from '../../api/axios';
import  ModalOptions  from '../modal/condicionPedido';



const SelectedCliente = ({
  clienteSeleccionado,
  setClienteSeleccionado,
  creditoDisponible,
  setCreditoDisponible,
  descuentoCredito,
  setDescuentoCredito,
  descuentoGlobal,
  totalNeto,
}) => {

  const [condicionSeleccionada, setCondicionSeleccionada] = useState(null);
  const [modalVisibleCondicion, setModalVisibleCondicion] = useState(false);
  const [loading, setLoading] = useState(true);

  const [balanceCliente, setBalanceCliente] = useState(0);


  useEffect(() => {
    if (clienteSeleccionado) {
      // Por ejemplo: límite de crédito menos el balance
      const nuevoCredito = clienteSeleccionado.f_limite_credito - balanceCliente;
      setCreditoDisponible(nuevoCredito);
    }
  }, [clienteSeleccionado, balanceCliente, setCreditoDisponible]);

  
  const condicionPedido = [
    { id: 0, nombre: 'Contado' },
    { id: 1, nombre: 'Crédito' },
    { id: 2, nombre: 'Contra entrega' },
    { id: 3, nombre: 'Vuelta viaje' },
  ];

  const condicionPedidoElegida = (option) => {
    // Aquí puedes usar tanto el id como el name de la opción seleccionada
    console.log("Seleccionaste:", option.id, option.nombre);
    setCondicionSeleccionada(option);
    setModalVisibleCondicion(false);
  };

  useEffect(() => {
    if (clienteSeleccionado) {
      const fetchClientesCxc = async () => {
        try {
          const response = await api.get(`/cuenta_cobrar/${clienteSeleccionado.f_id}`);
          setBalanceCliente(response.data.f_balance || 0);
        } catch (error) {
          console.error('❌ Error al obtener cxc:', error);
          setBalanceCliente(0);
        } finally {
          setLoading(false);
        }
      };
      fetchClientesCxc();
    }
  }, [clienteSeleccionado]);

  useEffect(() => {
    if (clienteSeleccionado && clienteSeleccionado.f_termino !== undefined) {
      const defaultCondicion = condicionPedido.find(
        item => item.id === clienteSeleccionado.f_termino
      );
      if (defaultCondicion) {
        setCondicionSeleccionada(defaultCondicion);
      }
    }
  }, [clienteSeleccionado]);
  


  const navigation = useNavigation();

  return (
    <View>
      <View style={{ flexDirection: 'row', borderWidth: 1 }}>
        <View style={{ flex: 7, borderWidth: 1, borderColor: 'red' }}>
          <Text style={styles.title}>
            Cliente: ({clienteSeleccionado.f_id}) {clienteSeleccionado.f_nombre}
          </Text>
        </View>
        <View style={{ borderWidth: 1, borderColor: 'blue', flex: 1 }}>
          <Pressable
            onPress={() => { navigation.replace('SelectClientScreen') }}
            style={[styles.button2, { marginBottom: 10 }]}
          >
            <Text style={styles.buttonText2}>✍️</Text>
          </Pressable>
        </View>
      </View>
      <Text>
        Condición seleccionada:{" "}
        {condicionSeleccionada ? condicionSeleccionada.nombre : "Ninguna"}
      </Text>
      <Pressable
        title="Mostrar opciones"
        onPress={() => setModalVisibleCondicion(true)}
        style={[styles.button]}
      >
        <Text style={styles.buttonText}>condicion✍️</Text>
      </Pressable>
      <View style={styles.headerContainer}>
        <View style={{ flex: 2 }}>
          <Text style={styles.headerText}>
            Limite de credito: {formatear(clienteSeleccionado.f_limite_credito)}
          </Text>
          <Text style={styles.headerText}>
            Balance: {formatear(balanceCliente)}
          </Text>
          <Text style={styles.headerText}>
            Disponible: {formatear(creditoDisponible)}
          </Text>
          <Text style={styles.headerText}>
            Descuento Global: {descuentoGlobal} Descuento Credito: {descuentoCredito}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Descuento"
            value={descuentoCredito}
            onChangeText={setDescuentoCredito}
          />
          <MyCheckbox />
          <Text style={styles.title}>Total del pedido: {formatear(totalNeto)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <TextInput />
        </View>
      </View>
      <ModalOptions
          modalVisibleCondicion={modalVisibleCondicion}
          setModalVisibleCondicion={setModalVisibleCondicion}
          condicionPedido={condicionPedido}
          condicionPedidoElegida={condicionPedidoElegida}
        />
    </View>



  );
};

export default SelectedCliente;

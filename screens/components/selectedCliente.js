import { React, useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../../assets/styles';
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
  condicionSeleccionada,
  condicionPedido,
  condicionPedidoElegida,
  setModalVisibleCondicion,
  modalVisibleCondicion,
  nota, setNota
}) => {

  const navigation = useNavigation();
  
  const [loading, setLoading] = useState(true);
  const [balanceCliente, setBalanceCliente] = useState(0);


  useEffect(() => {
    if (clienteSeleccionado) {
      // Por ejemplo: límite de crédito menos el balance
      const nuevoCredito = clienteSeleccionado.f_limite_credito - balanceCliente;
      setCreditoDisponible(nuevoCredito);
    }
  }, [clienteSeleccionado, balanceCliente, setCreditoDisponible]);

  

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
            Descuento: {descuentoGlobal} %
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Descuento"
            value={descuentoCredito}
            onChangeText={setDescuentoCredito}
          />

          <TextInput
            style={{
              width: '100%',
              borderWidth: 1,
              borderColor: 'black',
              borderRadius: 5,
              padding: 10,
              marginBottom: 10,}}
            placeholder="Nota"
            onChangeText={setNota}
            value= {nota}
            multiline
            numberOfLines={8}
         />
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

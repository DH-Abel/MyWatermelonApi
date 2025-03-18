import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../../assets/styles';
import MyCheckbox from '../utilities/checkbox.js';
import { formatear } from '../../assets/formatear.js';


const condicionPedido = [
  { id: 0, nombre: 'Contado' },
  { id: 1, nombre: 'Crédito' },
  { id: 2, nombre: 'Contra entrega' },
  { id: 3, nombre: 'Vuelta viaje' },
];


const SelectedCliente = ({
  clienteSeleccionado,
  setClienteSeleccionado,
  condicionSeleccionada,
  setModalVisibleCondicion,
  balanceCliente,
  creditoDisponible,
  descuentoGlobal,
  descuentoCredito,
  setDescuentoCredito,
  totalNeto,
}) => {
  useEffect(() => {

    if (clienteSeleccionado && clienteSeleccionado.f_termino !== undefined) {
      const defaultCondicion = condicionPedido.find(
        item => item.id === clienteSeleccionado.f_termino
      );
      if (defaultCondicion) {
        setCondicionSeleccionada2(defaultCondicion);
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
            onPress={() => { navigation.replace('SelectClientScreen')}}
            style={[styles.button2, { marginBottom: 10 }]}
          >
            <Text style={styles.buttonText2}>✍️</Text>
          </Pressable>
        </View>
      </View>
      <Text>
        Condición seleccionada:{" "}
        {condicionSeleccionada2 ? condicionSeleccionada2.nombre : "Ninguna"}
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
    </View>
  );
};

export default SelectedCliente;

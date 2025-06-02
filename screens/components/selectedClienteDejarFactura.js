// selectedClienteDejarFactura.js
import React from 'react';
import { View, Text, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const SelectedClienteDejarFactura = ({ clienteSeleccionado, setClienteSeleccionado }) => {
  const navigation = useNavigation();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 20}
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        <View style={uiStyles.container}>

          {/* Header Cliente */}
          <View style={uiStyles.clienteHeader}>
            <View style={{ flex: 1 }}>
              <Text style={uiStyles.clienteNombre}>
                ({clienteSeleccionado.f_id}) {clienteSeleccionado.f_nombre}
              </Text>
            </View>
            <Pressable
              onPress={() => navigation.replace('SelectClientesDejarFactura')}
              style={uiStyles.editButton}
            >
              <Text>✏️</Text>
            </Pressable>
          </View>

          {/* Instrucción */}
          <View style={uiStyles.infoCard}>
            <Text style={uiStyles.infoText}>
              Ahora puedes ir a la pestaña “Dejar Factura” para seleccionar las facturas pendientes de este cliente.
            </Text>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default SelectedClienteDejarFactura;

const uiStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9fb',
  },
  clienteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  clienteNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  editButton: {
    backgroundColor: '#e0f0ff',
    borderRadius: 8,
    padding: 10,
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
  },
});

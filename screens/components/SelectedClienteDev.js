import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import cargarDevoluciones from '../../src/sincronizaciones/cargarDevoluciones';

export default function SelectedClienteDev({ clienteSeleccionado, setClienteSeleccionado }) {
  const navigation = useNavigation();

   useEffect(() => {
    if (clienteSeleccionado?.f_id) {
      cargarDevoluciones(clienteSeleccionado.f_id);
    }
  }, [clienteSeleccionado]);

  if (!clienteSeleccionado) {
    return (
      <View style={uiStyles.containerEmpty}>
        <Text style={uiStyles.emptyText}>No hay cliente seleccionado</Text>
      </View>
    );
  }

  return (
    <View style={uiStyles.container}>
      <View style={uiStyles.clienteHeader}>
        <View style={{ flex: 1 }}>
          <Text style={uiStyles.clienteNombre}>
            ({clienteSeleccionado.f_id}) {clienteSeleccionado.f_nombre}
          </Text>
        </View>
        <Pressable
          onPress={() => navigation.replace('SelectClientesDev')}
          style={uiStyles.editButton}
        >
          <Text>✏️</Text>
        </Pressable>
      </View>
    </View>
  );
}

const uiStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9fb'
  },
  containerEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fb'
  },
  emptyText: {
    fontSize: 16,
    color: '#666'
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
    elevation: 2
  },
  clienteNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  editButton: {
    backgroundColor: '#e0f0ff',
    borderRadius: 8,
    padding: 10,
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center'
  }
});

import { React, useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet,KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../../assets/styles';
import { formatear } from '../../assets/formatear.js';
import api from '../../api/axios';
import ModalOptions from '../modal/condicionPedido';

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
      const nuevoCredito = clienteSeleccionado.f_limite_credito - balanceCliente;
      setCreditoDisponible(nuevoCredito);
    }
  }, [clienteSeleccionado, balanceCliente]);

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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 20}  // Ajusta este valor según la altura de tu header
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
              onPress={() => navigation.replace('SelectClientScreen')}
              style={{
                backgroundColor: '#e0f0ff',
                borderRadius: 8,
                padding: 10,
                marginLeft: 10,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
              }}
            >
              <Text style={{ fontSize: 16 }}>✏️</Text>
            </Pressable>
          </View>
  
          {/* Condición de pedido */}
          <View style={uiStyles.seccion}>
            <Text style={uiStyles.label}>Condición seleccionada:</Text>
            <Text style={uiStyles.condicion}>
              {condicionSeleccionada ? condicionSeleccionada.nombre : "Ninguna"}
            </Text>
            <Pressable
              onPress={() => setModalVisibleCondicion(true)}
              style={[styles.button, { marginTop: 8 }]}
            >
              <Text style={styles.buttonText}>Cambiar condición</Text>
            </Pressable>
          </View>
  
          {/* Info financiera */}
          <View style={uiStyles.infoCard}>
            <Text style={uiStyles.infoText}>
              💳 Límite de crédito: {formatear(clienteSeleccionado.f_limite_credito)}
            </Text>
            <Text style={uiStyles.infoText}>
              📉 Balance actual: {formatear(balanceCliente)}
            </Text>
            <Text style={uiStyles.infoText}>
              ✅ Disponible: {formatear(creditoDisponible)}
            </Text>
            <Text style={uiStyles.infoText}>
            🏷️ Descuento: {descuentoGlobal} %
            </Text>
          </View>
  
          {/* Nota */}
          <Text style={[uiStyles.label, { marginTop: 15 }]}>📝 Nota:</Text>
          <TextInput
            style={uiStyles.textArea}
            placeholder="Escribe aquí una nota sobre el pedido"
            onChangeText={setNota}
            value={nota}
            multiline
            numberOfLines={6}
          />
  
          {/* Modal */}
          <ModalOptions
            modalVisibleCondicion={modalVisibleCondicion}
            setModalVisibleCondicion={setModalVisibleCondicion}
            condicionPedido={condicionPedido}
            condicionPedidoElegida={condicionPedidoElegida}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
  
    
};

export default SelectedCliente;

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
    backgroundColor: '#ffffff',
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
  seccion: {
    marginBottom: 15,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  condicion: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginTop: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginTop: 0,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 6,
    color: '#333',
  },
  textArea: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 14,
    marginTop: 8,
  },
});

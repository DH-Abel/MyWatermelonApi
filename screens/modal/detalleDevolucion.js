import React, { useState, useEffect } from 'react';
import {
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  Pressable
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

const ModalDetalleDevolucion = ({
  showModal,
  setShowModal,
  selectedInvoice,
  detailsMap,
  toReturn,
  onChangeReturn,
  selectedMotivo,
  setSelectedMotivo,
  motives,
  observacion,
  setObservacion,
  summary,
  formatear,
  confirmReturn
}) => {
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const renderFooter = () => (
    <View style={{ paddingHorizontal: 16, paddingTop: 5, borderWidth: 1, borderColor: '#ccc' }}>
      <Picker
        selectedValue={selectedMotivo}
        onValueChange={setSelectedMotivo}
        mode="dropdown"
        style={{ height: 50, width: '100%', marginBottom: 0, borderWidth: 1, borderColor: '#ccc' }}
      >
        <Picker.Item label="— Seleccione un motivo —" value={null} enabled={false} />
        {motives.map(m => (
          <Picker.Item key={m.f_id} label={m.f_concepto} value={m.f_id} />
        ))}
      </Picker>

      <TextInput
        placeholder="Observaciones"
        value={observacion}
        onChangeText={setObservacion}
        style={[styles.input, { width: '100%', marginVertical: 1 }]}
        multiline
        scrollEnabled={false}
        removeClippedSubviews={false}
        
      />

      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>
          Monto Bruto Devuelto: {formatear(summary.totalBruto)}
        </Text>
        <Text style={styles.summaryText}>
          Itbis Devuelto: {formatear(summary.totalItbis)}
        </Text>
        <Text style={styles.summaryText}>
          Descuento: {formatear(summary.totalDescuento)}
        </Text>
        <Text style={styles.summaryText}>
          Total a Devolver: {formatear(summary.totalBruto + summary.totalItbis - summary.totalDescuento)}
        </Text>
      </View>

      <Pressable
        onPress={confirmReturn}
        style={[styles.footerButton, !selectedMotivo && { opacity: 0.5 }]}
        disabled={!selectedMotivo}
      >
        <Text style={styles.footerText}>Registrar Devolución</Text>
      </Pressable>
      <Pressable onPress={() => setShowModal(false)} style={styles.cancelButton}>
        <Text>Cancelar</Text>
      </Pressable>
    </View>
  );

  return (
    <Modal visible={showModal} animationType="slide">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Sólo el header cierra el teclado al tocar fuera */}
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.headerContainer}>
              <Text style={styles.modalTitle}>Detalle de Devolución</Text>
            </View>
          </TouchableWithoutFeedback>

          <FlatList
            data={detailsMap[selectedInvoice?.f_documento] || []}
            keyExtractor={(item, index) =>
              `${item.f_documento}_${item.f_referencia}_${item.f_cantidad}_${index}`
            }
            renderItem={({ item }) => {
              const key = `${item.f_documento}_${item.f_referencia}_${item.f_cantidad}`;
              return (
                <View style={styles.detailRow}>
                  <Text style={styles.detailText}>
                    ({item.f_referencia}) {item.descripcion}
                  </Text>
                  <View>
                    <Text style={styles.detailSub}>Cant: {item.f_cantidad - item.qty_dev} </Text>
                    <Text style={styles.detailSub}>Prec: {formatear(item.f_precio)} </Text>
                    <Text style={styles.detailSub}>Itbis: {formatear(item.f_itbis)} </Text>
                  </View>
                      <View>
                          <TextInput
                              style={styles.input}
                              value={(toReturn[key] || '').toString()}
                              onChangeText={val => onChangeReturn(item, val)}
                              keyboardType="numeric"
                              placeholder="QTY"
                          />
                      </View>
                </View>
                
                
              );
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingBottom: 250 }}
            ListFooterComponent={renderFooter()}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: 'white' },
  headerContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  detailRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  detailText: { flex: 1, fontSize: 14 },
  detailSub: { fontSize: 12, color: '#555', marginLeft: 8 },
  input: {
    width: 55,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  summaryContainer: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  summaryText: { fontSize: 14, marginBottom: 4 },
  footerButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  footerText: { color: 'white', fontWeight: 'bold' },
  cancelButton: {
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
});

export default ModalDetalleDevolucion;
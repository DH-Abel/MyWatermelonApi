// cambiarCantidad.js
import React from 'react';
import { Modal, View, Text, TextInput, Pressable } from 'react-native';
import { styles } from '../../assets/styles'; // Ajusta la ruta si es necesario


const CambiarCantidadModal = ({
  visible,
  onCancel,
  onAccept,
  producto,
  nuevaCantidad,
  setNuevaCantidad
}) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={ { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{ width: '80%', backgroundColor: 'white', borderRadius: 10, padding: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 18, marginBottom: 10 }}>Cambiar cantidad</Text>
          <TextInput
            style={{ height: 40, borderColor: 'gray', borderWidth: 1, width: '100%', marginBottom: 10, paddingHorizontal: 10 }}
            value={nuevaCantidad}
            onChangeText={setNuevaCantidad}
            keyboardType="numeric"
          />
          <View style={styles.modalButtonContainer || { flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
            <Pressable
              style={[styles.button, { backgroundColor: '#ccc', flex: 1, marginRight: 5 }]}
              onPress={onCancel}
            >
              <Text style={styles.textStyle || { textAlign: 'center', padding: 1 }}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.button, { backgroundColor: '#2196F3', flex: 1, marginLeft: 5 }]}
              onPress={onAccept}
            >
              <Text style={styles.textStyle || { textAlign: 'center', padding: 1, color: '#fff' }}>Aceptar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CambiarCantidadModal;

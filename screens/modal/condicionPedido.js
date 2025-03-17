import React from 'react';
import { Modal, View, TouchableOpacity, Text, Button, StyleSheet } from 'react-native';

const ModalOptions = ({ modalVisibleCondicion, setModalVisibleCondicion, condicionPedido, condicionPedidoElegida }) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisibleCondicion}
      onRequestClose={() => setModalVisibleCondicion(false)}
    >
      <View style={styles.modalBackground}>
        <View style={styles.modalContainer}>
          {condicionPedido.map((option) => (
            <TouchableOpacity
              key={option.id}
              onPress={() => condicionPedidoElegida(option)}
              style={styles.optionButton}
            >
              <Text style={styles.optionText}>{option.nombre}</Text>
            </TouchableOpacity>
          ))}
          <Button title="Cerrar" onPress={() => setModalVisibleCondicion(false)} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContainer: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center'
  },
  optionButton: {
    padding: 10,
    marginBottom: 10
  },
  optionText: {
    fontSize: 16
  }
});

export default ModalOptions;

import React from 'react';
import { View, Text, SafeAreaView, ScrollView, StyleSheet, Pressable } from 'react-native';

export default function DetallesPedido({ route, navigation }) {
  // Se extrae el pedido recibido por parámetros.
  const { pedido } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Detalles del Pedido</Text>
        
        <View style={styles.row}>
          <Text style={styles.label}>Documento:</Text>
          <Text style={styles.value}>{pedido.f_documento}</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>Cliente:</Text>
          <Text style={styles.value}>{pedido.f_cliente}</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>Tipo de Documento:</Text>
          <Text style={styles.value}>{pedido.f_tipodoc}</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>Número de Documento:</Text>
          <Text style={styles.value}>{pedido.f_nodoc}</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>Fecha:</Text>
          <Text style={styles.value}>{pedido.f_fecha}</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>ITBIS:</Text>
          <Text style={styles.value}>{pedido.f_itbis}</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>Descuento:</Text>
          <Text style={styles.value}>{pedido.f_descuento}</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>% Descuento:</Text>
          <Text style={styles.value}>{pedido.f_porc_descuento}</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>Monto Total:</Text>
          <Text style={styles.value}>{pedido.f_monto}</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>Condición:</Text>
          <Text style={styles.value}>{pedido.f_condicion}</Text>
        </View>
      </ScrollView>
      
      <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>Regresar</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  content: {
    paddingBottom: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontWeight: 'bold',
    marginRight: 8,
  },
  value: {
    flex: 1,
  },
  backButton: {
    backgroundColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  backButtonText: {
    fontSize: 16,
  },
});

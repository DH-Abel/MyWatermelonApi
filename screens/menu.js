/**
 * Diseño UI - Menú Principal (Pantalla de Navegación)
 *
 * Botones:
 *   - Pedidos (navega a flujo de pedidos)
 *   - Cobranza (navega a flujo de cobranza)
 *   - Devoluciones (por implementar)
 *   - Dejado de facturas (por implementar)
 *   - Reportes (por implementar)
 *
 * Colores:
 *   - Primario: #6200EE
 *   - Fondo: #FFFFFF
 *   - Texto: #222222
 *
 * Tipografía: Sistema (Roboto en Android, San Francisco en iOS), tamaño base 16sp
 * Iconografía: MaterialCommunityIcons
 * Interacción: efecto de elevación y cambio de color en presionar
 */

import React from 'react';
import { ScrollView, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function MenuPrincipal({ navigation }) {
  const menuItems = [
    { name: 'Pedidos', icon: 'cart-outline', target: 'SelectClientScreen' },
    { name: 'Cobranza', icon: 'credit-card-outline', target: 'SelectClientesCobranza' },
    { name: 'Devoluciones', icon: 'swap-horizontal', target: 'Devoluciones' },
    { name: 'Dejado de facturas', icon: 'file-document-outline', target: 'Facturas' },
    { name: 'Reportes', icon: 'chart-bar', target: 'Reportes' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {menuItems.map(item => (
        <TouchableOpacity
          key={item.name}
          style={styles.button}
          activeOpacity={0.7}
          onPress={() => navigation.navigate(item.target)}
        >
          <View style={styles.iconContainer}>
            <Icon name={item.icon} size={28} color="#6200EE" />
          </View>
          <Text style={styles.label}>{item.name}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  iconContainer: {
    marginRight: 12,
  },
  label: {
    fontSize: 16,
    color: '#222222',
    fontWeight: '500',
  },
});

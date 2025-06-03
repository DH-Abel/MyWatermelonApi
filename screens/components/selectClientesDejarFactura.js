// SelectClientesDejarFactura.js
import React, { useState, useEffect,useContext } from 'react';
import { View, Text, TextInput, Pressable, TouchableOpacity, Alert } from 'react-native';
import { styles } from '../../assets/styles';
import { useNavigation } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import { database } from '../../src/database/database';
import sincronizarClientes from '../../src/sincronizaciones/clientesLocal.js';
import { FlashList } from '@shopify/flash-list';
import { AuthContext } from '../context/AuthContext.js';
import { getVendedor } from '../../src/sincronizaciones/secuenciaHelper.js'


const SelectClientesDejarFactura = () => {
  const navigation = useNavigation();
  const [searchTextClientes, setSearchTextClientes] = useState('');
  const [clientes, setClientes] = useState([]);

  const { user } = useContext(AuthContext);

  // Carga inicial de clientes locales
  const cargarClientesLocales = async () => {
    try {
      const clientesLocales = await database.collections.get('t_clientes').query().fetch();
      setClientes(clientesLocales);
    } catch (error) {
      console.error('Error al cargar clientes locales:', error);
    }
  };

  // Sincroniza si hay conexión y recarga locales
  const cargarClientes = async () => {
    await cargarClientesLocales();
    const netState = await NetInfo.fetch();
    if (netState.isConnected) {
      try {
        const { vendedor } = await getVendedor(user);
        await sincronizarClientes(vendedor);
        await cargarClientesLocales();
      } catch (error) {
        console.error('Error al sincronizar, se mantienen los clientes locales:', error);
      }
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  // Filtra la lista según texto de búsqueda
  const clientesFiltrados = clientes.filter(cliente =>
    cliente.f_nombre.toLowerCase().includes(searchTextClientes.toLowerCase()) ||
    (cliente.f_id ? cliente.f_id.toString().toLowerCase() : '').includes(searchTextClientes.toLowerCase())
  );

  const handleSelect = (cliente) => {
    // Navega a MainTabsDejarFactura pasando el cliente seleccionado
    navigation.replace('MainTabsDejarFactura', { clienteSeleccionado: cliente });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selecciona un Cliente</Text>
      <Pressable onPress={cargarClientes} style={{ marginBottom: 12, backgroundColor: '#007AFF', padding: 10, borderRadius: 6 }}>
        <Text style={{ color: '#fff', textAlign: 'center' }}>Cargar Clientes</Text>
      </Pressable>
      <TextInput
        style={styles.input}
        placeholder="Buscar cliente..."
        value={searchTextClientes}
        onChangeText={setSearchTextClientes}
      />
      <View style={styles.listContainer2}>
        <FlashList
          data={clientesFiltrados}
          keyExtractor={item => item.f_id.toString()}
          estimatedItemSize={100}
          initialNumToRender={8}
          keyboardShouldPersistTaps="handled"
          windowSize={3}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <TouchableOpacity onPress={() => handleSelect(item)}>
                <Text style={styles.itemText}>
                  ({item.f_id}) {item.f_nombre}
                </Text>
                <Text style={styles.itemText}>Municipio: {item.f_d_municipio}</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text>No se encontraron clientes</Text>}
        />
      </View>
    </View>
  );
};

export default SelectClientesDejarFactura;

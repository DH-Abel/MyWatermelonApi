import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, TouchableOpacity, Alert } from 'react-native';
import { KeyboardAwareFlatList } from 'react-native-keyboard-aware-scroll-view';
import { styles } from '../../assets/styles';
import { useNavigation } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import api from '../../api/axios'; // Asegúrate de que la ruta sea correcta
import { database } from '../../src/database/database';
import { Q } from '@nozbe/watermelondb';
import  sincronizarClientes  from '../../sincronizaciones/clientesLocal';

const SelectClientScreen = () => {
  const navigation = useNavigation();
  const [searchTextClientes, setSearchTextClientes] = useState('');
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const response = await api.get('/clientes');
      setClientes(response.data);
    } catch (error) {
      console.error('❌ Error al obtener clientes:', error);
      Alert.alert('Error', 'No se pudo obtener la lista de clientes. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  const cargarClientesLocales = async () => {
    try {
      const clientesLocales = await database.collections.get('t_clientes').query().fetch();
      setClientes(clientesLocales);
    } catch (error) {
      console.error('Error al cargar clientes locales:', error);
    }
  };

  // Función para sincronizar y luego cargar clientes locales
  const cargarClientes = async () => {
    // Primero carga la data local
    await cargarClientesLocales();

    // Luego, si hay conexión, sincroniza y recarga la data local
    const netState = await NetInfo.fetch();
    if (netState.isConnected) {
      try {
        await sincronizarClientes();
        await cargarClientesLocales();
      } catch (error) {
        console.error("Error al sincronizar, se mantienen los clientes locales:", error);
      }
    }
  };

  useEffect(() => {
    // Elimina el fetch directo de la API si quieres que la fuente principal sea la base de datos local
    cargarClientes();
  }, []);

  const clientesFiltrados = clientes.filter(cliente =>
    cliente.f_nombre.toLowerCase().includes(searchTextClientes.toLowerCase()) ||
    (cliente.f_id ? cliente.f_id.toString().toLowerCase() : '').includes(searchTextClientes.toLowerCase())
  );

  const handleSelect = (cliente) => {
    navigation.replace('MainTabs', { clienteSeleccionado: cliente });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selecciona un Cliente</Text>
      <Pressable title="Cargar Clientes" onPress={cargarClientes} />
      <TextInput
        style={styles.input}
        placeholder="Buscar cliente..."
        value={searchTextClientes}
        onChangeText={setSearchTextClientes}
      />
      <View style={styles.listContainer2}>
        <KeyboardAwareFlatList
          data={clientesFiltrados}
          keyExtractor={item => item.f_id.toString()}
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

export default SelectClientScreen;

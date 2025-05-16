import React, { useState, useEffect,memo,useContext,useCallback } from 'react';
import { View, Text, TextInput, Pressable, TouchableOpacity, Alert } from 'react-native';
import { KeyboardAwareFlatList } from 'react-native-keyboard-aware-scroll-view';
import { FlashList } from '@shopify/flash-list';
import { styles } from '../../assets/styles';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import api from '../../api/axios'; // Asegúrate de que la ruta sea correcta
import { database } from '../../src/database/database';
import  sincronizarClientes  from '../../src/sincronizaciones/clientesLocal.js';
import { MapsContext } from './mapsContext.js';


const SelectClientScreen = () => {
  const navigation = useNavigation();
  const [searchTextClientes, setSearchTextClientes] = useState('');
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- NUEVO: obtenemos el mapa 'clientes' precargado
  const { clientes: clientesMap, syncClients } = useContext(MapsContext);

  // --- reemplazamos la lista local por la que viene del contexto
  //    convirtiendo el mapa en array
  const clientesArray = Object.values(clientesMap);

  // filtro en memoria según el texto de búsqueda
  const clientesFiltrados = clientesArray.filter(c =>
    c.f_nombre.toLowerCase().includes(searchTextClientes.toLowerCase()) ||
    (c.f_id?.toString().toLowerCase() || '').includes(searchTextClientes.toLowerCase())
  );

  // --- mantenemos las funciones originales en caso de necesitar sincronizar manualmente ---
  const cargarClientesLocales = async () => {
    try {
      const clientesLocales = await database
        .collections.get('t_clientes')
        .query()
        .fetch();
      setClientes(clientesLocales);
    } catch (error) {
      console.error('Error al cargar clientes locales:', error);
    }
  };

  const cargarClientes = async () => {
    setLoading(true);
    await cargarClientesLocales();
    const netState = await NetInfo.fetch();
    if (netState.isConnected) {
      try {
        await sincronizarClientes();
        await cargarClientesLocales();
      } catch (error) {
        console.error('Error al sincronizar, se mantienen los clientes locales:', error);
      }
    }
    setLoading(false);
  };

  // Cada vez que este screen gane foco, sincroniza y recarga los clientes
useFocusEffect(
  useCallback(() => {
    let isActive = true;

    const fetchAndReload = async () => {
      setLoading(true);
      try {
        console.log('[Select] syncClients ▶️ start');
        await syncClients();
      } catch (e) {
        console.error('[Select] Error sincronizando clientes:', e);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    fetchAndReload();

    return () => {
      isActive = false;
    };
  }, [syncClients])
);


  const handleSelect = cliente => {
    navigation.replace('MainTabs', { clienteSeleccionado: cliente });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selecciona un Cliente</Text>

      <TextInput
        style={styles.input}
        placeholder="Buscar cliente..."
        value={searchTextClientes}
        onChangeText={setSearchTextClientes}
      />

      {/* Si quieres un botón manual para recarga, puedes descomentarlo */}
      {/* <Pressable onPress={cargarClientes} style={styles.button}>
        <Text style={styles.buttonText}>
          {loading ? 'Cargando...' : 'Recargar Clientes'}
        </Text>
      </Pressable> */}

      <View style={styles.listContainer2}>
        <FlashList
          data={clientesFiltrados}
          keyExtractor={item => item.f_id.toString()}
          estimatedItemSize={100}
          initialNumToRender={8}
          windowSize={3}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <View style={styles.item}>
              <TouchableOpacity onPress={() => handleSelect(item)}>
                <Text style={styles.itemText}>
                  ({item.f_id}) {item.f_nombre}
                </Text>
                <Text style={styles.itemText}>
                  Municipio: {item.f_d_municipio}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {loading ? 'Cargando clientes...' : 'No se encontraron clientes'}
            </Text>
          }
        />
      </View>
    </View>
  );
};

export default SelectClientScreen;

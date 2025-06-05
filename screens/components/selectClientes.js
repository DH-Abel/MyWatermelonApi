import React, { useState, useEffect, memo, useContext, useCallback } from 'react';
import { View, Text, TextInput, Pressable, TouchableOpacity, Alert } from 'react-native';
import { KeyboardAwareFlatList } from 'react-native-keyboard-aware-scroll-view';
import { FlashList } from '@shopify/flash-list';
import { styles } from '../../assets/styles';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import { database } from '../../src/database/database';
import sincronizarClientes from '../../src/sincronizaciones/clientesLocal.js';
import { getVendedor } from '../../src/sincronizaciones/secuenciaHelper.js'
import { AuthContext } from '../context/AuthContext.js';


const SelectClientScreen = () => {
  const navigation = useNavigation();
  const [searchTextClientes, setSearchTextClientes] = useState('');
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);


  const { user } = useContext(AuthContext);

  // filtro en memoria según el texto de búsqueda
  const clientesFiltrados = clientes.filter(c =>
    c.f_nombre.toLowerCase().includes(searchTextClientes.toLowerCase()) ||
    (c.f_id?.toString().toLowerCase() || '').includes(searchTextClientes.toLowerCase())
  );

  // --- mantenemos las funciones originales en caso de necesitar sincronizar manualmente ---
   const cargarClientesLocales = async () => {
     try {
       const clientesLocales = await database.collections.get('t_clientes').query().fetch();
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
        const { vendedor } = await getVendedor(user);
        await sincronizarClientes(vendedor).then(() => {
         cargarClientesLocales()
         });
      } catch (error) {
        console.error('Error al sincronizar, se mantienen los clientes locales:', error);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    // Elimina el fetch directo de la API si quieres que la fuente principal sea la base de datos local
    cargarClientes();
  }, []);


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

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, TouchableOpacity } from 'react-native';
import { KeyboardAwareFlatList } from 'react-native-keyboard-aware-scroll-view';
import { styles } from '../../assets/styles';
import { useNavigation } from '@react-navigation/native';
import api from '../../api/axios'; // Asegúrate de que la ruta sea correcta

const SelectClientScreen = () => {
  const navigation = useNavigation();
  const [clientes, setClientes] = useState([]);
  const [searchTextClientes, setSearchTextClientes] = useState('');

  // Función para obtener clientes desde la API
  const fetchClientes = async () => {
    try {
      const response = await api.get('/clientes');
      setClientes(response.data);
    } catch (error) {
      console.error('❌ Error al obtener clientes:', error);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const clientesFiltrados = clientes.filter(cliente =>
    cliente.f_nombre.toLowerCase().includes(searchTextClientes.toLowerCase()) ||
    (cliente.f_id ? cliente.f_id.toString().toLowerCase() : '').includes(searchTextClientes.toLowerCase())
  );

  const handleSelect = (cliente) => {
    // Aquí puedes guardar el cliente seleccionado en un estado global o pasarlo por params
    navigation.replace('Pedido', { clienteSeleccionado: cliente });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selecciona un Cliente</Text>
      <Pressable title="Cargar Clientes" onPress={fetchClientes} />
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

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TextInput,
    ActivityIndicator,
    SafeAreaView,
    Pressable
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { database } from '../../src/database/database';
import { Q } from '@nozbe/watermelondb';
import { consultaStyles } from '../../assets/consultaStyles';
import { styles } from '../../assets/styles';
import NetInfo from '@react-native-community/netinfo';
import sincronizarClientes from '../../src/sincronizaciones/clientesLocal';
import { FlashList } from '@shopify/flash-list';

export default function SelectClientesDev({ navigation, route }) {
    const [clients, setClients] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [loading, setLoading] = useState(true);

    // Carga sólo local
    const cargarClientesLocales = async () => {
        try {
            const data = await database
                .collections.get('t_clientes')
                .query()
                .fetch();
            setClients(data.map(c => c._raw));
        } catch (err) {
            console.error('Error cargando clientes locales:', err);
        }
    };

    // Sincroniza si hay internet y recarga
    const cargarClientes = async () => {
        await cargarClientesLocales();
        const net = await NetInfo.fetch();
        if (net.isConnected) {
            try {
                await sincronizarClientes();
                await cargarClientesLocales();
            } catch (err) {
                console.error('Error al sincronizar clientes:', err);
            }
        }
    };

    useEffect(() => {
        cargarClientes();
    }, []);


    // Cargar clientes
    useEffect(() => {
        const load = async () => {
            try {
                const all = await database
                    .collections.get('t_clientes')
                    .query(Q.where('f_activo', true))
                    .fetch();
                setClients(all.map(c => c._raw));
                setFiltered(all.map(c => c._raw));
            } catch (err) {
                console.error('Error cargando clientes:', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // Filtrar según búsqueda
    useEffect(() => {
        setFiltered(
            clients.filter(c =>
                c.f_nombre.toLowerCase().includes(searchText.toLowerCase()) ||
                (c.f_id ? c.f_id.toString().toLowerCase() : '').includes(searchText.toLowerCase())
            )
        );
    }, [searchText, clients]);

    if (loading) {
        return <ActivityIndicator size="large" style={{ flex: 1 }} />;
    }

    return (
        <SafeAreaView style={consultaStyles.container}>
            {/* <View style={consultaStyles.headerCard}>
        <View style={consultaStyles.headerRow}>
          <Text style={consultaStyles.headerTitle}>Seleccionar Cliente</Text>
          <Pressable onPress={() => navigation.goBack()} style={consultaStyles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
        </View>
      </View> */}
            <View style={[consultaStyles.filterCard, { marginBottom: 5 }]}>
                <Ionicons name="search" size={20} />
                <TextInput
                    style={consultaStyles.searchInput}
                    placeholder="Buscar cliente..."
                    value={searchText}
                    onChangeText={setSearchText}
                />
            </View>
            <FlashList
                data={filtered}
                keyExtractor={item => item.f_id.toString()}
                estimatedItemSize={100}
                renderItem={({ item }) => (
                    <Pressable
                        style={styles.item}
                        onPress={() => navigation.replace('MainTabsDevoluciones', { clienteSeleccionado: item })}
                    >
                        <Text style={styles.itemText}>
                            ({item.f_id}) {item.f_nombre}
                        </Text>
                    </Pressable>
                )}
                ListEmptyComponent={<Text>No se encontraron clientes</Text>}
            />
        </SafeAreaView>
    );
}

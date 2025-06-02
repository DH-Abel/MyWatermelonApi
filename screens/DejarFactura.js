// DejarFactura.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Alert,
  FlatList,
  TouchableOpacity
} from 'react-native';
import { database } from '../src/database/database';
import { Q } from '@nozbe/watermelondb';
import { formatearFecha, formatear,calcularDiasDesde } from '../assets/formatear';
import { useNavigation } from '@react-navigation/native';
import { CheckboxDejado } from './utilities/checkbox';
import { FlashList } from '@shopify/flash-list';

export default function DejarFactura({ clienteSeleccionado }) {
  const navigation = useNavigation();

  const [cuentas, setCuentas] = useState([]); // Array de registros Watermelon de t_cuenta_cobrar con f_balance > 0
  const [loading, setLoading] = useState(true);
  const [facturasSeleccionadas, setFacturasSeleccionadas] = useState([]); 
  // Contendrá objetos { documento, fecha, monto, balance } para cada factura marcada

  // 1) loadLocal: carga todas las facturas pendientes de t_cuenta_cobrar para el cliente ordenadas por fecha ascendente y, a igualdad de fecha, por documento
  const loadLocal = async () => {
    try {
      // 1a) Obtiene todas las facturas asociadas al cliente
      const results = await database
        .collections.get('t_cuenta_cobrar')
        .query(Q.where('f_idcliente', clienteSeleccionado.f_id))
        .fetch();

      // 1b) Filtra solo las que tengan f_balance > 0
      const pendientes = results.filter(c => parseFloat(c.f_balance) > 0);

      // 1c) Ordena por fecha ascendente (y por f_documento si fechas iguales)
      const ordenadas = pendientes.sort((a, b) => {
        const dateA = formatearFecha(a.f_fecha);
        const dateB = formatearFecha(b.f_fecha);
        if (dateA < dateB) return -1;
        if (dateA > dateB) return 1;
        return a.f_documento.localeCompare(b.f_documento);
      });

      setCuentas(ordenadas);
    } catch (error) {
      console.error('Error cargando cuentas en DejarFactura:', error);
      Alert.alert('Error', 'No se pudieron cargar las facturas pendientes.');
    } finally {
      setLoading(false);
    }
  };

  // Cada vez que cambia clienteSeleccionado, recarga las facturas
  useEffect(() => {
    if (!clienteSeleccionado?.f_id) return;
    setLoading(true);
    loadLocal();
  }, [clienteSeleccionado]);

  // 2) Manejo de selección / des-selección de facturas
  const toggleSeleccionFactura = (cuenta) => {
    const doc = cuenta.f_documento;
    const yaSeleccionada = facturasSeleccionadas.find(f => f.documento === doc);

    if (yaSeleccionada) {
      // Si ya estaba marcada, removerla del arreglo
      setFacturasSeleccionadas(prev =>
        prev.filter(f => f.documento !== doc)
      );
    } else {
      // Si no estaba marcada, agregarla
      setFacturasSeleccionadas(prev => [
        ...prev,
        {
          documento: doc,
          fecha: cuenta.f_fecha,
          monto: cuenta.f_monto,
          balance: cuenta.f_balance,
        },
      ]);
    }
  };

  // 3) Cuando el usuario presiona “Confirmar Dejado”
  const onConfirmarDejado = () => {
    if (facturasSeleccionadas.length === 0) {
      Alert.alert('Atención', 'Debes seleccionar al menos una factura para “dejar”.');
      return;
    }
    // Navega a ConfirmarDejadoFactura, pasando:
    // - clienteSeleccionado
    // - facturasSeleccionadas (array)
    navigation.navigate('ConfirmarDejadoFactura', {
      clienteSeleccionado: clienteSeleccionado,
      facturasSeleccionadas: facturasSeleccionadas,
    });
  };

  // 4) Renderizado de cada fila de factura en FlatList
  const renderItem = ({ item }) => {
  const doc = item.f_documento;
  const isChecked = !!facturasSeleccionadas.find(f => f.documento === doc);
  const dias = calcularDiasDesde(formatearFecha(item.f_fecha))
  return (
    <View style={styles.itemContainer}>
      
      <View style={styles.infoContainer}>
        <Text style={styles.documentoText}>{item.f_documento}</Text>
        <Text>Fecha: {formatearFecha(item.f_fecha)} - ({dias} dias)</Text>
        <Text>Monto: {formatear(item.f_monto)}</Text>
        <Text>Balance: {formatear(item.f_balance)}</Text>
      </View>
      <CheckboxDejado
        checked={isChecked}
        setChecked={() => toggleSeleccionFactura(item)}
      />
    </View>
  );
};

  // 5) Si está cargando, mostrar indicador de actividad
  if (loading) {
    return <ActivityIndicator size="large" style={{ flex: 1, justifyContent: 'center' }} />;
  }

  

  return (
    <SafeAreaView style={styles.container}>
      {/* Header con título y cantidad de facturas pendientes */}
      <View style={styles.header}>
        <Text style={styles.title}>Facturas Pendientes</Text>
        <Text style={styles.subtitle}>
          Cliente: ({clienteSeleccionado.f_id}) {clienteSeleccionado.f_nombre}
        </Text>
        <Text style={styles.subtitle}>
          Total pendientes: {cuentas.length}
        </Text>
      </View>

      {/* 6) Listado de facturas */}
      <FlashList
        data={cuentas}
        keyExtractor={item => item.f_documento}
        renderItem={renderItem}
        estimatedItemSize={100}
        extraData={facturasSeleccionadas}
        ListEmptyComponent={<Text style={styles.emptyText}>No hay facturas pendientes</Text>}
      />

      {/* 7) Footer con botón “Confirmar Dejado” */}
      <View style={styles.footer}>
        <Pressable
          onPress={onConfirmarDejado}
          style={({ pressed }) => [
            styles.buttonConfirm,
            pressed ? { opacity: 0.7 } : {},
          ]}
        >
          <Text style={styles.buttonText}>Confirmar Dejado</Text>
          <Text style={styles.buttonTextSmall}>
            ({facturasSeleccionadas.length} seleccionadas)
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fb',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomColor: '#ddd',
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    color: '#555',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#777',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoContainer: {
    marginLeft: 12,
    flex: 1,
  },
  documentoText: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 2,
  },
  footer: {
    padding: 16,
    borderTopColor: '#ddd',
    borderTopWidth: 1,
    backgroundColor: '#fff',
  },
  buttonConfirm: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonTextSmall: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
  },
});

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Pressable,
  Modal,
  Alert,
  TextInput,
  StyleSheet
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { database } from '../src/database/database';
import { Q } from '@nozbe/watermelondb';
import { formatear } from '../assets/formatear';
import { consultaStyles } from '../assets/consultaStyles';
import cargarDevoluciones from '../src/sincronizaciones/cargarDevoluciones';
import { enviarDevoluciones } from '../src/sincronizaciones/enviarDevolucion';
import { printTest } from './funciones/print';
import { rDevoluciones } from './reportes/rDevoluciones';

export default function ConsultaDevoluciones({ navigation }) {
  const [fullDevoluciones, setFullDevoluciones] = useState([]);
  const [devoluciones, setDevoluciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchTextCliente, setSearchTextCliente] = useState('');
  const [clientsList, setClientsList] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [isStartPickerVisible, setIsStartPickerVisible] = useState(false);
  const [isEndPickerVisible, setIsEndPickerVisible] = useState(false);
  const [detalleModalVisible, setDetalleModalVisible] = useState(false);
  const [selectedDevolucion, setSelectedDevolucion] = useState(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleItems, setDetalleItems] = useState([]);
  const [concepts, setConcepts] = useState([]);

  // Parsear fecha dd/mm/yyyy → Date
  const parseDateFromDDMMYYYY = dateStr => {
    const [day, month, year] = dateStr.split('/');
    const d = new Date(year, month - 1, day);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // Abrir modal de detalle y cargar items
  async function openDetalleModal(dev) {
    setSelectedDevolucion(dev);
    setDetalleLoading(true);
    try {
      const items = await database
        .collections.get('t_detalle_factura_dev_pda')
        .query(Q.where('f_documento', dev.f_documento))
        .fetch();
      setDetalleItems(items.map(i => i._raw));
      setDetalleModalVisible(true);
    } catch (err) {
      console.error('Error detalle:', err);
      Alert.alert('Error', 'No se pudo cargar el detalle');
    } finally {
      setDetalleLoading(false);
    }
  }

  // Manejar envío individual
  const handleSend = async dev => {
    if (dev.f_enviado) return;
    setIsSending(true);
    try {
      const detalles = await database
        .collections.get('t_detalle_factura_dev_pda')
        .query(Q.where('f_documento', dev.f_documento))
        .fetch();
      const detallesRaw = detalles.map(d => d._raw);
      await enviarDevoluciones({
        devolucion: dev,
        detalles: detallesRaw,
        navigation,
        setIsSending
      });
    } catch (error) {
      console.error('Error al enviar devolución:', error);
      Alert.alert('Error', 'No se pudo enviar la devolución');
    }
  };



  const imprimirPedidoDesdeLista = async dev => {
    try {
      // Ejemplo de cómo crearlo en tu pantalla de consultaDevoluciones:
      const allProducts = await database
        .collections.get('t_productos_sucursal')
        .query()
        .fetch();
      const productosRaw = allProducts.map(p => p._raw);
      const productosMap = {};
      productosRaw.forEach(p => { productosMap[p.f_referencia] = p; });

      // Y luego al generar el reporte:

      // 1) Traer detalle
      const detalles = await database
        .collections.get('t_detalle_factura_dev_pda')
        .query(Q.where('f_documento', dev.f_documento))
        .fetch();
      const detallesRaw = detalles.map(d => d._raw);

      // 2) Armar mapa de clientes para el encabezado
      const clienteObj = clientsList.find(c => c.f_id === dev.f_cliente);
      const clientesMap = {
        [dev.f_cliente]: { f_nombre: clienteObj?.f_nombre || 'N/A' }
      };

      // 3) Generar texto ESC/POS y enviarlo
      const reporte = rDevoluciones(dev, detallesRaw, clientesMap, productosMap);
      await printTest(reporte);
    } catch (error) {
      console.error('Error al imprimir devolución:', error);
      Alert.alert('Error', 'No se pudo imprimir la devolución');
    }
  };

  // Cargar lista de clientes
  const cargarClientes = async () => {
    try {
      const all = await database
        .collections.get('t_clientes')
        .query()
        .fetch();
      setClientsList(all.map(c => c._raw));
    } catch (err) {
      console.error('Error cargando clientes:', err);
    }
  };

  // Suscribirse a devoluciones locales
  const cargarDatos = async () => {
    try {
      const cols = database.collections.get('t_factura_dev_pda');
      const subscr = cols
        .query()
        .observe()
        .subscribe(all => {
          setFullDevoluciones(all.map(r => r._raw));
          setLoading(false);
        });
      await cargarClientes();
      return () => subscr.unsubscribe();
    } catch (err) {
      console.error('Error cargando devoluciones:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Filtrar por fecha y cliente
  useEffect(() => {
    const normStart = new Date(startDate);
    normStart.setHours(0, 0, 0, 0);
    const normEnd = new Date(endDate);
    normEnd.setHours(23, 59, 59, 999);

    const filtered = fullDevoluciones.filter(d => {
      const fecha = parseDateFromDDMMYYYY(d.f_fecha);
      const inDate = fecha >= normStart && fecha <= normEnd;
      const byClient = selectedClient ? d.f_cliente === selectedClient.f_id : true;
      return inDate && byClient;
    });

    setDevoluciones(filtered);
  }, [fullDevoluciones, startDate, endDate, selectedClient]);

  useEffect(() => {
    (async () => {
      try {
        const rows = await database
          .collections
          .get('t_concepto_devolucion')
          .query()
          .fetch();
        setConcepts(rows.map(r => r._raw));
      } catch (e) {
        console.error('Error cargando conceptos:', e);
      }
    })();
  }, []);

  // Sincronizar con API completo
  const handleSync = async () => {
    if (!selectedClient) {
      Alert.alert('Seleccione un cliente');
      return;
    }
    setLoading(true);
    try {
      await cargarDevoluciones(selectedClient.f_id);
    } catch (err) {
      console.error('Error sincronizando:', err);
      Alert.alert('Error', 'No se pudo sincronizar');
    } finally {
      setLoading(false);
    }
  };

  if (loading || isSending) {
    return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  }

  return (
    <SafeAreaView style={consultaStyles.container}>
      {/* Header */}
      <View style={consultaStyles.headerCard}>
        <View style={consultaStyles.headerRow}>
          <Text style={consultaStyles.headerTitle}>Devoluciones PDA</Text>
          <View style={consultaStyles.headerButtons}>
            <Pressable onPress={handleSync} style={consultaStyles.headerButton}>
              <Ionicons name="sync-outline" size={24} color="#fff" />
            </Pressable>
            <Pressable onPress={() => setShowClientModal(true)} style={consultaStyles.headerButton}>
              <Ionicons name="people-outline" size={24} color="#fff" />
            </Pressable>
            <Pressable onPress={() => navigation.navigate('SelectClientesDev')} style={consultaStyles.headerButton}>
              <Ionicons name="add-circle-outline" size={24} color="#fff" />
            </Pressable>
          </View>
        </View>
        {selectedClient && (
          <View style={consultaStyles.selectedClientCard}>
            <Text style={consultaStyles.selectedClientName}>{selectedClient.f_nombre}</Text>
            <Pressable onPress={() => setSelectedClient(null)} style={consultaStyles.selectedClientClear}>
              <Ionicons name="close-circle" size={20} color="#333" />
            </Pressable>
          </View>
        )}
      </View>

      {/* Filtros */}
      <View style={consultaStyles.filterCard}>
        <Pressable onPress={() => setIsStartPickerVisible(true)} style={consultaStyles.dateButton}>
          <Text>Desde: {startDate.toLocaleDateString('es-ES')}</Text>
        </Pressable>
        <Pressable onPress={() => setIsEndPickerVisible(true)} style={consultaStyles.dateButton}>
          <Text>Hasta: {endDate.toLocaleDateString('es-ES')}</Text>
        </Pressable>
      </View>
      <DateTimePickerModal
        isVisible={isStartPickerVisible}
        mode="date"
        locale="es_ES"
        onConfirm={date => { setStartDate(date); setIsStartPickerVisible(false); }}
        onCancel={() => setIsStartPickerVisible(false)}
      />
      <DateTimePickerModal
        isVisible={isEndPickerVisible}
        mode="date"
        locale="es_ES"
        onConfirm={date => { setEndDate(date); setIsEndPickerVisible(false); }}
        onCancel={() => setIsEndPickerVisible(false)}
      />

      {/* Lista de devoluciones */}
      <FlatList
        data={devoluciones}
        keyExtractor={item => item.f_documento}
        renderItem={({ item }) => (
          <View style={consultaStyles.pedidoCard}>
            <View style={consultaStyles.pedidoInfoSection}>

              <View style={{ flex: 1 }}>
                <Text style={consultaStyles.pedidoText}>Dev.: {item.f_documento}</Text>
                <Text style={consultaStyles.pedidoText}>Factura: {item.f_pedido}</Text>
                <Text style={consultaStyles.pedidoText}>Fecha: {item.f_fecha}</Text>
                <Text style={consultaStyles.pedidoText}>Total: {formatear(item.f_monto)}</Text>
                <Text style={consultaStyles.pedidoText}>Enviado: {item.f_enviado ? 'Sí' : 'No'}</Text>
              </View>
              <View style={consultaStyles.pedidoButtonColumn}>
                <Pressable onPress={() => openDetalleModal(item)} style={consultaStyles.pedidoSmallButton}>
                  <Ionicons name="eye-outline" size={23} color="#fff" />
                </Pressable>
                <Pressable onPress={() => imprimirPedidoDesdeLista(item)}
                  style={consultaStyles.pedidoSmallButton}
                >
                  <Ionicons name="print-outline" size={23} color="#fff" />
                </Pressable>
                {!item.f_enviado && (
                  <Pressable onPress={() => handleSend(item)} style={consultaStyles.pedidoSmallButton}>
                    <Ionicons name="send-outline" size={23} color="#fff" />
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        )}
      />

      {/* Modal seleccionar cliente */}
      <Modal visible={showClientModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar cliente..."
              value={searchTextCliente}
              onChangeText={setSearchTextCliente}
            />
            <Pressable onPress={() => setShowClientModal(false)} style={styles.closeModal}>
              <Text style={styles.buttonText}>Cerrar</Text>
            </Pressable>
            <FlatList
              data={clientsList.filter(c =>
                c.f_nombre.toLowerCase().includes(searchTextCliente.toLowerCase())
              )}
              keyExtractor={c => c.f_id}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedClient(item);
                    setShowClientModal(false);
                  }}
                >
                  <Text>({item.f_id}) {item.f_nombre}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Modal detalle devolucion */}
      <Modal visible={detalleModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Detalle Devolución {selectedDevolucion?.f_documento}</Text>

            <Text>Concepto: {concepts.find(c => c.f_id === selectedDevolucion?.f_concepto)?.f_concepto}</Text>
            <Text style={consultaStyles.pedidoText}>Nota: {selectedDevolucion?.f_observacion}</Text>
            {detalleLoading ? (
              <ActivityIndicator size="large" />
            ) : (
              <FlatList
                data={detalleItems}
                keyExtractor={(d, i) => i.toString()}
                renderItem={({ item }) => (
                  <View style={{ marginBottom: 8 }}>
                    <Text style={consultaStyles.pedidoText}>Ref: {item.f_referencia}</Text>
                    <Text style={consultaStyles.pedidoText}>Cant: {item.f_cantidad}</Text>
                    <Text style={consultaStyles.pedidoText}>Precio: {formatear(item.f_precio)}</Text>
                    <Text style={consultaStyles.pedidoText}>Itbis: {formatear(item.f_itbis)}</Text>
                  </View>
                )}
              />
            )}
            <View style={{ justifyContent: 'space-between', borderWidth: 1, borderColor: '#ddd', padding: 8 }}>
              <Text style={consultaStyles.pedidoText}>
                Monto bruto: {formatear(selectedDevolucion?.f_monto_bruto)}
              </Text>
              <Text style={consultaStyles.pedidoText}>
                ITBIS: {formatear(selectedDevolucion?.f_itbis)}
              </Text>
              <Text style={consultaStyles.pedidoText}>
                Descuento: {formatear(selectedDevolucion?.f_descuento_transp)} desc2: {formatear(selectedDevolucion?.f_descuento_nc)}
              </Text>
              <Text style={consultaStyles.pedidoText}>
                Monto Descuento: {formatear(selectedDevolucion?.f_descuento)}
              </Text>
              <Text style={consultaStyles.pedidoText}>
                Total: {formatear(selectedDevolucion?.f_monto)}
              </Text>
            </View>
            <Pressable onPress={() => setDetalleModalVisible(false)} style={styles.closeModal}>
              <Text style={styles.buttonText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', maxHeight: '80%', backgroundColor: '#fff', borderRadius: 8, padding: 16 },
  searchInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 8, marginBottom: 12 },
  closeModal: { marginVertical: 8, alignItems: 'center' },
  buttonText: { color: '#007AFF', fontSize: 16 },
  modalItem: { paddingVertical: 8, borderBottomWidth: 1, borderColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 }
});

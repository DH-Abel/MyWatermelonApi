// ConsultaDejadosFactura.js
import React, { useEffect, useState,useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Pressable,
  Modal,
  Alert,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { database } from '../src/database/database';
import { formatear } from '../assets/formatear';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Q } from '@nozbe/watermelondb';
import { printTest, checkPrinterAvailability } from './funciones/print';
import { rDejado } from './reportes/rDejado';

// Estilos similares a consultaRecibos, adaptados
const consultaStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fb' },
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    margin: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { color: 'black', fontSize: 18, fontWeight: 'bold' },
  headerButtons: { flexDirection: 'row' },
  headerButton: {
    marginLeft: 12,
    padding: 6,
  },
  selectedClientCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedClientName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  selectedClientClear: { padding: 4 },
  filterCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  dateButton: {
    flex: 1,
    backgroundColor: '#e0e5ee',
    padding: 10,
    borderRadius: 6,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  dateText: { fontSize: 14, color: '#333' },
  pedidoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  pedidoTitleSection: { flexDirection: 'row', justifyContent: 'space-between' },
  pedidoTitle: { fontSize: 16, fontWeight: 'bold', color: '#222' },
  pedidoInfoSection: { marginTop: 6 },
  pedidoText: { fontSize: 14, color: '#555', marginVertical: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '85%',
    maxHeight: '80%',
    borderRadius: 8,
    padding: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#333' },
  modalItem: { fontSize: 14, paddingVertical: 8, color: '#333' },
  closeModal: {
    backgroundColor: '#007AFF',
    marginTop: 12,
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});

export default function ConsultaDejadosFactura({ navigation }) {
  // 1. Estado y filtros
  const [fullDejados, setFullDejados] = useState([]); // Registros crudos de t_dejar_factura_pda
  const [dejados, setDejados] = useState([]); // Filtrados
  const [loading, setLoading] = useState(true);

  // Filtros por fecha (inicializados en hoy)
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [isStartPickerVisible, setIsStartPickerVisible] = useState(false);
  const [isEndPickerVisible, setIsEndPickerVisible] = useState(false);

  // Filtro por cliente
  const [clientsList, setClientsList] = useState([]);
  const [clientesMap, setClientesMap] = useState({});
  const [searchTextCliente, setSearchTextCliente] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [showClientModal, setShowClientModal] = useState(false);


  const imprimirDejado = async (dejadoRecord) => {
    console.log('▶️ imprimirDejado invocado para:', dejadoRecord.f_documento);
    const record = dejadoRecord._raw || dejadoRecord;

    const detalleRows = await database
      .collections.get('t_det_dejar_factura_pda')
      .query(Q.where('f_documento', record.f_documento))
      .fetch();
    console.log('🧾 detalleRows.length =', detalleRows.length);

    const detallesSimple = detalleRows.map(d => ({
      factura: d.f_factura || d._raw?.f_factura, 
      fecha: d._raw.f_fecha,
      monto: d._raw.f_monto,
      balance: d._raw.f_balance,
    }));

    // ————— Aquí envolvemos rDejado en try/catch —————
    let ticket;
    try {
      
  console.log('🔍> Entrando a imprimirDejado, record:', record);
  console.log('🔍> record.f_vendedor:', record.f_vendedor);
      ticket = rDejado(record, detallesSimple, clientesMap);
      console.log('📄 Ticket generado:\n', ticket);
    } catch (error) {
      console.error('🚨 Error al invocar rDejado:', error);
      // Detener ejecución: no seguimos al printTest si falla rDejado
      return;
    }

    try {
      console.log('🔎 Antes de checkPrinterAvailability');
      const disponible = await checkPrinterAvailability();
      console.log('🖨️ Impresora disponible:', disponible);
      if (!disponible) return;

      console.log('✴️ Intentando conectar e imprimir...');
      await printTest(ticket);
      console.log('✅ printTest resolvió correctamente');
    } catch (err) {
      console.error('❌ Error en printTest o checkPrinterAvailability:', err);
    }
  };



  // 2. Funciones para cargar datos

  // Cargar todos los “dejados” y sus detalles de cliente
  const cargarDejados = async () => {
    setLoading(true);
    try {
      // Subscribirse a cambios en t_dejar_factura_pda
      const col = database.collections.get('t_dejar_factura_pda');
      const subscr = col.query().observe().subscribe(all => {
        setFullDejados(all);
        setLoading(false);
      });
      // Cargar clientes para filtro
      await cargarClientes();
      return () => subscr.unsubscribe();
    } catch (err) {
      console.error('Error cargando dejados:', err);
      setLoading(false);
    }
  };

  // Cargar lista y mapa de clientes
  const cargarClientes = async () => {
    try {
      const cols = database.collections.get('t_clientes');
      const all = await cols.query().fetch();
      const map = {};
      all.forEach(c => {
        map[c.f_id] = c._raw;
      });
      setClientesMap(map);
      setClientsList(all.map(c => c._raw));
    } catch (err) {
      console.error('Error cargando clientes:', err);
    }
  };

  // Llenar clientesMap para usarlo en rDejado al imprimir
  useEffect(() => {
    (async () => {
      try {
        const allClients = await database.collections.get('t_clientes').query().fetch();
        const map = {};
        allClients.forEach(c => (map[c.f_id] = c._raw));
        setClientesMap(map);
      } catch (err) {
        console.error('Error cargando clientes para impresión:', err);
      }
    })();
  }, []);

  // 3. Filtrado por fecha y cliente
  useEffect(() => {
    if (!fullDejados) return;
    // Normalizar horas al inicio y fin de día
    const normStart = new Date(startDate);
    normStart.setHours(0, 0, 0, 0);
    const normEnd = new Date(endDate);
    normEnd.setHours(23, 59, 59, 999);

    const filtered = fullDejados.filter(r => {
      // r.f_fecha viene en 'dd/mm/yyyy'
      const [dd, mm, yyyy] = r.f_fecha.split('/');
      const fechaObj = new Date(+yyyy, +mm - 1, +dd);
      fechaObj.setHours(0, 0, 0, 0);
      const inDate = fechaObj >= normStart && fechaObj <= normEnd;
      const inClient = selectedClient ? r.f_cliente === selectedClient.f_id : true;
      return inDate && inClient;
    });
    setDejados(filtered);
  }, [fullDejados, startDate, endDate, selectedClient]);

  // 4. Iniciar carga al montar
  useEffect(() => {
    const unsub = cargarDejados();
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // 5. Funciones auxiliares de modal de cliente
  const filteredClientsList = clientsList.filter(c =>
    c.f_nombre.toLowerCase().includes(searchTextCliente.toLowerCase()) ||
    c.f_id.toString().toLowerCase().includes(searchTextCliente.toLowerCase())
  );

  // 6. Renderizado de cada fila de “dejado”
  const renderDejado = ({ item }) => {
    // Obtener datos del cliente (nombre) desde el mapa
    const clienteRaw = clientesMap[item.f_cliente] || {};
    return (
      <View style={consultaStyles.pedidoCard}>
        <View style={consultaStyles.pedidoTitleSection}>
          <Text style={consultaStyles.pedidoTitle}>
            Documento: {item.f_documento}
          </Text>
        </View>
        <Text style={consultaStyles.pedidoTitle}>
          Cliente: {clienteRaw.f_nombre || item.f_cliente}
        </Text>
        <View style={consultaStyles.pedidoInfoSection}>
          <Text style={consultaStyles.pedidoText}>Fecha: {item.f_fecha}</Text>
          <Text style={consultaStyles.pedidoText}>
            Monto Total: {formatear(item.f_monto)}
          </Text>
          <Text style={consultaStyles.pedidoText}>
            Balance Total: {formatear(item.f_balance)}
          </Text>
          <Text style={consultaStyles.pedidoText}>
            Observación: {item.f_observacion || '-'}
          </Text>
        </View>
        <View style={{ position: 'absolute', top: 12, right: 12 }}>
          <Pressable onPress={() => imprimirDejado(item)}>
            <Ionicons name="print-outline" size={24} color="#007AFF" />
          </Pressable>
        </View>
      </View>
    );
  };

  // 7. Si está cargando, indicador
  if (loading) {
    return (
      <ActivityIndicator
        size="large"
        style={{ flex: 1, justifyContent: 'center' }}
      />
    );
  }

  return (
    <SafeAreaView style={consultaStyles.container}>
      {/* Header con título y botones */}
      <View style={consultaStyles.headerCard}>
        <View style={consultaStyles.headerRow}>
          <Text style={consultaStyles.headerTitle}>Dejados de Factura</Text>
          <View style={consultaStyles.headerButtons}>
            {/* Sincronizar (recargar lista) */}
            <Pressable onPress={cargarDejados} style={consultaStyles.headerButton}>
              <Ionicons name="sync-outline" size={24} color="black" />
            </Pressable>
            {/* Abrir modal para filtrar por cliente */}
            <Pressable
              onPress={() => setShowClientModal(true)}
              style={consultaStyles.headerButton}
            >
              <Ionicons name="people-outline" size={24} color="black" />
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('SelectClientesDejarFactura')}
              style={consultaStyles.headerButton}
            >
              <Ionicons name="add-circle-outline" size={24} color="black" />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Si hay cliente seleccionado, mostrar tarjeta con su nombre y botón para limpiar */}
      {selectedClient && (
        <View style={consultaStyles.selectedClientCard}>
          <Text style={consultaStyles.selectedClientName}>
            {selectedClient.f_nombre}
          </Text>
          <Pressable
            onPress={() => {
              setSelectedClient(null);
              setSearchTextCliente('');
            }}
            style={consultaStyles.selectedClientClear}
          >
            <Ionicons name="close-circle-outline" size={24} color="#333" />
          </Pressable>
        </View>
      )}

      {/* Filtros de Fecha */}
      <View style={consultaStyles.filterCard}>
        <Pressable
          onPress={() => setIsStartPickerVisible(true)}
          style={consultaStyles.dateButton}
        >
          <Text style={consultaStyles.dateText}>
            {startDate.toLocaleDateString('en-GB')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setIsEndPickerVisible(true)}
          style={consultaStyles.dateButton}
        >
          <Text style={consultaStyles.dateText}>
            {endDate.toLocaleDateString('en-GB')}
          </Text>
        </Pressable>
      </View>

      {/* DatePicker para fecha inicio */}
      <DateTimePickerModal
        isVisible={isStartPickerVisible}
        mode="date"
        onConfirm={date => {
          setStartDate(date);
          setIsStartPickerVisible(false);
        }}
        onCancel={() => setIsStartPickerVisible(false)}
      />
      {/* DatePicker para fecha fin */}
      <DateTimePickerModal
        isVisible={isEndPickerVisible}
        mode="date"
        onConfirm={date => {
          setEndDate(date);
          setIsEndPickerVisible(false);
        }}
        onCancel={() => setIsEndPickerVisible(false)}
      />

      {/* Listado de “dejados” filtrados */}
      <FlatList
        data={dejados
          .slice() // crear copia para ordenar
          .sort((a, b) => {
            // Ordenar descendente por fecha (convierte 'dd/mm/yyyy' a Date)
            const [dda, mma, yya] = a.f_fecha.split('/');
            const [ddb, mmb, yyb] = b.f_fecha.split('/');
            const fechaA = new Date(+yya, +mma - 1, +dda);
            const fechaB = new Date(+yyb, +mmb - 1, +ddb);
            return fechaB.getTime() - fechaA.getTime();
          })
        }
        keyExtractor={item => item.f_documento}
        renderItem={renderDejado}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 20, color: '#777' }}>
            No hay registros de “dejados” para estos filtros.
          </Text>
        }
      />

      {/* Modal para selección de cliente */}
      <Modal visible={showClientModal} transparent animationType="fade">
        <View style={consultaStyles.modalOverlay}>
          <View style={consultaStyles.modalContent}>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 8,
                padding: 8,
                marginBottom: 12,
              }}
              placeholder="Buscar cliente..."
              value={searchTextCliente}
              onChangeText={setSearchTextCliente}
            />
            <Text style={consultaStyles.modalTitle}>Seleccione Cliente</Text>
            <FlatList
              data={filteredClientsList}
              keyExtractor={c => c.f_id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedClient(item);
                    setShowClientModal(false);
                  }}
                >
                  <Text style={consultaStyles.modalItem}>
                    ({item.f_id}) {item.f_nombre}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <Pressable
              onPress={() => setShowClientModal(false)}
              style={consultaStyles.closeModal}
            >
              <Text style={consultaStyles.buttonText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

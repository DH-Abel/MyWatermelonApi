import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Modal
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Picker } from '@react-native-picker/picker';
import { database } from '../src/database/database';
import { Q } from '@nozbe/watermelondb';
import cargarDevoluciones from '../src/sincronizaciones/cargarDevoluciones';
import { formatear } from '../assets/formatear';
import { useNavigation } from '@react-navigation/native';

export default function Devoluciones({ clienteSeleccionado }) {
  const navigation = useNavigation();

  // Invoice states
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [searchInvoice, setSearchInvoice] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Loaded data cache per invoice
  const [detailsMap, setDetailsMap] = useState({});
  const [motives, setMotives] = useState([]);
  const [selectedMotivo, setSelectedMotivo] = useState(null);

  // Current selection
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [toReturn, setToReturn] = useState({});

  // Loading flags
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const formatDMY = date => date.toLocaleDateString('es-ES');

  // Load motives once
  useEffect(() => {
    (async () => {
      const rows = await database.collections
        .get('t_concepto_devolucion')
        .query()
        .fetch();
      const list = rows.map(r => r._raw);
      setMotives(list);
      if (list.length) setSelectedMotivo(list[0].f_id);
    })();
  }, []);

  // Sync and load invoices when client changes
  useEffect(() => {
    if (clienteSeleccionado?.f_id) loadInvoices();
    else {
      setInvoices([]);
      setFilteredInvoices([]);
      setDetailsMap({});
      setSelectedInvoice(null);
      setToReturn({});
    }
  }, [clienteSeleccionado]);

  // Load invoices and clear previous detailsMap
  const loadInvoices = async () => {
    setLoadingInvoices(true);
    try {
      await cargarDevoluciones(clienteSeleccionado.f_id);
      const invRows = await database.collections
        .get('t_factura')
        .query(Q.where('f_cliente', clienteSeleccionado.f_id))
        .fetch();
      const invs = invRows.map(r => r._raw);
      setInvoices(invs);
      setFilteredInvoices(invs);
      setDetailsMap({});
      setSelectedInvoice(null);
      setToReturn({});
    } catch (err) {
      console.error('Error loading invoices:', err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  // Filter invoices by date and search
  useEffect(() => {
    const s = new Date(startDate); s.setHours(0, 0, 0, 0);
    const e = new Date(endDate); e.setHours(23, 59, 59, 999);
    const filtered = invoices.filter(inv => {
      const d = new Date(inv.f_fecha);
      return d >= s && d <= e && inv.f_documento.includes(searchInvoice);
    });
    setFilteredInvoices(filtered);
    // preload details for filtered
    preloadDetails(filtered.map(i => i.f_documento));
    if (selectedInvoice && !filtered.find(i => i.f_documento === selectedInvoice.f_documento)) {
      setSelectedInvoice(null);
      setToReturn({});
    }
  }, [invoices, startDate, endDate, searchInvoice]);

  // Preload details only for given documentos
  // Preload details only for given documentos
  // Preload details only for given documentos
  const preloadDetails = async (docIDs) => {
    setLoadingDetails(true);
    try {
      if (!docIDs.length) {
        setDetailsMap({});
        return;
      }
      // Traer filas de detalle y devoluciones locales
      const detRows = await database.collections
        .get('t_detalle_factura')
        .query(Q.where('f_documento', Q.oneOf(docIDs)))
        .fetch();
      const devRows = await database.collections
        .get('t_detalle_factura_dev_pda')
        .query(Q.where('f_documento', Q.oneOf(docIDs)))
        .fetch();
      const prodRows = await database.collections
        .get('t_productos_sucursal')
        .query()
        .fetch();

      // Mapas auxiliares
      const prodMap = new Map(
        prodRows.map(p => [p._raw.f_referencia, p._raw.f_descripcion])
      );
      const retMap = {};
      devRows.forEach(d => {
        const key = `${d._raw.f_documento}_${d._raw.f_referencia}`;
        retMap[key] = (retMap[key] || 0) + d._raw.f_qty_devuelta;
      });

      // Agrupar por documento y referencia, eliminando duplicados
      const groupMap = {};
      detRows.forEach(d => {
        const raw = d._raw;
        const doc = raw.f_documento;
        const ref = raw.f_referencia;
        const key = `${doc}_${ref}`;
        const enriched = {
          ...raw,
          descripcion: prodMap.get(ref) || '',
          qty_dev: retMap[key] || 0
        };
        if (!groupMap[doc]) groupMap[doc] = new Map();
        groupMap[doc].set(ref, enriched);
      });

      // Convertir cada Map a array
      const group = {};
      Object.entries(groupMap).forEach(([doc, map]) => {
        group[doc] = Array.from(map.values());
      });

      setDetailsMap(group);
    } catch (err) {
      console.error('Error preloading details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };


  // Select invoice quickly
  const onSelectInvoice = invoice => {
    setSelectedInvoice(invoice);
    setShowModal(false);
    setToReturn({});
  };

  const onChangeReturn = (item, val) => {
    const key = `${item.f_documento}_${item.f_referencia}`;
    let qty = parseInt(val, 10) || 0;
    const max = item.f_cantidad - item.qty_dev;
    if (qty < 0) qty = 0;
    if (qty > max) qty = max;
    setToReturn(prev => ({ ...prev, [key]: qty }));
  };

  // Confirm return
  const confirmReturn = async () => {
    setShowModal(false);
    const items = detailsMap[selectedInvoice.f_documento] || [];
    await database.write(async () => {
      const head = await database.collections
        .get('t_factura_dev_pda')
        .create(r => {
          r.f_documento = `DEV${Date.now()}`;
          r.f_pedido = selectedInvoice.f_documento;
          r.f_cliente = selectedInvoice.f_cliente;
          r.f_fecha = formatDMY(new Date());
          let total = 0;
          items.forEach(item => {
            const key = `${item.f_documento}_${item.f_referencia}`;
            const qty = toReturn[key] || 0;
            const dias = Math.floor((Date.now() - new Date(item.f_fecha)) / (1000 * 60 * 60 * 24));
            const itbs = dias <= 30 ? item.f_itbs : 0;
            total += qty * (item.f_precio + itbs);
          });
          r.f_monto = total;
          r.f_enviado = false;
          r.f_concepto = selectedMotivo;
        });
      items.forEach(item => {
        const key = `${item.f_documento}_${item.f_referencia}`;
        const qty = toReturn[key] || 0;
        if (qty > 0) {
          database.collections
            .get('t_detalle_factura_dev_pda')
            .create(dd => {
              dd.f_documento = head.f_documento;
              dd.f_referencia = item.f_referencia;
              dd.f_cantidad = item.f_cantidad;
              dd.f_precio = item.f_precio;
              dd.f_itbs = item.f_itbs;
              dd.f_qty_devuelta = qty;
              dd.f_concepto = selectedMotivo;
              dd.f_nota = '';
            });
        }
      });
    });
    navigation.navigate('ConsultaDevoluciones');
  };

  if (loadingInvoices) return <ActivityIndicator style={{ flex: 1 }} size="large" />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.halfContainer}>
        <Text style={styles.sectionTitle}>Facturas</Text>
        <View style={styles.filterRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar factura..."
            value={searchInvoice}
            onChangeText={setSearchInvoice}
          />
          <Pressable onPress={() => setShowStartPicker(true)} style={styles.dateButton}>
            <Text>Desde: {formatDMY(startDate)}</Text>
          </Pressable>
          <Pressable onPress={() => setShowEndPicker(true)} style={styles.dateButton}>
            <Text>Hasta: {formatDMY(endDate)}</Text>
          </Pressable>
        </View>
        <DateTimePickerModal
          isVisible={showStartPicker}
          mode="date"
          onConfirm={d => { setStartDate(d); setShowStartPicker(false); }}
          onCancel={() => setShowStartPicker(false)}
        />
        <DateTimePickerModal
          isVisible={showEndPicker}
          mode="date"
          onConfirm={d => { setEndDate(d); setShowEndPicker(false); }}
          onCancel={() => setShowEndPicker(false)}
        />
        <FlatList
          data={filteredInvoices}
          keyExtractor={i => i.f_documento}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.item, item.f_documento === selectedInvoice?.f_documento && styles.itemSelected]}
              onPress={() => onSelectInvoice(item)}
            >
              <Text style={styles.itemText}>{item.f_documento} - Monto: {formatear(item.f_monto)}</Text>
              <Text style={styles.itemSub}>{formatDMY(new Date(item.f_fecha))}</Text>
            </Pressable>
          )}
        />
      </View>
      <View style={styles.halfContainer}>
        <Text style={styles.sectionTitle}>Productos</Text>
        {loadingDetails && <Text style={styles.loadingText}>Cargando productos...</Text>}
        {!loadingDetails && (selectedInvoice ? (
          <FlatList
            data={detailsMap[selectedInvoice.f_documento] || []}
            keyExtractor={d => `${d.f_documento}_${d.f_referencia}`}
            renderItem={({ item }) => (
              <SafeAreaView>
                <View style={styles.detailRow}>
                  <Text style={styles.detailText}>{item.descripcion}</Text>
                <Text style={styles.detailSub}>({item.f_referencia}) {item.f_referencia_suplidor}</Text>
                  <Text style={styles.detailSub}>Cant: {item.f_cantidad - item.qty_dev}</Text>

                </View>
              </SafeAreaView>
            )}
          // ListFooterComponent={() => (
          //   <View style={styles.detailRow}>
          //     <Text style={styles.detailText}>Total:</Text>
          //     <Text style={styles.detailSub}>{selectedInvoice.f_monto}</Text>
          //   </View>
          // )}
          />
        ) : (
          <Text style={styles.emptyText}>Seleccione una factura</Text>
        ))}
        <Pressable onPress={() => setShowModal(true)} style={styles.selectButton} disabled={!selectedInvoice}>
          <Text style={styles.selectButtonText}>Seleccionar Productos a Devolver</Text>
        </Pressable>
      </View>
      <Modal visible={showModal} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Detalle de Devolución</Text>
          <FlatList
            data={detailsMap[selectedInvoice?.f_documento] || []}
            keyExtractor={d => `${d.f_documento}_${d.f_referencia}`}
            renderItem={({ item }) => {
              const key = `${item.f_documento}_${item.f_referencia}`;
              return <View style={styles.detailRow}>
                <Text style={styles.detailText}>{item.descripcion}</Text>
                <TextInput
                  style={styles.input}
                  value={(toReturn[key] || '').toString()}
                  onChangeText={val => onChangeReturn(item, val)}
                  keyboardType="numeric"
                />
              </View>;
            }}
          />
          <Picker selectedValue={selectedMotivo} onValueChange={setSelectedMotivo} style={styles.picker}>
            {motives.map(m => <Picker.Item key={m.f_id} label={m.f_concepto} value={m.f_id} />)}
          </Picker>
          <Pressable onPress={confirmReturn} style={styles.footerButton}><Text style={styles.footerText}>Registrar Devolución</Text></Pressable>
          <Pressable onPress={() => setShowModal(false)} style={styles.cancelButton}><Text>Cancelar</Text></Pressable>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  halfContainer: { flex: 1, borderBottomWidth: 1, borderColor: '#ccc' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', padding: 8, backgroundColor: '#f0f0f0' },
  filterRow: { flexDirection: 'row', padding: 8 },
  searchInput: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 4, marginRight: 8 },
  dateButton: { padding: 6, borderWidth: 1, borderColor: '#ccc', borderRadius: 4, marginLeft: 4 },
  item: { padding: 8, borderBottomWidth: 1, borderColor: '#eee' },
  itemSelected: { backgroundColor: '#d0e8ff' },
  itemText: { fontSize: 14, fontWeight: '600' },
  itemSub: { fontSize: 12, color: '#555' },
  detailRow: { flexDirection: 'row', alignItems: 'center', padding: 8, borderBottomWidth: 1, borderColor: '#eee' },
  detailText: { flex: 1, fontSize: 14 },
  detailSub: { fontSize: 12, color: '#555', marginLeft: 8 },
  loadingText: { textAlign: 'center', padding: 8 },
  selectButton: { padding: 12, backgroundColor: '#4682B4', alignItems: 'center', margin: 8, borderRadius: 4 },
  selectButtonText: { color: '#fff', fontSize: 16 },
  emptyText: { padding: 16, textAlign: 'center', color: '#666' },
  modalContainer: { flex: 1, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  input: { width: 60, borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 4 },
  picker: { marginVertical: 8 },
  footerButton: { padding: 12, backgroundColor: '#4682B4', alignItems: 'center', borderRadius: 4, marginVertical: 8 },
  footerText: { color: '#fff', fontSize: 16 },
  cancelButton: { padding: 12, alignItems: 'center' }
});

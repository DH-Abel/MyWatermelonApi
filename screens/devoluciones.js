import React, { useState, useEffect, useMemo, useContext } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Modal, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Platform, Alert
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Picker } from '@react-native-picker/picker';
import { database } from '../src/database/database';
import { Q } from '@nozbe/watermelondb';
import { useNavigation } from '@react-navigation/native';
import debounce from 'lodash.debounce';
import cargarDevoluciones from '../src/sincronizaciones/cargarDevoluciones';
import { formatear } from '../assets/formatear';
import ModalDetalleDevolucion from './modal/detalleDevolucion'
import { enviarDevoluciones } from '../src/sincronizaciones/enviarDevolucion';
import { printTest } from './funciones/print'
import { rDevoluciones } from './reportes/rDevoluciones';
import { AuthContext } from './context/AuthContext';

export default function Devoluciones({ clienteSeleccionado }) {
  const navigation = useNavigation();

  const { user } = useContext(AuthContext); //usuario logueado
  

  // Invoice states
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [searchInvoice, setSearchInvoice] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Loaded data cache per invoice
  const [detailsMap, setDetailsMap] = useState({});
  const [motives, setMotives] = useState([]);
  const [selectedMotivo, setSelectedMotivo] = useState(null);

  // Current selection
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [clienteName, setClienteName] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [toReturn, setToReturn] = useState({});

  // Loading flags
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [observacion, setObservacion] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Totales de devolución: calcula días y aplica ITBIS solo si ≤30 días
  const summary = useMemo(() => {
    const items = detailsMap[selectedInvoice?.f_documento] || [];
    let totalItbis = 0;
    let totalBruto = 0;
    // Un solo cálculo de días desde la fecha de la factura
    const diasFactura = selectedInvoice
      ? Math.floor(
        (Date.now() - new Date(selectedInvoice.f_fecha).getTime()) /
        (1000 * 60 * 60 * 24)
      )
      : 0;
    items.forEach(item => {
      const key = `${item.f_documento}_${item.f_referencia}_${item.f_cantidad}`;
      const qty = toReturn[key] || 0;
      totalBruto += qty * item.f_precio;
      // Solo suma ITBIS si la factura tiene 30 días o menos
      totalItbis += (diasFactura <= 30 ? item.f_itbis * qty : 0);
    });
    const descTransp = selectedInvoice?.f_descuento_transp || 0;
    const descNc = selectedInvoice?.f_descuento_nc || 0;
    const totalDescuento = totalBruto * ((descTransp + descNc) / 100);
    return { totalItbis, totalBruto, totalDescuento };
  }, [toReturn, detailsMap, selectedInvoice]);

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
    })();
  }, []);

  // Sync and load invoices when client changes
  useEffect(() => {
    if (clienteSeleccionado?.f_id) loadInvoices();
    else {
      setSearchText('');
      setSearchInvoice('');
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
      return (d >= s && d <= e) || inv.f_nodoc.toString().includes(searchInvoice);
    });
    setFilteredInvoices(filtered);
    // preload details for filtered
    preloadDetails(filtered.map(i => i.f_documento));
    if (selectedInvoice && !filtered.find(i => i.f_documento === selectedInvoice.f_documento)) {
      setSelectedInvoice(null);
      setToReturn({});
    }
  }, [invoices, startDate, endDate, searchInvoice]);

  // Debounce para la búsqueda
  const debouncedSearch = useMemo(
    () => debounce(val => setSearchInvoice(val), 700),
    []
  );
  useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);

  useEffect(() => {
    console.log('FACTURA SELECCIONADA:' + selectedInvoice?.f_fecha);
  }), [summary]

  // 2) Carga el nombre del cliente desde la tabla t_clientes cuando cambie clienteSeleccionado:
  useEffect(() => {
    (async () => {
      if (clienteSeleccionado?.f_id) {
        const rows = await database.collections
          .get('t_clientes')
          .query(Q.where('f_id', clienteSeleccionado.f_id))
          .fetch();
        if (rows.length) setClienteName(rows[0]._raw.f_nombre);
      }
    })();
  }, [clienteSeleccionado]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);


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
        prodRows.map(p => [p._raw.f_referencia, p._raw])
      );
      const retMap = {};
      devRows.forEach(d => {
        const key = `${d._raw.f_documento}_${d._raw.f_referencia}`;
        retMap[key] = (retMap[key] || 0) + d._raw.f_qty_devuelta;
      });

      // Agrupar por documento y referencia, eliminando duplicados
      // Agrupar y deduplicar por documento+referencia+cantidad
      const groupMap = {};
      detRows.forEach(d => {
        const raw = d._raw;
        const doc = raw.f_documento;
        const compKey = `${raw.f_documento}_${raw.f_referencia}_${raw.f_cantidad}`;
        const enriched = {
          ...raw,
          descripcion: prodMap.get(raw.f_referencia)?.f_descripcion || '',
          referencia_suplidor: prodMap.get(raw.f_referencia)?.f_referencia_suplidor || '',
          qty_dev: retMap[`${raw.f_documento}_${raw.f_referencia}`] || 0
        };
        if (!groupMap[doc]) groupMap[doc] = new Map();
        groupMap[doc].set(compKey, enriched);
      });
      // Convertir cada Map a array único
      const group = {};
      Object.entries(groupMap).forEach(([doc, m]) => {
        group[doc] = Array.from(m.values());
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
    const key = `${item.f_documento}_${item.f_referencia}_${item.f_cantidad}`;
    let qty = parseInt(val, 10) || 0;
    const max = item.f_cantidad - item.qty_dev;
    if (qty < 0) qty = 0;
    if (qty > max) qty = max;
    setToReturn(prev => ({ ...prev, [key]: qty }));
  };
  // Confirm return
  const confirmReturn = async () => {
    if (!selectedMotivo) {
      Alert.alert('Atención', 'Debe seleccionar un motivo antes de registrar.');
      return;
    }
    //setShowModal(false);

    let headDocument;
    // 1) Guardar localmente
    
    const { tipodoc, nodoc } = await getNextReciboSequence(user);
    const id = String(nodoc);
    const documento = `${tipodoc}${(id).padStart(6, '0')}`;

    await database.write(async () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const head = await database.collections
        .get('t_factura_dev_pda')
        .create(r => {
          r.f_documento = documento;
          r.f_tipodoc = tipodoc;
          r.f_nodoc = nodoc;
          r.f_vendedor = clienteSeleccionado.f_vendedor
          r.f_pedido = selectedInvoice.f_documento;
          r.f_cliente = selectedInvoice.f_cliente;
          r.f_fecha = formatDMY(new Date());
          r.f_descuento_transp = selectedInvoice.f_descuento_transp || 0;
          r.f_descuento_nc = selectedInvoice.f_descuento_nc || 0;
          r.f_descuento2 = summary.totalDescuento;
          r.f_monto_bruto = summary.totalBruto;
          r.f_itbis = summary.totalItbis;
          r.f_monto = summary.totalBruto + summary.totalItbis - summary.totalDescuento;
          r.f_enviado = false;
          r.f_concepto = selectedMotivo;
          r.f_observacion = observacion;
          // guardamos el objeto _raw para el envío
        });
      headDocument = head._raw;

      // detalle
      for (const item of detailsMap[selectedInvoice.f_documento] || []) {
        const key = `${item.f_documento}_${item.f_referencia}_${item.f_cantidad}`;
        const qty = toReturn[key] || 0;
        if (qty > 0) {
          await database.collections
            .get('t_detalle_factura_dev_pda')
            .create(dd => {
              dd.f_documento = headDocument.f_documento;
              dd.f_referencia = item.f_referencia;
              dd.f_cantidad = item.f_cantidad;
              dd.f_precio = item.f_precio;
              dd.f_itbis = item.f_itbis;
              dd.f_qty_devuelta = qty;
            });
        }
      }
    });  // :contentReference[oaicite:0]{index=0}

    // 2) Recuperar detalle recién guardado
    const detallesRaw = (await database
      .collections.get('t_detalle_factura_dev_pda')
      .query(Q.where('f_documento', headDocument.f_documento))
      .fetch()
    ).map(d => d._raw);

    // 4) Enviar a la API
    try {
      await enviarDevoluciones({
        devolucion: headDocument,
        detalles: detallesRaw,
        navigation,
        setIsSending
      });
      Alert.alert(
        'Devolucion guardada y enviada correctamente',
        '¿Desea imprimir el comprobante de devolución?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Sí',
            // … dentro del onPress del botón “Sí” …

            onPress: async () => {
              const clientesMap = { [headDocument.f_cliente]: { f_nombre: clienteName } };
              console.log('👀 detallesRaw que paso a rDevoluciones:', detallesRaw);
              try {
                const reporte = rDevoluciones(headDocument, detallesRaw, clientesMap);  // :contentReference[oaicite:0]{index=0}
                console.log('🖨️ reporte ESC/POS generado:', reporte);
                await printTest(reporte);
              } catch (err) {
                console.error('Error en rDevoluciones o printTest:', err);
              }
            }

          }
        ]
      );
    } catch (err) {
      console.error('Error al enviar devolución:', err);
      Alert.alert(
        'Error al enviar devolucion',
        '¿Desea imprimir el comprobante de devolución?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Sí',
            onPress: async () => {
              // Construir mapa de clientes (usamos el nombre ya cargado en clienteName)
              const clientesMap = {
                [headDocument.f_cliente]: { f_nombre: clienteName }
              };
              // Generar el texto ESC/POS
              const reporte = rDevoluciones(headDocument, detallesRaw, clientesMap);
              // Enviar a la impresora
              await printTest(reporte);
            }
          }
        ]
      );
    }


    // 4) Volver al listado
    // await navigation.navigate('ConsultaDevoluciones');

  };



  if (loadingInvoices) return <ActivityIndicator style={{ flex: 1 }} size="large" />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.halfContainer}>
        <Text style={styles.sectionTitle}>{clienteName}</Text>
        <View style={styles.filterRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar factura..."
            keyboardType="numeric"
            value={searchText}
            onChangeText={text => {
              // Actualiza el texto en pantalla al instante
              setSearchText(text);
              // Lanza la búsqueda real con debounce
              debouncedSearch(text);
            }}
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
              <Text style={styles.itemText}>({item.f_nodoc}){item.f_documento} - Monto: {formatear(item.f_monto)}</Text>
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
            keyExtractor={(d, index) => `${d.f_documento}_${d.f_referencia}_${d.f_cantidad}_${index}`}
            renderItem={({ item }) => (
              <SafeAreaView>
                <View style={styles.detailRow}>
                  <Text style={styles.detailText}>({item.f_referencia}) {item.descripcion}  ({item.referencia_suplidor})</Text>
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


      <ModalDetalleDevolucion
        showModal={showModal}
        setShowModal={setShowModal}
        selectedInvoice={selectedInvoice}
        detailsMap={detailsMap}
        toReturn={toReturn}
        onChangeReturn={onChangeReturn}
        selectedMotivo={selectedMotivo}
        setSelectedMotivo={setSelectedMotivo}
        motives={motives}
        observacion={observacion}
        setObservacion={setObservacion}
        summary={summary}
        formatear={formatear}
        confirmReturn={confirmReturn}
      />
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
  cancelButton: { padding: 12, alignItems: 'center' },
  summaryContainer: {
    padding: 8,
    borderTopWidth: 1,
    borderColor: '#ccc',
    marginVertical: 8,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    marginVertical: 2,
  },
});

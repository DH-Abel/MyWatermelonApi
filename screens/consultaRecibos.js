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
  TouchableOpacity,
  StyleSheet, TextInput
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { database } from '../src/database/database';
import { Q } from '@nozbe/watermelondb';
import { rRecibo } from './reportes/rRecibos';
import { printTest } from './funciones/print';
import NetInfo from '@react-native-community/netinfo';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { formatear } from '../assets/formatear';
import { consultaStyles } from '../assets/consultaStyles';
// Asume que tienes una función para enviar recibos
import { enviarRecibo } from '../src/sincronizaciones/enviarRecibo';


export default function ConsultaRecibos({ navigation }) {
  // Estados principales
  const [fullRecibos, setFullRecibos] = useState([]);
  const [recibos, setRecibos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notasNC, setNotasNC] = useState([]);
  const [searchTextCliente, setSearchTextCliente] = useState('');

  // Filtros por fecha
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [isStartPickerVisible, setIsStartPickerVisible] = useState(false);
  const [isEndPickerVisible, setIsEndPickerVisible] = useState(false);

  // Filtro por cliente
  const [clientsList, setClientsList] = useState([]);
  const [clientesMap, setClientesMap] = useState({});
  const [selectedClient, setSelectedClient] = useState(null);
  const [showClientModal, setShowClientModal] = useState(false);

  // Modal de detalle
  const [detalleModalVisible, setDetalleModalVisible] = useState(false);
  const [selectedRecibo, setSelectedRecibo] = useState(null);
  const [detalleAplicaciones, setDetalleAplicaciones] = useState([]);
  const [detalleLoading, setDetalleLoading] = useState(false);

  // 1) Función que devuelve el detalle unificado (no usa estado interno)
  async function getDetalleRecibo(recibo) {
    const docRecibo = recibo._raw?.f_documento || recibo.f_documento;

    // 2) Traer aplicaciones
    const apps = await database
      .collections.get('t_aplicaciones_pda2')
      .query(Q.where('f_documento_aplico', docRecibo))
      .fetch();  // f_documento_aplico, f_documento_aplicado, f_monto :contentReference[oaicite:1]{index=1}:contentReference[oaicite:2]{index=2}

    // 3) Traer notas de crédito vinculadas al recibo
    const notas = await database
      .collections.get('t_nota_credito_venta_pda2')
      .query(Q.where('f_documento_principal', docRecibo))
      .fetch();  // f_documento_principal, f_factura, f_monto :contentReference[oaicite:3]{index=3}:contentReference[oaicite:4]{index=4}

    // 4) Sumar descuento por factura
    const descuentosPorFactura = {};
    notas.forEach(nc => {
      const fac = nc._raw.f_factura;
      descuentosPorFactura[fac] = (descuentosPorFactura[fac] || 0) + nc._raw.f_monto;
    });

    // 5) Construir array de detalle
    return apps.map(app => ({
      f_documento_aplicado: app._raw.f_documento_aplicado,
      f_monto: app._raw.f_monto,
      descuento: descuentosPorFactura[app._raw.f_documento_aplicado] || 0,
      f_concepto: app._raw.f_concepto,
      f_balance: app._raw.f_balance,
    }));
  }


  const cols = database.collections.get('t_nota_credito_venta_pda2');

  // Parsear fecha dd/mm/yyyy → Date
  const parseDateFromDDMMYYYY = dateStr => {
    const [day, month, year] = dateStr.split('/');
    const d = new Date(year, month - 1, day);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // Cargar clientes para filtro
  const cargarClientes = async () => {
    try {
      const cols = database.collections.get('t_clientes');
      const all = await cols.query().fetch();
      const map = {};
      all.forEach(c => { map[c.f_id] = c._raw; });
      setClientesMap(map);
      setClientsList(all.map(c => c._raw));
    } catch (err) {
      console.error('Error cargando clientes:', err);
    }
  };

  const cargarNC = async () => {
    try {
      const collection = database.collections.get('t_nota_credito_venta_pda2');
      // trae todos los registros
      const all = await collection.query().fetch();
      console.log(`🏷️  Notas de crédito encontradas: ${all.length}`);
      //console.log(all.map(r => r._raw));
      // los registros _raw tienen exactamente todas las columnas
      console.log('*** NOTAS DE CRÉDITO ***');
      // console.log(all.map(rec => rec._raw));
      // si quieres guardarlos en estado para listarlos en pantalla, hazlo:
      setNotasNC(all.map(rec => rec._raw));
    } catch (err) {
      console.error('Error cargando notas de crédito:', err);
    }
  };

  const cargarAplicaciones = async () => {
    try {
      const collection = database.collections.get('t_aplicaciones_pda2');
      // trae todos los registros
      const all = await collection.query().fetch();
      console.log(`🏷️  Aplicaciones encontradas: ${all.length}`);
      console.log(all.map(r => r._raw));
      // los registros _raw tienen exactamente todas las columnas
      //console.log('*** Aplicaciones ***');
      //console.log(all.map(rec => rec._raw));
      // si quieres guardarlos en estado para listarlos en pantalla, hazl:
      setNotasNC(all.map(rec => rec._raw));
    } catch (err) {
      console.error('Error cargando notas de crédito:', err);
    }
  };


  // Cargar todos los recibos
  const cargarRecibos = async () => {
    try {
      const cols = database.collections.get('t_recibos_pda2');
      console.log(cols._raw)
      const subscr = cols.query().observe().subscribe(all => {
        setFullRecibos(all);
        setLoading(false);
      });
      await cargarClientes();
      return () => subscr.unsubscribe();
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  // Refrescar (sync local)
  const cargarEstado = async () => {
    setLoading(true);
    try {
      const cols = database.collections.get('t_recibos_pda2');
      const all = await cols.query().fetch();
      setFullRecibos(all);
    } catch (err) {
      console.error('Error recargando recibos:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredClientsList = clientsList.filter(c =>
    c.f_nombre.toLowerCase().includes(searchTextCliente.toLowerCase()) ||
    c.f_id.toString().toLowerCase().includes(searchTextCliente.toLowerCase())
  );

  const limpiarBase = async () => {
    setLoading(true);
    try {
      await database.write(async () => {
        console.log('🔄 Iniciando limpieza de BD');
        await database.unsafeResetDatabase();
      });
      console.log('✅ BD vacía');
      await cargarRecibos();  // vuelves a suscribirte al DB limpio
      Alert.alert('Listo', 'Base de datos limpiada');
    } catch (err) {
      console.error('Error limpiando BD:', err);
      Alert.alert('Error', 'No se pudo limpiar la base de datos');
    } finally {
      setLoading(false);
    }
  };

  //  useEffect(() => {
  //    console.log('🏷️ Recibos filtrados:', recibos);
  //    recibos.forEach((recibo, idx) => {
  //      console.log(`Recibo ${idx + 1}:`, recibo);
  //    });
  //  }, [recibos]);

  // Filtrar por fecha y cliente
  useEffect(() => {
    const normStart = new Date(startDate);
    normStart.setHours(0, 0, 0, 0);
    const normEnd = new Date(endDate);
    normEnd.setHours(23, 59, 59, 999);
    const filtered = fullRecibos.filter(r => {
      const fechaStr = r.f_fecha;
      const fechaRec = parseDateFromDDMMYYYY(fechaStr);
      const inDate = fechaRec >= normStart && fechaRec <= normEnd;
      const inClient = selectedClient ? r.f_idcliente === selectedClient.f_id : true;
      return inDate && inClient;
    });
    setRecibos(filtered);
  }, [fullRecibos, startDate, endDate, selectedClient]);

  // Iniciar carga
  useEffect(() => { cargarRecibos(); }, []);

  useEffect(() => {
    cargarNC();
    cargarAplicaciones()
  }, []);

  // Detalle de aplicaciones con cálculo de descuento
  const fetchDetalleAplicaciones = async recibo => {
    setDetalleLoading(true);
    try {
      // 1) obtenemos aplicaciones
      const apps = await database
        .collections.get('t_aplicaciones_pda2')
        .query(Q.where('f_documento_aplico', recibo.f_documento))
        .fetch();
      // 2) para cada app calculamos descuento según días y tabla t_desc_x_pago_cliente
      const discounts = await database
        .collections.get('t_desc_x_pago_cliente')
        .query(Q.where('f_cliente', recibo.f_idcliente))
        .fetch();
      const appsWithDiscount = await Promise.all(
        apps.map(async app => {
          // buscarnos la factura original
          const invArr = await database
            .collections.get('t_cuenta_cobrar')
            .query(Q.where('f_documento', app.f_documento_aplicado))
            .fetch();
          const inv = invArr[0];
          // cálculos de fechas
          const [ddR, mmR, yyyyR] = recibo.f_fecha.split('/');
          const fechaRec = new Date(+yyyyR, +mmR - 1, +ddR);
          const [dd, mm, yyyy] = inv.f_fecha.split('/');
          const fechaFac = new Date(+yyyy, +mm - 1, +dd);
          const dias = Math.floor((fechaRec - fechaFac) / (1000 * 60 * 60 * 24));
          const disc = discounts.find(d => dias >= d.f_dia_inicio && dias <= d.f_dia_fin);
          const pct = disc ? disc.f_descuento1 : 0;
          return { ...app._raw, discountPct: pct };
        })
      );
      setDetalleAplicaciones(appsWithDiscount);
    } catch (err) {
      console.error('Error detalle de aplicaciones:', err);
    } finally {
      setDetalleLoading(false);
    }
  };


  // Abrir modal detalle
  const openDetalleModal = recibo => {
    setSelectedRecibo(recibo);
    fetchDetalleAplicaciones(recibo);
    setDetalleModalVisible(true);
  };

  // Imprimir recibo
  const imprimirRecibo = async reciboRecord => {

    //saber cuantas impresiones de los recibos van
    const impresionesActuales = reciboRecord._raw.f_impresiones || 0;
    if (impresionesActuales >= 2) {
      Alert.alert('Aviso', 'Este recibo ya alcanzó el máximo de 2 impresiones.');
      return;
    }
    // 1) Obtén el objeto plano
    const recibo = reciboRecord._raw || reciboRecord;
    // 2) Espera a tener el detalle unificado
    const detalle = await getDetalleRecibo(reciboRecord);

    const bancos = await database
      .collections.get('t_bancos')
      .query()
      .fetch();
    const bancosMap = bancos.reduce((m, b) => {
      m[b._raw.f_idbanco] = b._raw.f_nombre;
      return m;
    }, {});
    // 3) Genera el string ESC/POS e imprime
    const reporte = rRecibo(recibo, detalle, clientesMap, bancosMap);
    
    // 4) Llamamos a printTest y comprobamos su resultado
    const ok = await printTest(reporte);
    if (!ok) {
      // printTest ya mostró el alert. No actualizamos contador ni seguimos.
      return;
    }

    // 5) Solo si devuelve true, incrementamos f_impresiones en +1
    await database.write(async () => {
      const recModel = await database
        .collections.get('t_recibos_pda2')
        .find(reciboRecord.id);
      await recModel.update(r => {
        r.f_impresiones = (r.f_impresiones || 0) + 1;
      });
    });
  };


  // Enviar recibo
  const handleEnviarRecibo = async recibo => {
    try {
      if (recibo.f_enviado) {
        Alert.alert('Aviso', 'Este recibo ya fue enviado');
        return;
      }
      await enviarRecibo({
        recibo: recibo._raw,
        aplicaciones: detalleAplicaciones,
        navigation,
        setIsSending: setDetalleLoading
      });
      await cargarEstado();
      Alert.alert('Éxito', 'Recibo enviado');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'No se pudo enviar el recibo');
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  }

  // ordenar descendente por fecha
  const recibosOrdenados = [...recibos].sort((a, b) => {
    return parseDateFromDDMMYYYY(b.f_fecha) - parseDateFromDDMMYYYY(a.f_fecha);
  });

  return (
    <SafeAreaView style={consultaStyles.container}>
      <Pressable
        onPress={() => {
          Alert.alert(
            'Aviso',
            'Esto borrara todos los recibos y aplicaciones de la base de datos. ¿Desea continuar?',
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Aceptar',
                onPress: () => {
                  limpiarBase();
                },
              },
            ]
          );
        }}
        style={{ marginBottom: 12, backgroundColor: '#FF3B30', padding: 10, borderRadius: 8, alignItems: 'center' }}
      >
        <Text style={consultaStyles.title}>LIMPIAR BASE DE DATOS</Text>
      </Pressable>
      {/* Header con Sync, cliente, y + */}
      <View style={consultaStyles.headerCard}>
        <View style={consultaStyles.headerRow}>
          <Text style={consultaStyles.headerTitle}>Recibos PDA</Text>
          <View style={consultaStyles.headerButtons}>

            <Pressable onPress={cargarEstado} style={consultaStyles.headerButton}>
              <Ionicons name="sync-outline" size={24} color="#fff" />
            </Pressable>


            <Pressable onPress={() => setShowClientModal(true)} style={consultaStyles.headerButton}>
              <Ionicons name="people-outline" size={24} color="#fff" />
            </Pressable>

            {/* Si hay cliente seleccionado, mostrar su nombre y un botón para limpiar */}

            <Pressable onPress={() => navigation.navigate('SelectClientesCobranza')} style={consultaStyles.headerButton}>
              <Ionicons name="add-circle-outline" size={24} color="#fff" />
            </Pressable>
          </View>
        </View>

      </View>
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
        <Pressable onPress={() => setIsStartPickerVisible(true)} style={consultaStyles.dateButton}>
          <Text style={consultaStyles.dateText}>{startDate.toDateString()}</Text>
        </Pressable>
        <Pressable onPress={() => setIsEndPickerVisible(true)} style={consultaStyles.dateButton}>
          <Text style={consultaStyles.dateText}>{endDate.toDateString()}</Text>
        </Pressable>
      </View>

      <DateTimePickerModal
        isVisible={isStartPickerVisible}
        mode="date"
        onConfirm={date => { setStartDate(date); setIsStartPickerVisible(false); }}
        onCancel={() => setIsStartPickerVisible(false)}
      />
      <DateTimePickerModal
        isVisible={isEndPickerVisible}
        mode="date"
        onConfirm={date => { setEndDate(date); setIsEndPickerVisible(false); }}
        onCancel={() => setIsEndPickerVisible(false)}
      />

      {/* Lista de Recibos */}
      <FlatList
        data={recibosOrdenados}
        keyExtractor={item => item.f_documento}
        renderItem={({ item }) => {
          const cliente = clientesMap[item.f_idcliente] || {};
          return (
            <View style={consultaStyles.pedidoCard}>
              <View style={consultaStyles.pedidoTitleSection}>
                <Text style={consultaStyles.pedidoTitle}>Recibo: {item.f_documento}</Text>
                <Text style={consultaStyles.pedidoTitle}>Cliente: {cliente.f_nombre || item.f_idcliente}</Text>
              </View>
              <View style={consultaStyles.pedidoInfoSection}>
                <View style={{ flex: 1 }}>
                  <Text style={consultaStyles.pedidoText}>Fecha: {item.f_fecha}</Text>
                  <Text style={consultaStyles.pedidoText}>Total: {formatear(item._raw?.f_monto)}</Text>
                  <Text style={consultaStyles.pedidoText}>Enviado: {item.f_enviado ? 'Sí' : 'No'}</Text>
                  <Text style={consultaStyles.pedidoText}>Estado: {item.f_estado}</Text>
                </View>
                <View style={consultaStyles.pedidoButtonColumn}>

                  <Pressable onPress={() => openDetalleModal(item)} style={consultaStyles.pedidoSmallButton}>
                    <Ionicons name="eye-outline" size={23} color="#fff" />
                  </Pressable>
                  <Pressable onPress={() => imprimirRecibo(item)} style={consultaStyles.pedidoSmallButton}>
                    <Ionicons name="print-outline" size={23} color="#fff" />
                  </Pressable>
                  <Pressable onPress={() => handleEnviarRecibo(item)} style={consultaStyles.pedidoSmallButton}>
                    <Ionicons name="send-outline" size={23} color="#fff" />
                  </Pressable>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Modal de Cliente para filtrar */}
      <Modal visible={showClientModal} transparent animationType="fade">

        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 8, marginBottom: 12 }}
              placeholder="Buscar cliente..."
              value={searchTextCliente}
              onChangeText={setSearchTextCliente}
            />
            <Text style={styles.modalTitle}>Seleccione Cliente</Text>
            <FlatList
              data={filteredClientsList}
              keyExtractor={c => c.f_id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => { setSelectedClient(item); setShowClientModal(false); }}>
                  <Text style={styles.modalItem}>({item.f_id}) {item.f_nombre}</Text>
                </TouchableOpacity>
              )}
            />
            <Pressable onPress={() => setShowClientModal(false)} style={styles.closeModal}>
              <Text style={styles.buttonText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal de Detalle de Aplicaciones */}
      <Modal visible={detalleModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Detalle Recibo {selectedRecibo?.f_documento}</Text>

            {detalleLoading ? (
              <ActivityIndicator size="large" />
            ) : detalleAplicaciones.length > 0 ? (
              <FlatList
                data={detalleAplicaciones}
                keyExtractor={app => app.id?.toString() || app.f_documento_aplicado}
                renderItem={({ item }) => (
                  <View style={{ marginBottom: 12 }}>
                    <Text>Factura: {item.f_documento_aplicado}</Text>
                    <Text>Monto: {formatear(item.f_monto)}</Text>
                    <Text>Concepto: {item.f_concepto}</Text>
                    <Text>Fecha: {item.f_fecha}</Text>
                    <Text>Descuento: {item.discountPct}%</Text>
                  </View>
                )}
              />
            ) : (
              <Text>No hay aplicaciones para este recibo.</Text>
            )}
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  modalItem: { padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
  closeModal: {
    backgroundColor: '#FF3B30',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '500' },
});

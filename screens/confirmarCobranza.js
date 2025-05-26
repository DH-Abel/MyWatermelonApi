import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, Pressable, Alert, SafeAreaView, StyleSheet, Modal,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';

import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRoute, useNavigation } from '@react-navigation/native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { database } from '../src/database/database';
import { enviarRecibo } from '../src/sincronizaciones/enviarRecibo';
import { Q } from '@nozbe/watermelondb';
import { formatear } from '../assets/formatear'
import { CommonActions } from '@react-navigation/native';
import { printTest } from '../screens/funciones/print';
import { rRecibo } from '../screens/reportes/rRecibos'


export default function ConfirmarCobranza() {
  console.log('guardando')
  const route = useRoute();
  const navigation = useNavigation();


  const raw = route.params.invoiceDetails;
  const invoiceDetails = typeof raw === 'string' ? JSON.parse(raw) : raw;
  // console.log('Parsed invoiceDetails:', invoiceDetails);
  const { clienteSeleccionado, pagos, totalPago, totalDescuento } = route.params;

  //   console.log('📥 invoiceDetails recibidos en ConfirmarCobranza:', invoiceDetails);

  const [banks, setBanks] = useState([]);
  const [efectivo, setEfectivo] = useState('');
  const [transferenciaMonto, setTransferenciaMonto] = useState('');
  const [transferenciaBanco, setTransferenciaBanco] = useState(null);
  const [chequeMonto, setChequeMonto] = useState('');
  const [chequeBanco, setChequeBanco] = useState(null);
  const [chequeNumero, setChequeNumero] = useState('');
  const [chequeCobroDate, setChequeCobroDate] = useState(null);

  const [showBankModal, setShowBankModal] = useState(false);
  const [bankType, setBankType] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const cols = database.collections.get('t_bancos');
        const hasQuery = searchQuery.trim().length > 0;
        const query = hasQuery
          ? cols.query(
            Q.where('f_nombre', Q.like(`%${searchQuery.trim()}%`)),
            Q.sortBy('f_nombre', Q.asc),
          )
          : cols.query(
            Q.sortBy('f_nombre', Q.asc),
          );
        const list = await query.fetch();
        setBanks(list);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [searchQuery]);

  const sumPagos = () => {
    const e = parseFloat(efectivo) || 0;
    const t = parseFloat(transferenciaMonto) || 0;
    const c = parseFloat(chequeMonto) || 0;
    return e + t + c;
  };
  const validSum = Math.abs(sumPagos() - totalPago) < 0.01;


  const openBankModal = type => {
    setBankType(type);
    setShowBankModal(true);
  };
  const selectBank = bank => {
    if (bankType === 'transfer') setTransferenciaBanco(bank);
    else setChequeBanco(bank);
    setShowBankModal(false);
  };
  const handleDateConfirm = date => {
    setChequeCobroDate(date);
    setShowDatePicker(false);
  };

  const guardar = async () => {
    // 1) Validaciones iniciales
    if (chequeMonto > 0 && !chequeBanco) {
      Alert.alert('Error', 'Seleccione un banco para el cheque.');
      return;
    }
    if (chequeMonto > 0 && !chequeCobroDate) {
      Alert.alert('Error', 'Seleccione una fecha de cobro del cheque.');
      return;
    }
    if (transferenciaMonto > 0 && !transferenciaBanco) {
      Alert.alert('Error', 'Seleccione un banco para la transferencia.');
      return;
    }
    if (!validSum) {
      Alert.alert('Error', 'La suma de los pagos debe igualar el total.');
      return;
    }

    try {
      setIsSaving(true);
      // 2) Escribo recibo, aplicaciones y notas en la base local
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const id = timestamp;
      const hoy = new Date().toLocaleDateString('en-GB');

      await database.write(async () => {
        // --- creación de recibo ---
        const recCol = database.collections.get('t_recibos_pda2');
        await recCol.create(r => {
          r.f_documento = `REC${id}`;
          r.f_tiporecibo = 'REC';
          r.f_norecibo = id;
          r.f_monto = parseFloat(totalPago) || 0;
          r.f_fecha = hoy;
          r.f_concepto = 'COBRO';
          r.f_idcliente = clienteSeleccionado.f_id;
          r.f_cobrador = 12;
          r.f_efectivo = parseFloat(efectivo) || 0;
          r.f_monto_transferencia = parseFloat(transferenciaMonto) || 0;
          r.f_cheque = parseFloat(chequeMonto) || 0;
          r.f_cheque_numero = parseInt(chequeNumero) || 0;
          r.f_cheque_banco = chequeBanco?.f_idbanco || '';
          r.f_banco_transferencia = transferenciaBanco?.f_idbanco || '';
          r.f_cheque_recibido = hoy;
          r.f_cheque_cobro = chequeCobroDate
            ? chequeCobroDate.toLocaleDateString('en-GB')
            : hoy;
          r.f_aprobado = false;
          r.f_anulado = false;
          r.f_enviado = false;
          r.f_nota = 'test'
        });

        // --- aplicaciones ---
        const appCol = database.collections.get('t_aplicaciones_pda2');
        const descuentosMap = invoiceDetails.reduce((m, det) => {
          m[det.documento] = det.valorDescuento || 0;
          return m;
        }, {});
        for (let [doc, raw] of Object.entries(pagos)) {
          const monto = parseFloat(raw) || 0;
          const origBalance = invoiceDetails.find(i => i.documento === doc)?.balance || 10;
          const descuento = descuentosMap[doc] || 0;
          const newBalance = origBalance - monto - descuento;

          console.log('Aplicando pago:', doc, 'Monto:', monto, 'Descuento:', descuento, 'Nuevo balance:', newBalance.toFixed(2), 'Balance original:', origBalance.toFixed(2));

          if (monto > 0) {
            await appCol.create(a => {
              a.f_documento_aplico = `REC${id}`;
              a.f_documento_aplicado = doc;
              a.f_tipo_doc = 'FAC';
              a.f_concepto = newBalance.toFixed(2) == 0.00 ? 'SALDO' : 'ABONO';
              a.f_monto = monto;
              a.f_fecha = hoy;
              a.f_cliente = clienteSeleccionado.f_id;
              a.f_balance = parseFloat(newBalance.toFixed(2)) || 0;
            });
          }
        }

        // --- notas de crédito ---
        const notaCol = database.collections.get('t_nota_credito_venta_pda2');
        for (let detail of invoiceDetails) {
          if (detail.valorDescuento > 0) {
            await notaCol.create(nc => {
              nc.f_documento = `NC${timestamp}`;
              nc.f_tipo = 'NC';
              nc.f_nodoc = parseInt(timestamp, 10);
              nc.f_monto = detail.valorDescuento;
              nc.f_fecha = hoy;
              nc.f_concepto = `DESC.POR PAGO %${detail.descuentoPct}`;
              nc.f_idcliente = clienteSeleccionado.f_id;
              nc.f_tipo_nota = 0;
              nc.f_factura = detail.documento;
              nc.f_ncf = '';
              nc.f_porc = detail.descuentoPct;
              nc.f_enviado = false;
              nc.f_documento_principal = `REC${id}`;
            });
          }
        }
      });

      // 3) Preparo datos crudos para envío
      const recRaw = (await database
        .collections.get('t_recibos_pda2')
        .query(Q.where('f_norecibo', id))
        .fetch())[0]._raw;

      const appsRaw = (await database
        .collections.get('t_aplicaciones_pda2')
        .query(Q.where('f_documento_aplico', recRaw.f_documento))
        .fetch()).map(m => m._raw);

      const ncRaw = (await database
        .collections.get('t_nota_credito_venta_pda2')
        .query(Q.where('f_documento_principal', recRaw.f_documento))
        .fetch()).map(m => m._raw);

      // 4) Imprimo recibo localmente
      const detalleParaImprimir = invoiceDetails.map(det => ({
        f_documento_aplicado: det.documento,
        f_monto: det.monto,
        descuento: det.valorDescuento,
        f_concepto: det.balanceConDescuento === det.monto + det.valorDescuento
          ? 'SALDO' : 'ABONO',
        f_balance: det.balance - det.monto - det.valorDescuento,
      }));
      const clientesMap = { [clienteSeleccionado.f_id]: clienteSeleccionado };

      const bancos = await database
        .collections.get('t_bancos')
        .query()
        .fetch();
      const bancosMap = bancos.reduce((m, b) => {
        m[b._raw.f_idbanco] = b._raw.f_nombre;
        return m;
      }, {});
      
      const reporte = rRecibo(recRaw, detalleParaImprimir, clientesMap, bancosMap);
      await printTest(reporte);


      // 4) Intento de envío (hasta 2 veces)
      setIsSending(true);
      let intento = 0;
      let enviado = false;
      while (intento < 2 && !enviado) {
        try {
          await enviarRecibo({ recibo: recRaw, aplicaciones: appsRaw, notas: ncRaw, navigation, setIsSending });
          enviado = true;
        } catch (err) {
          intento++;
        }
      }

      // 5) Alertas según resultado real
      if (enviado) {
        Alert.alert('Hecho', 'Recibo guardado y enviado', [
          {
            text: 'OK',
            onPress: () =>
              navigation.reset({
                index: 1,                            // la ruta activa será la segunda
                routes: [
                  { name: 'MenuPrincipal' },        // primera en el historial
                  { name: 'ConsultaPedidos' }       // activa, a la que llegarás
                ]
              })
          },
        ]);
      } else {
        Alert.alert('Guardado', 'Recibo guardado localmente, pero no se pudo enviar', [
          {
            text: 'OK',
            onPress: () => navigation.navigate('ConsultaRecibos'),
          },
        ]);
      }

    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'No se pudo guardar el recibo: ' + err.message);
    } finally {
      setIsSending(false);
      setIsSaving(false);
    }
  };


  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.select({ ios: 0, android: 20 })}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
      >
        <SafeAreaView style={styles.container}>

          <View style={[
            styles.header,
            { borderColor: '#fff', borderWidth: 2, borderRadius: 10, padding: 10 }
          ]}>
            <Text style={styles.headerSubtitle}>{clienteSeleccionado.f_nombre}</Text>
            <Text style={styles.headerSubtitle}>Total: {formatear(totalPago)}</Text>
            <Text style={styles.headerSubtitle}>Descuento: {formatear(totalDescuento)}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Efectivo</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                keyboardType="numeric"
                placeholder="0.00"
                value={efectivo}
                onChangeText={setEfectivo}
              />
              <Pressable
                style={styles.completeButton}
                onPress={() => { setEfectivo(parseFloat(totalPago.toString()).toFixed(2)), setTransferenciaMonto(null), setTransferenciaBanco(null), setChequeMonto(null), setChequeBanco(null), setChequeNumero(null), setChequeCobroDate(null) }}
              >
                <Ionicons name="add-outline" size={24} color="#fff" />
              </Pressable>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Transferencia</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                keyboardType="numeric"
                placeholder="0.00"
                value={transferenciaMonto}
                onChangeText={setTransferenciaMonto}
              />
              <Pressable
                onPress={() => openBankModal('transfer')}
                style={styles.bankButton}
              >
                <Text style={styles.buttonText}>
                  {transferenciaBanco?.f_nombre || 'Banco'}
                </Text>
              </Pressable>
              <Pressable
                style={styles.completeButton}
                onPress={() => { setTransferenciaMonto(parseFloat(totalPago.toString()).toFixed(2)), setChequeMonto(null), setChequeBanco(null), setEfectivo(null), setChequeNumero(null), setChequeCobroDate(null) }}
              >
                <Ionicons name="add-outline" size={24} color="#fff" />
              </Pressable>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Cheque / Orden</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 2 }]}
                keyboardType="numeric"
                placeholder="0.00"
                value={chequeMonto}
                onChangeText={setChequeMonto}
              />

              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Núm. Cheque"
                keyboardType="numeric"
                value={chequeNumero}
                onChangeText={setChequeNumero}
              />
              <Pressable
                style={styles.completeButton}
                onPress={() => { setChequeMonto(parseFloat(totalPago.toString()).toFixed(2)), setTransferenciaMonto(null), setTransferenciaBanco(null), setEfectivo(null) }}
              >
                <Ionicons name="add-outline" size={24} color="#fff" />
              </Pressable>
            </View>
            <View style={styles.row}>

              <Pressable
                onPress={() => openBankModal('cheque')}
                style={styles.bankButton}
              >
                <Text style={styles.buttonText}>
                  {chequeBanco?.f_nombre || 'Banco'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={styles.dateButton}
              >
                <Text style={styles.buttonText}>
                  {chequeCobroDate
                    ? chequeCobroDate.toLocaleDateString('en-GB')
                    : 'Fecha Cobro'}
                </Text>
              </Pressable>
            </View>
          </View>


          <Pressable
            onPress={guardar}
            style={[styles.saveButton, !validSum && styles.disabled]}
            disabled={!validSum || isSending || isSaving}
          >
            <Text style={styles.saveText}>{isSending ? 'Enviando...' : 'Guardar y Enviar'}</Text>
          </Pressable>

          <Modal visible={showBankModal} transparent>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Seleccione Banco</Text>

                {/* BUSCADOR */}
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar banco..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />

                {banks.length === 0 ? (
                  <ActivityIndicator />
                ) : (
                  <FlatList
                    data={banks}
                    keyExtractor={(item, idx) => item.f_idbanco?.toString() || idx.toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity onPress={() => selectBank(item)}>
                        <Text style={styles.bankItem}>{item.f_nombre}</Text>
                      </TouchableOpacity>
                    )}
                  />
                )}
                <Pressable onPress={() => setShowBankModal(false)} style={styles.closeModal}>
                  <Text style={styles.buttonText}>Cerrar</Text>
                </Pressable>
              </View>
            </View>
          </Modal>



          <DateTimePickerModal
            isVisible={showDatePicker}
            mode="date"
            onConfirm={handleDateConfirm}
            onCancel={() => setShowDatePicker(false)}
          />
        </SafeAreaView>
      </ScrollView >
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  header: { padding: 10, backgroundColor: '#007AFF', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 16, color: 'black', marginTop: 4, fontWeight: 'bold' },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    backgroundColor: '#f9f9f9',
  },
  bankButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  dateButton: {
    backgroundColor: '#5856D6',
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  buttonText: { color: '#fff', fontWeight: '500' },
  saveButton: {
    backgroundColor: '#FF9500',
    margin: 16,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveText: { color: 'black', fontWeight: 'bold', fontSize: 16 },
  disabled: { backgroundColor: '#ccc' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    maxHeight: '70%',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  bankItem: { padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
  closeModal: {
    backgroundColor: '#FF3B30',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  completeButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '500',
  },

});
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    FlatList,
    Pressable,
    Alert,
    SafeAreaView,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { database } from '../src/database/database';
import { enviarRecibo } from '../src/sincronizaciones/enviarRecibo';
import { Q } from '@nozbe/watermelondb';

export default function ConfirmarCobranza() {
    const route = useRoute();
    const navigation = useNavigation();

    const { clienteSeleccionado, pagos, totalPago, invoiceDetails } = route.params;

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

    useEffect(() => {
        (async () => {
            try {
                const cols = database.collections.get('t_bancos');
                const list = await cols.query().fetch();
                setBanks(list);
            } catch (err) {
                console.error(err);
            }
        })();
    }, []);

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
        if (!validSum) {
            Alert.alert('Error', 'La suma de los pagos debe igualar el total.');
            return;
        }
        try {
            const timestamp = Math.floor(Date.now() / 1000).toString();
            const id = timestamp;
            const hoy = new Date().toLocaleDateString('en-GB');
            await database.write(async () => {
                const recCol = database.collections.get('t_recibos_pda');
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
                    r.f_monto_transferencia = transferenciaMonto;
                    r.f_cheque = parseFloat(chequeMonto) || 0;
                    r.f_cheque_numero = chequeNumero;
                    r.f_cheque_banco = chequeBanco?.f_idbanco || '';
                    r.f_banco_transferencia = transferenciaBanco?.f_idbanco || '';
                    r.f_cheque_recibido = hoy;
                    r.f_cheque_cobro = chequeCobroDate
                        ? chequeCobroDate.toLocaleDateString('en-GB')
                        : '';
                    r.f_aprobado = false;
                    r.f_anulado = false;
                    r.f_enviado = false;
                });
                const appCol = database.collections.get('t_aplicaciones_pda');
                for (let [doc, raw] of Object.entries(pagos)) {
                    const m = parseFloat(raw) || 0;
                    if (m > 0) {
                        await appCol.create(a => {
                            a.f_documento_aplico = `REC${id}`;
                            a.f_documento_aplicado = doc;
                            a.f_tipo_doc = 'FAC';
                            a.f_concepto = m === sumPagos() ? 'SALDO' : 'ABONO';
                            a.f_monto = m;
                            a.f_fecha = hoy;
                            a.f_cliente = clienteSeleccionado.f_id;
                        });
                    }
                }
                // 3) Crear nota de crédito por cada factura con descuento
                const notaCol = database.collections.get('t_nota_credito_venta_pda2');
                for (let detail of invoiceDetails) {
                    if (detail.valorDescuento > 0) {
                        await notaCol.create(nc => {
                            nc.f_documento = `NC${timestamp}`; // prefijo NC
                            nc.f_tipo = 'NC';
                            nc.f_nodoc = parseInt(timestamp, 10);
                            nc.f_monto = detail.valorDescuento;
                            nc.f_fecha = hoy;
                            nc.f_concepto = `descuento ${detail.descuentoPct}% pronto pago`;
                            nc.f_idcliente = clienteSeleccionado.f_id;
                            nc.f_tipo_nota = 'NC';
                            nc.f_factura = detail.documento; // factura a la que aplica
                            nc.f_devolucion = '';   // sin devolución
                            nc.f_porc = detail.descuentoPct;
                        });
                        // Luego enviamos
                        const recRaw = (await database.collections.get('t_recibos_pda')
                            .query(Q.where('f_norecibo', id)).fetch())[0]._raw;

                        const appsRaw = (await database.collections.get('t_aplicaciones_pda')
                            .query(Q.where('f_documento_aplico', recRaw.f_documento))
                            .fetch()).map(m => m._raw);

                        await enviarRecibo({
                            recibo: recRaw,
                            aplicaciones: appsRaw,
                            navigation,
                            setIsSending
                        });
                    }
                }
            });
            Alert.alert('Hecho', 'Cobranza guardada', [{ text: 'OK', onPress: () => navigation.navigate('consultaRecibos') }]);

        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'No se pudo guardar.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerSubtitle}>{clienteSeleccionado.f_nombre}</Text>
                <Text style={styles.headerSubtitle}>Total: {totalPago.toFixed(2)}</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Efectivo</Text>
                <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="0.00"
                    value={efectivo}
                    onChangeText={setEfectivo}
                />
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
                    <Pressable onPress={() => openBankModal('transfer')} style={styles.bankButton}>
                        <Text style={styles.buttonText}>
                            {transferenciaBanco?.f_nombre || 'Banco'}
                        </Text>
                    </Pressable>
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Cheque / Orden</Text>
                <View style={styles.row}>
                    <TextInput flex={1}
                        style={styles.input}
                        keyboardType="numeric"
                        placeholder="0.00"
                        value={chequeMonto}
                        onChangeText={setChequeMonto}
                    />
                    <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder="Núm. Cheque"
                        value={chequeNumero}
                        onChangeText={setChequeNumero}
                    />
                </View>
                <View style={styles.row}>
                    <Pressable onPress={() => openBankModal('cheque')} style={styles.bankButton}>
                        <Text style={styles.buttonText}>
                            {chequeBanco?.f_nombre || 'Banco'}
                        </Text>
                    </Pressable>
                    <Pressable onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
                        <Text style={styles.buttonText}>
                            {chequeCobroDate
                                ? chequeCobroDate.toLocaleDateString('en-GB')
                                : 'Fecha Cobro'}
                        </Text>
                    </Pressable>
                </View>
            </View>

            <Pressable
                onPress={guardar} //navigation.navigate('SelectClientesCobranza')
                style={[styles.saveButton, !validSum && styles.disabled]}
                disabled={!validSum || isSending}
            >
                <Text style={styles.saveText}>{isSending ? 'Enviando...' : 'Guardar y Enviar'}</Text>
            </Pressable>

            <Modal visible={showBankModal} transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Seleccione Banco</Text>
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
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5' },
    header: { padding: 10, backgroundColor: '#007AFF', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
    headerSubtitle: { fontSize: 16, color: 'white', marginTop: 4, fontWeight: 'bold' },
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
});
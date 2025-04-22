import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, Pressable, Alert, SafeAreaView, StyleSheet, ActivityIndicator } from 'react-native';
import { database } from '../src/database/database';
import { Q } from '@nozbe/watermelondb';
import cargarCuentasCobrarLocales from '../src/sincronizaciones/cargarCuentaCobrarLocales';
import { enviarRecibo } from '../src/sincronizaciones/enviarRecibo';

export default function Cobranza({ clienteSeleccionado }) {
  const [cuentas, setCuentas] = useState([]);
  const [pagos, setPagos] = useState({});        // Almacena cadenas tal como las escribe el usuario
  const [totalPago, setTotalPago] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (clienteSeleccionado && clienteSeleccionado.f_id) {
      setLoading(true);
      cargarCuentasCobrarLocales(clienteSeleccionado.f_id)
        .then(loadLocal)
        .finally(() => setLoading(false));
    }
  }, [clienteSeleccionado]);

  const loadLocal = async () => {
    try {
      const results = await database
        .collections.get('t_cuenta_cobrar')
        .query(Q.where('f_idcliente', clienteSeleccionado.f_id))
        .fetch();
      setCuentas(results);
      setPagos({});
      setTotalPago(0);
    } catch (error) {
      console.error('Error cargando cuentas:', error);
    }
  };

  const onChangePago = (documento, raw) => {
    // raw es la cadena que teclea el usuario
    setPagos(prev => {
      const next = { ...prev, [documento]: raw };
      const suma = Object.values(next)
        .reduce((acc, cur) => acc + (parseFloat(cur) || 0), 0);
      setTotalPago(suma);
      return next;
    });
  };

  const saldar = (documento) => {
    const balance = cuentas.find(c => c.f_documento === documento)?.f_balance || 0;
    onChangePago(documento, balance.toString());
  };

  const realizarCobranzaLocal = async () => {
    if (totalPago <= 0) {
      Alert.alert('Error', 'No has seleccionado ningún pago');
      return;
    }
    // Validación: ningún abono puede exceder su saldo
    for (let [doc, raw] of Object.entries(pagos)) {
      const monto = parseFloat(raw) || 0;
      const balance = cuentas.find(c => c.f_documento === doc)?.f_balance || 0;
      if (monto > balance) {
        Alert.alert('Error', `El abono a la factura ${doc} excede su saldo.`);
        return;
      }
    }

    setIsSaving(true);
    try {
      // Crear recibo
      const timestamp = Date.now().toString();
      const f_norecibo = timestamp;
      const f_tiporecibo = 'REC12';
      const documentoRecibo = `${f_tiporecibo}${f_norecibo}`;
      const fecha = new Date().toLocaleDateString('en-GB');

      await database.write(async () => {
        // Encabezado
        const recCollection = database.collections.get('t_recibos_pda');
        await recCollection.create(r => {
          r.f_documento = documentoRecibo;
          r.f_tiporecibo = f_tiporecibo;
          r.f_norecibo = f_norecibo;
          r.f_monto = totalPago;
          r.f_fecha = fecha;
          r.f_concepto = 'COBRO';
          r.f_idcliente = clienteSeleccionado.f_id;
          r.f_cobrador = 12;
          r.f_efectivo = totalPago;
          r.f_monto_transferencia = '0';
          r.f_cheque = 0;
          r.f_cheque_numero = 0;
          r.f_cheque_banco = 0;
          r.f_banco_transferencia = 0;
          r.f_cheque_recibido = '';
          r.f_cheque_cobro = '';
          r.f_estado = '0';
          r.f_enviado = false;
        });

        // Detalles (aplicaciones)
        const appCollection = database.collections.get('t_aplicaciones_pda');
        for (let [doc, raw] of Object.entries(pagos)) {
          const monto = parseFloat(raw) || 0;
          if (monto > 0) {
            await appCollection.create(a => {
              a.f_documento_aplico = documentoRecibo;
              a.f_documento_aplicado = doc;
              const cuenta = cuentas.find(c => c.f_documento === doc);
              a.f_tipo_doc = cuenta?.f_tipodoc || '';
              a.f_concepto = monto === cuenta.f_balance ? 'SALDO' : 'ABONO';
              a.f_monto = monto;
              a.f_fecha = fecha;
              a.f_cliente = clienteSeleccionado.f_id;
            });
          }
        }
      });

      Alert.alert('Recibo guardado', '¿Deseas enviar el recibo?', [
        { text: 'No', style: 'cancel' },
        { text: 'Sí', onPress: () => enviarRecibo({ setIsSaving }) }
      ]);
      loadLocal();
    } catch (error) {
      console.error('Error guardando recibo:', error);
      Alert.alert('Error', 'No se pudo guardar el recibo localmente');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
            <Text style={styles.title}>Cobranza de Cliente</Text>
            <Text>Total a pagar: {totalPago.toFixed(2)}</Text>
          </View>
      <FlatList
        data={cuentas}
        keyExtractor={item => item.f_documento}
        // ListHeaderComponent={() => (
        //   <View style={styles.header}>
        //     <Text style={styles.title}>Cobranza de Cliente</Text>
        //     <Text>Total a pagar: {totalPago.toFixed(2)}</Text>
        //   </View>
        // )}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={{ flex: 2 }}>
              <Text>{item.f_documento}</Text>
              <Text>Vence: {item.f_fecha}</Text>
              <Text>Monto: {item.f_monto}</Text>
              <Text>Balance: {item.f_balance}</Text>
              <Text>noDoc: {item.f_nodoc}</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={pagos[item.f_documento] || ''}
                onChangeText={val => onChangePago(item.f_documento, val)}
                placeholder="Abono"
              />
              <Pressable onPress={() => saldar(item.f_documento)} style={styles.button}>
                <Text style={styles.buttonText}>Saldar</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
      <Pressable onPress={realizarCobranzaLocal} style={styles.footerButton} disabled={isSaving}>
        <Text style={styles.footerText}>
          {isSaving ? 'Guardando...' : 'Confirmar Cobro'}
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fb' },
  header: { padding: 16, backgroundColor: '#fff', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: 'bold' },
  item: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', marginBottom: 4 },
  input: { width: 80, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 8, marginHorizontal: 8,width: '90%' },
  button: { backgroundColor: '#007AFF', padding: 8, borderRadius: 8, width: '90%', alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff' },
  footerButton: { backgroundColor: '#007AFF', padding: 16, alignItems: 'center' },
  footerText: { color: '#fff', fontWeight: 'bold' }
});
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, Pressable, Alert, SafeAreaView, StyleSheet, ActivityIndicator } from 'react-native';
import { database } from '../src/database/database';
import { Q } from '@nozbe/watermelondb';
import cargarCuentasCobrarLocales from '../src/sincronizaciones/cargarCuentaCobrarLocales';
import { useNavigation } from '@react-navigation/native';

export default function Cobranza({ clienteSeleccionado }) {

  const navigation = useNavigation();
  
  const [cuentas, setCuentas] = useState([]);
  const [pagos, setPagos] = useState({});
  const [descuentosLocal, setDescuentosLocal] = useState([]);
  const [totalPago, setTotalPago] = useState(0);
  const [montoDistribuir, setMontoDistribuir] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (clienteSeleccionado?.f_id) {
      setLoading(true);
      cargarCuentasCobrarLocales(clienteSeleccionado.f_id)
        .then(async () => {
          await loadLocal();
          await loadDescuentos();
        })
        .finally(() => setLoading(false));
    }
  }, [clienteSeleccionado]);

  const loadLocal = async () => {
    try {
      const results = await database
        .collections.get('t_cuenta_cobrar')
        .query(Q.where('f_idcliente', clienteSeleccionado.f_id))
        .fetch();
      // Ordenar facturas por fecha ascendente (más antigua primero)
      const cxcOrdenada = results.sort((a, b) => {
        const [dd1, mm1, yyyy1] = a.f_fecha.split('/');
        const date1 = new Date(+yyyy1, +mm1 - 1, +dd1);
        const [dd2, mm2, yyyy2] = b.f_fecha.split('/');
        const date2 = new Date(+yyyy2, +mm2 - 1, +dd2);
        return date1 - date2;
      });
      setCuentas(cxcOrdenada);
      setPagos({});
      setTotalPago(0);
      setMontoDistribuir('');
    } catch (error) {
      console.error('Error cargando cuentas:', error);
    }
  };

  const loadDescuentos = async () => {
    try {
      const resultsDesc = await database
        .collections.get('t_desc_x_pago_cliente')
        .query(Q.where('f_cliente', clienteSeleccionado.f_id))
        .fetch();
      setDescuentosLocal(resultsDesc);
    } catch (error) {
      console.error('Error cargando descuentos:', error);
    }
  };

  const onChangePago = (documento, raw) => {
    setPagos(prev => {
      const next = { ...prev, [documento]: raw };
      const suma = Object.values(next)
        .reduce((acc, cur) => acc + (parseFloat(cur) || 0), 0);
      setTotalPago(suma);
      return next;
    });
  };

  const saldar = (documento) => {
    const cuenta = cuentas.find(c => c.f_documento === documento);
    if (!cuenta) return;
    const [dd, mm, yyyy] = cuenta.f_fecha.split('/');
    const fechaFactura = new Date(+yyyy, +mm - 1, +dd);
    const diasTranscurridos = Math.floor((new Date() - fechaFactura) / (1000 * 60 * 60 * 24));
    const disc = descuentosLocal.find(d => diasTranscurridos >= d.f_dia_inicio && diasTranscurridos <= d.f_dia_fin);
    const descuentoPct = disc ? disc.f_descuento1 : 0;
    const balanceConDescuento = cuenta.f_balance * (1 - descuentoPct / 100);
    onChangePago(documento, balanceConDescuento.toFixed(2));
  };

  // Distribuir un monto total automáticamente de la factura más antigua a la más reciente
  const distribuirPagos = () => {
    let restante = parseFloat(montoDistribuir) || 0;
    const nuevos = {};
    for (let cuenta of cuentas) {
      if (restante <= 0) break;
      const [dd, mm, yyyy] = cuenta.f_fecha.split('/');
      const fechaFactura = new Date(+yyyy, +mm - 1, +dd);
      const diasTranscurridos = Math.floor((new Date() - fechaFactura) / (1000 * 60 * 60 * 24));
      const disc = descuentosLocal.find(d => diasTranscurridos >= d.f_dia_inicio && diasTranscurridos <= d.f_dia_fin);
      const descuentoPct = disc ? disc.f_descuento1 : 0;
      const balanceDesc = cuenta.f_balance * (1 - descuentoPct / 100);
      const asignado = Math.min(restante, balanceDesc);
      nuevos[cuenta.f_documento] = asignado.toFixed(2);
      restante -= asignado;
    }
    setPagos(nuevos);
    const suma = Object.values(nuevos)
      .reduce((acc, cur) => acc + (parseFloat(cur) || 0), 0);
    setTotalPago(suma);
  };

  // Limpiar todos los montos ingresados
  const limpiar = () => {
    setPagos({});
    setTotalPago(0);
    setMontoDistribuir('');
  };

  const realizarCobranzaLocal = async () => {
    if (totalPago <= 0) {
      Alert.alert('Error', 'No has seleccionado ningún pago');
      return;
    } navigation.navigate('ConfirmarCobranza', {
      clienteSeleccionado,
      pagos,
      totalPago,
    });
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
      <View style={styles.distribuirContainer}>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          placeholder="Monto a distribuir"
          value={montoDistribuir}
          onChangeText={setMontoDistribuir}
        />
        <Pressable onPress={distribuirPagos} style={styles.button}>
          <Text style={styles.buttonText}>Distribuir Monto</Text>
        </Pressable>
        <Pressable onPress={limpiar} style={[styles.button, styles.clearButton]}>
          <Text style={styles.buttonText}>Limpiar</Text>
        </Pressable>
      </View>
      <FlatList
        data={cuentas}
        keyExtractor={item => item.f_documento}
        renderItem={({ item }) => {
          const [dd, mm, yyyy] = item.f_fecha.split('/');
          const fechaFactura = new Date(+yyyy, +mm - 1, +dd);
          const diasTranscurridos = Math.floor((new Date() - fechaFactura) / (1000 * 60 * 60 * 24));
          const disc = descuentosLocal.find(d => diasTranscurridos >= d.f_dia_inicio && diasTranscurridos <= d.f_dia_fin);
          const descuentoPct = disc ? disc.f_descuento1 : 0;
          const balanceConDescuento = item.f_balance * (1 - descuentoPct / 100);

          return (
            <View style={styles.item}>
              <View style={{ flex: 2 }}>
                <Text>{item.f_documento}</Text>
                <Text>Vence: {item.f_fecha}</Text>
                <Text>Monto: {item.f_monto}</Text>
                <Text>Balance: {item.f_balance}</Text>
                <Text>Descuento: {descuentoPct}%</Text>
                <Text>Balance c/ descuento: {balanceConDescuento.toFixed(2)}</Text>
              </View>
              <View style={{ alignItems: 'center', flex: 1 }}>
                <TextInput
                  style={styles.input2}
                  keyboardType="numeric"
                  value={pagos[item.f_documento] || ''}
                  onChangeText={val => onChangePago(item.f_documento, val)}
                  placeholder="Abono"
                />
                <Pressable onPress={() => saldar(item.f_documento)} style={styles.button2}>
                  <Text style={styles.buttonText}>Saldar</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />
      <Pressable onPress={realizarCobranzaLocal} style={styles.footerButton} disabled={isSaving}>
      <Text style={styles.footerText}>Confirmar Cobro</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fb' },
  header: { padding: 16, backgroundColor: '#fff', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: 'bold' },
  distribuirContainer: { flexDirection: 'row', padding: 16, backgroundColor: '#fff', marginBottom: 8, alignItems: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', marginBottom: 4 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 8, marginRight: 8 },
  button: { backgroundColor: '#007AFF', padding: 8, borderRadius: 8, alignItems: 'center' },
  input2: { width: 80, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 8, marginHorizontal: 8, width: '90%' },
  button2: { backgroundColor: '#007AFF', padding: 8, borderRadius: 8, width: '90%', alignItems: 'center', marginTop: 8 },
  clearButton: { marginLeft: 8, backgroundColor: '#FF3B30' },
  buttonText: { color: '#fff' },
  footerButton: { backgroundColor: '#007AFF', padding: 16, alignItems: 'center' },
  footerText: { color: '#fff', fontWeight: 'bold' }
});

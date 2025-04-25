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

  const parseDateString = (dateStr) => {
    if (typeof dateStr !== 'string') return new Date(dateStr);
    // Formato europeo “dd/mm/yyyy”
    if (dateStr.includes('/')) {
      const [dd, mm, yyyy] = dateStr.split('/');
      return new Date(+yyyy, +mm - 1, +dd);
    }
    // Caer al parser de JS (ISO, etc)
    return new Date(dateStr);
  };

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
    const fechaFac = parseDateString(cuenta.f_fecha);
    const dias = Math.floor((Date.now() - fechaFac.getTime()) / (1000 * 60 * 60 * 24));
    const disc = descuentosLocal.find(d => dias >= d.f_dia_inicio && dias <= d.f_dia_fin);
    const descuentoPct = disc ? disc.f_descuento1 : 0;
    const balanceConDescuento = cuenta.f_balance - (cuenta.f_base_imponible *  (descuentoPct / 100));
    onChangePago(documento, balanceConDescuento.toFixed(2));
  };

  // Distribuir un monto total automáticamente de la factura más antigua a la más reciente
  const distribuirPagos = () => {
    let restante = parseFloat(montoDistribuir) || 0;
    const nuevos = {};
    for (const cuenta of cuentas) {
      if (restante <= 0) break;
      const fechaFac = parseDateString(cuenta.f_fecha);
      const dias = Math.floor((Date.now() - fechaFac.getTime()) / (1000 * 60 * 60 * 24));
      const disc = descuentosLocal.find(d => dias >= d.f_dia_inicio && dias <= d.f_dia_fin);
      const descuentoPct = disc ? disc.f_descuento1 : 0;
      const balanceDesc = cuenta.f_balance * (1 - descuentoPct / 100);
      const asignado = Math.min(restante, balanceDesc);
      nuevos[cuenta.f_documento] = asignado.toFixed(2);
      restante -= asignado;
    }
    setPagos(nuevos);
    const suma = Object.values(nuevos).reduce((acc, cur) => acc + (parseFloat(cur) || 0), 0);
    setTotalPago(suma);
  };

  // Limpiar todos los montos ingresados
  const limpiar = () => {
    setPagos({});
    setTotalPago(0);
    setMontoDistribuir('');
  };

  const realizarCobranzaLocal = () => {
    // 1) arma el detalle completo
    const allDetails = cuentas.map(cuenta => {
      const fechaFactura = parseDateString(cuenta.f_fecha);
      const dias = Math.floor((Date.now() - fechaFactura.getTime()) / (1000*60*60*24));
      const disc = descuentosLocal.find(
        d => dias >= d.f_dia_inicio && dias <= d.f_dia_fin
      );
      const descuentoPct     = disc ? disc.f_descuento1 : 0;
      const valorDescuento   = cuenta.f_base_imponible * (descuentoPct/100);
      const balanceConDesc   = cuenta.f_base_imponible - valorDescuento;
      const montoPagado      = parseFloat(pagos[cuenta.f_documento]||0);
  
      return {
        documento:          cuenta.f_documento,
        monto:              montoPagado,
        descuentoPct,
        valorDescuento,
        balanceConDescuento: balanceConDesc,
      };
    });
  
    // 2) filtra sólo las que tengan un pago (o un valor de descuento > 0)
    const invoiceDetails = allDetails.filter(d => d.monto > 0 /* ó d.valorDescuento > 0 */);
  
    console.log('▶️ invoiceDetails filtrados:', invoiceDetails);
  
    navigation.navigate('ConfirmarCobranza', {
      clienteSeleccionado,
      pagos,
      totalPago,
      invoiceDetails,    
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
          const fechaFactura = parseDateString(item.f_fecha); 
          
          const diasTranscurridos = Math.floor(
            (Date.now() - fechaFactura.getTime()) / (1000 * 60 * 60 * 24)
          );
          const disc = descuentosLocal.find(
            d =>
              diasTranscurridos >= d.f_dia_inicio &&
              diasTranscurridos <= d.f_dia_fin
          );
          const descuentoPct = disc ? disc.f_descuento1 : 0;
          const valorDescuento = item.f_base_imponible * (descuentoPct / 100);
          const balanceConDescuento = item.f_balance - valorDescuento;
          
          return (
            <View style={styles.item}>
              <View style={{ flex: 2 }}>
                
                <Text>{item.f_documento}</Text>
                <Text>Vence: {item.f_fecha}</Text>
                <Text>Monto: {item.f_monto}</Text>
                <Text>Base Imponible: {item.f_base_imponible}</Text>
                <Pressable onPress={() => {console.log(item)}} style={styles.button2}>
                  <Text style={styles.buttonText}>Ver Detalle</Text>
                </Pressable>
                <Text>Balance: {item.f_balance}</Text>
                <Text>Descuento: {descuentoPct}% ({valorDescuento.toFixed(2)})</Text>
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

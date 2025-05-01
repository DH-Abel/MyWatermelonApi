import React, { useState, useEffect,useCallback,useMemo } from 'react';
import {
  View, Text, TextInput, FlatList, Pressable, Alert, SafeAreaView, StyleSheet,
  ActivityIndicator, Modal
} from 'react-native';
import { database } from '../src/database/database';
import { Q } from '@nozbe/watermelondb';
import cargarCuentasCobrarLocales from '../src/sincronizaciones/cargarCuentaCobrarLocales';
import { useNavigation } from '@react-navigation/native';
import { formatear,formatearFecha } from '../assets/formatear';

export default function Cobranza({ clienteSeleccionado }) {

  const navigation = useNavigation();

  const [cuentas, setCuentas] = useState([]);
  const [pagos, setPagos] = useState({});
  const [descuentosLocal, setDescuentosLocal] = useState([]);
  const [totalPago, setTotalPago] = useState(0);
  const [totalDescuento, setTotalDescuento] = useState(0);
  const [montoDistribuir, setMontoDistribuir] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);


  const [manualDescuentos, setManualDescuentos] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [currentDoc, setCurrentDoc] = useState(null);
  const [inputDesc, setInputDesc] = useState('');
  const [descuentoTotal, setDescuentoTotal] = useState(0);
  

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
    const cuenta = cuentas.find(c => c.f_documento === documento);
    const fechaFac = parseDateString(cuenta.f_fecha);
    const dias = Math.floor((Date.now() - fechaFac.getTime()) / (1000 * 60 * 60 * 24));
    const disc = descuentosLocal.find(d => dias >= d.f_dia_inicio && dias <= d.f_dia_fin);
    const manual = manualDescuentos[documento];
    const descuentoPct = manual != null
      ? manual
      : (disc ? disc.f_descuento1 : 0);
    const balanceConDescuento = cuenta.f_balance - (cuenta.f_base_imponible * (descuentoPct / 100));
    
    if (((parseFloat(raw)).toFixed(2) || 0) > parseFloat(balanceConDescuento.toFixed(2))) {
      Alert.alert('Error', 'El monto ingresado supera el balance con descuento');
      return;
    }
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
    const manual = manualDescuentos[documento];
    const descuentoPct = manual != null
      ? manual
      : (disc ? disc.f_descuento1 : 0);
    const balanceConDescuento = cuenta.f_balance - (cuenta.f_base_imponible * (descuentoPct / 100));
    onChangePago(documento, balanceConDescuento.toFixed(2));


  };

  // Distribuir un monto total automáticamente de la factura más antigua a la más reciente
  const distribuirPagos = () => {
    if (!montoDistribuir) {
      Alert.alert('Error', 'Ingrese un monto para distribuir');
      return;
    }
    let restante = parseFloat(montoDistribuir) || 0;
    const nuevos = {};
    for (const cuenta of cuentas) {
      if (restante <= 0) break;
      const fechaFac = parseDateString(cuenta.f_fecha);
      const dias = Math.floor((Date.now() - fechaFac.getTime()) / (1000 * 60 * 60 * 24));
      const disc = descuentosLocal.find(d => dias >= d.f_dia_inicio && dias <= d.f_dia_fin);
      const manual = manualDescuentos[cuenta.f_documento];
      const descuentoPct = manual != null ? manual : (disc ? disc.f_descuento1 : 0);
      const balanceDesc = cuenta.f_balance.toFixed(2) - (cuenta.f_base_imponible.toFixed(2) * (descuentoPct / 100));
      const asignado = Math.min(restante, balanceDesc.toFixed(2));
      nuevos[cuenta.f_documento] = asignado.toFixed(2);
      restante -= asignado;
    }
    setPagos(nuevos);
    const suma = Object.values(nuevos).reduce((acc, cur) => acc + (parseFloat(cur) || 0), 0);
    setTotalPago(suma.toFixed(2));
    setMontoDistribuir('');
  };

  // Limpiar todos los montos ingresados
  const limpiar = () => {
    Alert.alert('Confirmación', '¿Desea limpiar todos los montos ingresados?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Aceptar', onPress: () => {
          setPagos({})
          setTotalPago(0)
          setMontoDistribuir('')
        }

      },
    ])
  };

  const handleLongPress = (documento, currentPct) => {
    setCurrentDoc(documento);
    setInputDesc(currentPct != null ? String(currentPct) : '');
    setModalVisible(true);
  };

  const confirmModal = () => {
    const pct = parseFloat(inputDesc);
    if (!isNaN(pct) && currentDoc) {
      setManualDescuentos(prev => ({ ...prev, [currentDoc]: pct }));
      setManualDescuentos(prev => ({ ...prev, [currentDoc]: pct }));
      // validar si el pago existente supera el nuevo balance con descuento
      const cuenta = cuentas.find(c => c.f_documento === currentDoc);
      if (cuenta) {
        const balanceConDesc = cuenta.f_balance - (cuenta.f_base_imponible * (pct / 100));
        const pagoActual = parseFloat(pagos[currentDoc] || 0);
        if (pagoActual > balanceConDesc) {
          Alert.alert('Error', 'El pago actual supera el nuevo balance con descuento');
          Alert.alert('Error', 'El pago actual supera el nuevo balance con descuento');
          // Ajustar el pago al balance con descuento
          setPagos(prev => {
            const updated = { ...prev, [currentDoc]: balanceConDesc.toFixed(2) };
            const suma = Object.values(updated)
              .reduce((acc, cur) => acc + (parseFloat(cur) || 0), 0);
            setTotalPago(suma.toFixed(2));
            return updated;
          })
        }
      }
    }
    setModalVisible(false);
  };

  const cancelModal = () => {
    setModalVisible(false);
  };


  const realizarCobranzaLocal = () => {
    if (totalPago <= 0) {
      Alert.alert('Error', 'Seleccione la factura a pagar');
      return
    }

    // 1) arma el detalle completo
    const allDetails = cuentas.map(cuenta => {
      const fechaFactura = parseDateString(cuenta.f_fecha);
      const dias = Math.floor((Date.now() - fechaFactura.getTime()) / (1000 * 60 * 60 * 24));
      const disc = descuentosLocal.find(
        d => dias >= d.f_dia_inicio && dias <= d.f_dia_fin
      );
      const manual = manualDescuentos[cuenta.f_documento];
      let descuentoPct = manual != null ? manual : (disc ? disc.f_descuento1 : 0);
      let valorDescuento = cuenta.f_base_imponible.toFixed(2) * (descuentoPct / 100);
      let balanceConDesc = cuenta.f_balance.toFixed(2) - valorDescuento.toFixed(2);
      const montoPagado = parseFloat(pagos[cuenta.f_documento] || 0);


      if (descuentoPct > 0) {
        const requerido = cuenta.f_balance - valorDescuento;
        if (parseFloat(montoPagado.toFixed(2)) < parseFloat(requerido.toFixed(2))) {
          // invalida el descuento
          descuentoPct = 0;
          valorDescuento = 0;
        }
      }

    

      return {
        documento: cuenta.f_documento,
        monto: montoPagado,
        descuentoPct,
        valorDescuento,
        balanceConDescuento: balanceConDesc,
      };
    });
    // 2) filtra sólo las que tengan un pago (o un descuento válido)


    // tras haber creado allDetails:
    const totalBalanceConDesc = allDetails.reduce((sum, d) =>
      sum + d.balanceConDescuento, 0);
    if (totalPago > totalBalanceConDesc) {
      Alert.alert('Error', 'El monto a aplicar no puede superar el balance total de las facturas');
      return;
    }


    // 2) filtra sólo las que tengan un pago (o un descuento válido)

    const invoiceDetails = allDetails.filter(
      d => d.monto > 0 || d.valorDescuento > 0
    );
    //console.log('▶️ invoiceDetails filtrados:', invoiceDetails);

    navigation.navigate('ConfirmarCobranza', {
      clienteSeleccionado,
      pagos,
      totalPago,
      invoiceDetails,
    });


  };
  useEffect(() => {
    let sumaDescuentos = 0;
    Object.entries(pagos).forEach(([documento, raw]) => {
      const cuenta = cuentas.find(c => c.f_documento === documento);
      if (!cuenta) return;
  
      const fechaFac = parseDateString(cuenta.f_fecha);
      const dias = Math.floor((Date.now() - fechaFac.getTime()) / (1000 * 60 * 60 * 24));
      const disc = descuentosLocal.find(d => dias >= d.f_dia_inicio && dias <= d.f_dia_fin);
      const manual = manualDescuentos[documento];
      let descuentoPct = manual != null
        ? manual
        : (disc ? disc.f_descuento1 : 0);
  
      const montoPagado = parseFloat(raw) || 0;
      if (montoPagado > 0 && descuentoPct > 0) {
        // calcula el valor nominal del descuento
        let valorDescuento = cuenta.f_base_imponible * (descuentoPct / 100);
  
        // valida con la lógica de allDetails: si el pago es insuficiente, anula el descuento
        const requerido = cuenta.f_balance.toFixed(2) - valorDescuento.toFixed(2);
        if (montoPagado.toFixed(2) < requerido.toFixed(2)) {
          descuentoPct = 0;
          valorDescuento = 0;
        }
  
        sumaDescuentos += valorDescuento;
      }
    });
    setTotalDescuento(sumaDescuentos.toFixed(2));
  }, [pagos, descuentosLocal, manualDescuentos, cuentas]);


  if (loading) {
    return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cobranza de Cliente</Text>
        <Text >Total a pagar: {formatear(totalPago)}</Text>
        <Text> Total Descuento: {formatear(totalDescuento)}</Text>
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

          const manual = manualDescuentos[item.f_documento];
          const descuentoPct = manual != null
            ? manual
            : (disc ? disc.f_descuento1 : 0);

          const valorDescuento = item.f_base_imponible.toFixed(2) * (descuentoPct / 100);
          const balanceConDescuento = item.f_balance.toFixed(2) - valorDescuento.toFixed(2);


          // En el cálculo de descuento dentro de renderItem:


          return (
            <View style={styles.item}>
              <View style={{ flex: 2 }}>
                <Pressable
                  onLongPress={() => handleLongPress(item.f_documento, descuentoPct)}
                  delayLongPress={500}>


                  <Text style={{ fontWeight: 'bold' }}>{item.f_documento}</Text>
                  <Text>Fecha: {formatearFecha(item.f_fecha)}</Text>
                  <Text>Monto: {formatear(item.f_monto)}</Text>
                  <Text>Base Imponible: {formatear(item.f_base_imponible)}</Text>
                  {/* <Pressable onPress={() => { console.log(item) }} style={styles.button2}>
                  <Text style={styles.buttonText}>Ver Detalle</Text>
                </Pressable> */}
                  <Text>Balance: {formatear(item.f_balance)}</Text>
                  <Text>Descuento: {descuentoPct}% ({formatear(valorDescuento.toFixed(2))})</Text>
                  <Text style={{ fontWeight: 'bold' }}>Balance c/ descuento: {formatear(balanceConDescuento)}</Text>

                </Pressable>
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

      <Modal transparent visible={modalVisible} animationType="slide">
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ width: '80%', backgroundColor: '#fff', padding: 20, borderRadius: 8 }}>
            <Text>Ingrese nuevo % de descuento</Text>
            <TextInput
              value={inputDesc}
              onChangeText={setInputDesc}
              keyboardType="numeric"
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 8, marginVertical: 10 }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Pressable onPress={cancelModal} style={{ marginRight: 10 }}>
                <Text>Cancelar</Text>
              </Pressable>
              <Pressable onPress={confirmModal}>
                <Text>OK</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, FlatList, Pressable, Alert, SafeAreaView, StyleSheet,
  ActivityIndicator, Modal, Keyboard
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { database } from '../src/database/database';
import { Q } from '@nozbe/watermelondb';
import Ionicons from 'react-native-vector-icons/Ionicons';
import cargarCuentasCobrarLocales from '../src/sincronizaciones/cargarCuentaCobrarLocales';
import { useNavigation } from '@react-navigation/native';
import { formatear, formatearFecha } from '../assets/formatear';


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

  // Helper para calcular y validar descuento
  const calculateDiscount = (cuenta, pagoRaw, descuentoPct) => {
    // 1) Pago redondeado a 2 decimales
    const pago = parseFloat((parseFloat(pagoRaw) || 0).toFixed(2));
    // 2) Valor del descuento redondeado a 2 decimales
    const valorDescuento = parseFloat(
      (cuenta.f_base_imponible * (descuentoPct / 100)).toFixed(2)
    );
    // 3) Monto mínimo requerido para que aplique el descuento
    const requerido = parseFloat(
      (cuenta.f_balance - valorDescuento).toFixed(2)
    );
    // 4) Si el pago es menor al requerido, anulamos el descuento
    if (pago < requerido) {
      return {
        descuentoPct: 0,
        valorDescuento: 0,
        balanceConDescuento: parseFloat(cuenta.f_balance.toFixed(2)),
        montoPagado: pago
      };
    }
    // 5) Si el pago es suficiente, devolvemos valores ya redondeados
    return {
      descuentoPct,
      valorDescuento,
      balanceConDescuento: parseFloat(
        (cuenta.f_balance - valorDescuento).toFixed(2)
      ),
      montoPagado: pago
    };
  };



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

  // Devuelve el balance remanente ya aplicando descuento (igual que en onChangePago y saldar)
  const getBalanceConDescuento = cuenta => {
    const fechaFac = parseDateString(cuenta.f_fecha);
    const dias = Math.floor((Date.now() - fechaFac.getTime()) / (1000 * 60 * 60 * 24));
    // Busca descuento automático
    const disc = cuenta.f_descuento > 0
      ? null
      : descuentosLocal.find(d => dias >= d.f_dia_inicio && dias <= d.f_dia_fin);
    // Busca descuento manual
    const manual = manualDescuentos[cuenta.f_documento];
    const pct = cuenta.f_descuento > 0
      ? 0
      : (manual != null ? manual : (disc ? disc.f_descuento1 : 0));
    return cuenta.f_balance - (cuenta.f_base_imponible * (pct / 100));
  };

  // Retorna el array de f_documento que puedes pagar ahora
  const getEligibleDocuments = () => {
    // 1) Filtra solo las facturas con pago parcial < balanceConDescuento
    const pendientes = cuentas.filter(c => {
      const req = getBalanceConDescuento(c);
      const pagado = parseFloat(pagos[c.f_documento] || 0);
      return pagado < parseFloat(req.toFixed(2));
    });
    if (pendientes.length === 0) return [];
    // 2) Encuentra la fecha mínima de entre las pendientes
    const fechas = pendientes.map(c => parseDateString(c.f_fecha));
    const minFecha = new Date(Math.min(...fechas.map(f => f.getTime())));
    // 3) Devuelve todas las facturas cuya fecha == minFecha
    return pendientes
      .filter(c => parseDateString(c.f_fecha).getTime() === minFecha.getTime())
      .map(c => c.f_documento);
  };





  useEffect(() => {
    if (!clienteSeleccionado?.f_id) return;

    // 1) Carga local inmediata
    setLoading(true);
    loadLocal()
      .then(loadDescuentos)
      .finally(() => setLoading(false));

    // 2) Sincroniza en segundo plano
    cargarCuentasCobrarLocales(clienteSeleccionado.f_id)
      .then(() => {
        // Una vez remotos descargados y volcados, refresca la lista
        loadLocal().then(loadDescuentos).catch(err => console.error('Sync fallida:', err));;
      })
      .catch(err => console.error('Sync fallida:', err));
  }, [clienteSeleccionado]);


  const loadLocal = async () => {
    try {
      const results = await database
        .collections.get('t_cuenta_cobrar')
        .query(Q.where('f_idcliente', clienteSeleccionado.f_id))
        .fetch();

      // Primero filtras las activas
      const activas = results.filter(c => parseFloat(c.f_balance) > 0);

      // Ahora las ordenas por fecha ascendente y, a igualdad de fecha, por documento
      const ordenadas = activas.sort((a, b) => {
        const dateA = parseDateString(a.f_fecha);
        const dateB = parseDateString(b.f_fecha);
        if (dateA < dateB) return -1;
        if (dateA > dateB) return 1;
        // mismo día ⇒ orden alfabético de f_documento
        return a.f_documento.localeCompare(b.f_documento);
      });

      setCuentas(ordenadas);
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

    // 1) Validación de orden de pago
    const montoIntento = parseFloat(raw) || 0;
    const pagosDraft = { ...pagos, [documento]: raw };
    if (montoIntento > 0 || montoIntento === 0) {
      const cuentaActual = cuentas.find(c => c.f_documento === documento);
      const fechaActual = parseDateString(cuentaActual.f_fecha).getTime();

      // Obtener documentos pendientes
      const pendientes = cuentas.filter(c => {
        const req = getBalanceConDescuento(c);
        // usamos pagosDraft aquí
        const pagado = parseFloat(pagosDraft[c.f_documento] || 0);
        return pagado < parseFloat(req.toFixed(2));
      });

      // Encontrar la fecha más antigua
      const minFecha = Math.min(...pendientes.map(c => parseDateString(c.f_fecha).getTime()));

      // Si la factura que se intenta editar NO está entre las más antiguas, bloquear
      if (fechaActual > minFecha) {
        Alert.alert('Error', 'Debe saldar primero la(s) factura(s) más antigua(s).');
        return;
      }

      // Extra: prevenir que facturas más nuevas queden saldadas si esta se borra
      const fechaMinima = minFecha;
      const docActual = documento;

      const pagosIncompatibles = cuentas.filter(c => {
        const fechaC = parseDateString(c.f_fecha).getTime();
        // 1) Pago redondeado a 2 decimales
        const pago = parseFloat((parseFloat(pagos[c.f_documento]) || 0).toFixed(2));
        // 2) Balance con descuento redondeado a 2 decimales
        const balance = parseFloat(getBalanceConDescuento(c).toFixed(2));
        const esOtraFactura = c.f_documento !== docActual;

        // 3) Si es más nueva Y está “fully paid” (pago >= balance) Y no es la que editamos
        return (
          fechaC > fechaMinima &&
          pago >= balance &&
          esOtraFactura
        );
      });



      if (pagosIncompatibles.length > 0) {
        Alert.alert(
          'Error',
          'No puede modificar esta factura mientras otras más recientes estén saldadas.'
        );
        return;
      }
    }




    const fechaFac = parseDateString(cuenta.f_fecha);
    const dias = Math.floor((Date.now() - fechaFac.getTime()) / (1000 * 60 * 60 * 24));
    const disc = cuenta.f_descuento > 0 ? 0 : descuentosLocal.find(d => dias >= d.f_dia_inicio && dias <= d.f_dia_fin);
    const manual = manualDescuentos[documento];
    const descuentoPct = cuenta.f_descuento > 0 ? 0 :
      (manual != null
        ? manual
        : (disc ? disc.f_descuento1 : 0))
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
    // Validación de orden antes de prefijar el pago
    const elegibles = getEligibleDocuments();
    if (!elegibles.includes(documento)) {
      Alert.alert(
        'Error',
        'Debe saldar primero la(s) factura(s) más antigua(s).'
      );
      return;
    }
    const cuenta = cuentas.find(c => c.f_documento === documento);
    if (!cuenta) return;
    const fechaFac = parseDateString(cuenta.f_fecha);
    const dias = Math.floor((Date.now() - fechaFac.getTime()) / (1000 * 60 * 60 * 24));
    const disc = cuenta.f_descuento > 0 ? 0 : descuentosLocal.find(d => dias >= d.f_dia_inicio && dias <= d.f_dia_fin);
    const manual = manualDescuentos[documento];
    const descuentoPct = cuenta.f_descuento > 0 ? 0 :
      (manual != null
        ? manual
        : (disc ? disc.f_descuento1 : 0))
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

      // --- Nuevo bloque START ---
      // 1) Días desde la factura
      const fechaFac = parseDateString(cuenta.f_fecha);
      const dias = Math.floor((Date.now() - fechaFac.getTime()) / (1000 * 60 * 60 * 24));

      // 2) Descuento automático (si aplica)
      const disc = cuenta.f_descuento > 0
        ? null
        : descuentosLocal.find(d => dias >= d.f_dia_inicio && dias <= d.f_dia_fin);

      // 3) Descuento manual (si el usuario lo puso)
      const manual = manualDescuentos[cuenta.f_documento];

      // 4) Porcentaje inicial a pasar al helper
      const initialPct = manual != null
        ? manual
        : (disc ? disc.f_descuento1 : 0);

      // 5) Obtenemos el balance ya con descuento
         // ✅ calcular _directamente_ el balance con descuento (igual que en renderItem/onChangePago)
   const valorDescuento    = cuenta.f_base_imponible * (initialPct / 100);
   const balanceConDescuento = cuenta.f_balance - valorDescuento;
      // --- Nuevo bloque END ---

      const asignado = Math.min(restante, balanceConDescuento);
      nuevos[cuenta.f_documento] = asignado.toFixed(2);
      restante = parseFloat((restante - asignado).toFixed(2));
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
          setManualDescuentos({})
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
      const cuenta = cuentas.find(c => c.f_documento === currentDoc);
      const fechaFac = parseDateString(cuenta.f_fecha);
      const dias = Math.floor((Date.now() - fechaFac.getTime()) / (1000 * 60 * 60 * 24));
      const disc = descuentosLocal.find(d => dias >= d.f_dia_inicio && dias <= d.f_dia_fin);

      console.log('Descuento manualL:', pct, 'disc', disc.f_descuento1);

      const maxAutomatic = disc ? disc.f_descuento1 : 0;

      if (pct > maxAutomatic) {
        Alert.alert('Error', 'El descuento manuaLl no puede ser mayor que el descuento automático');
        return;
      }

      console.log('Descuento manual:', pct, 'disc', disc.f_descuento1);

      setManualDescuentos(prev => ({ ...prev, [currentDoc]: pct }));
      // validar si el pago existente supera el nuevo balance con descuento

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
      const raw = pagos[cuenta.f_documento] || 0;
      const initialPct = manual != null ? manual : (disc ? disc.f_descuento1 : 0);
      const {
        descuentoPct,
        valorDescuento,
        balanceConDescuento,
        montoPagado
      } = calculateDiscount(cuenta, raw, initialPct);

      return {
        documento: cuenta.f_documento,
        monto: montoPagado,
        descuentoPct,
        valorDescuento,
        balanceConDescuento,
        balance: cuenta.f_balance
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
    Keyboard.dismiss();
    navigation.navigate('ConfirmarCobranza', {

      clienteSeleccionado,
      pagos,
      totalPago,
      invoiceDetails,
      totalDescuento,      // <-- agregamos aquí
    });


  };
  useEffect(() => {
    let sumaDescuentos = 0;
    Object.entries(pagos).forEach(([documento, raw]) => {
      const cuenta = cuentas.find(c => c.f_documento === documento);
      if (!cuenta) return;

      // 1) Días desde la factura
      const fechaFactura = parseDateString(cuenta.f_fecha);
      const dias = Math.floor((Date.now() - fechaFactura.getTime()) / (1000 * 60 * 60 * 24));

      // 2) Descuento automático
      const disc = cuenta.f_descuento > 0
        ? null
        : descuentosLocal.find(d => dias >= d.f_dia_inicio && dias <= d.f_dia_fin);

      // 3) Descuento manual
      const manual = manualDescuentos[documento];

      // 4) % inicial
      const initialPct = manual != null
        ? manual
        : (disc ? disc.f_descuento1 : 0);

      const { descuentoPct, valorDescuento } = calculateDiscount(cuenta, raw, initialPct);

      if (descuentoPct > 0) {
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
        {/* Agrupamos los textos en su propio contenedor */}
        <View style={styles.headerContent}>
          <Text style={styles.title}>Cobranza de Cliente</Text>
          <Text>Total a pagar: {formatear(totalPago)}</Text>
          <Text>Total Descuento: {formatear(totalDescuento)}</Text>
        </View>

        {/* Ahora el distribuirContainer es un sibling */}
        <View style={styles.distribuirContainer}>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="Monto distribuir"
            value={montoDistribuir}
            onChangeText={setMontoDistribuir}
          />
          <View style={styles.buttonsRow}>
            <Pressable onPress={distribuirPagos} style={styles.button}>
              <Text style={styles.buttonText}>Distribuir</Text>
            </Pressable>
            <Pressable onPress={limpiar} style={[styles.button, styles.clearButton]}>
              <Ionicons name="trash-outline" size={24} color="#fff" />
            </Pressable>
          </View>
        </View>
      </View>

      <FlashList
        data={cuentas}
        // 1) Para que re-renderice cada vez que pagos cambie:
        extraData={[pagos, manualDescuentos]}
        // 2) Tamaño medio estimado de cada fila (px) — ajústalo a tu layout:
        estimatedItemSize={30}
          initialNumToRender={8}
          windowSize={8}
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
          const descuentoPct = item.f_descuento > 0 ? 0 :
            (manual != null
              ? manual
              : (disc ? disc.f_descuento1 : 0));

          const valorDescuento = item.f_descuento > 0 ? 0 : (item.f_base_imponible.toFixed(2) * (descuentoPct / 100));
          const balanceConDescuento = item.f_balance.toFixed(2) - valorDescuento.toFixed(2);
          const descuentoTransp = item.f_descuento
          const isPaid = pagos[item.f_documento] == balanceConDescuento.toFixed(2);



          // En el cálculo de descuento dentro de renderItem:


          return (
            <View style={styles.item}>
              <View style={{ flex: 2 }}>
                <Pressable
                  onLongPress={() => handleLongPress(item.f_documento, descuentoPct)}
                  delayLongPress={500}>


                  <Text style={{ fontWeight: 'bold' }}>{item.f_documento}</Text>
                  <Text>Fecha: {formatearFecha(item.f_fecha)}  ({diasTranscurridos} dias)</Text>
                  <Text>Monto: {formatear(item.f_monto)}</Text>
                  <Text>Base Imponible: {formatear(item.f_base_imponible)}</Text>
                  {/* <Pressable onPress={() => { console.log(item) }} style={styles.button2}>
                  <Text style={styles.buttonText}>Ver Detalle</Text>
                </Pressable> */}
                  <Text>Balance: {formatear(item.f_balance)}</Text>
                  <Text>Descuento: {descuentoPct}% ({formatear(valorDescuento.toFixed(2))})</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {descuentoTransp > 0 ? <Text style={{ fontWeight: 'bold' }}>Descuento Transp.: {formatear(descuentoTransp)}</Text> : null}
                  </View>
                  <Text style={{ fontWeight: 'bold' }}>Balance c/ descuento: {formatear(balanceConDescuento)}</Text>

                </Pressable>
              </View>
              <View style={{ alignItems: 'center', flex: 1 }}>
                <TextInput
                  style={[styles.input2, isPaid ? { borderColor: 'green', borderWidth: 3 } : {}]}
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
  header: {
    flexDirection: 'row',           // layout horizontal
    justifyContent: 'space-between',// separa bloques
    alignItems: 'center',           // centra verticalmente
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  headerContent: {
    flex: 2,                        // ocupa espacio antes de distribuirContainer
  },

  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  distribuirContainer: {
    flex: 1,
    
    flexDirection: 'column',    // apila verticalmente
    alignItems: 'flex-end',     // alinea contenido a la derecha
    justifyContent: 'center',
  },
  item: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', marginBottom: 4 },
  input: {
    width: 120,            // ancho fijo para que siempre se vea
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
  },
    buttonsRow: {
        flexDirection: 'row',       // botones lado a lado
        marginTop: 8,               // separación del input
      },
  button: { backgroundColor: '#007AFF', padding: 8, borderRadius: 8, alignItems: 'center', height: 38 },
  input2: { width: 80, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 8, marginHorizontal: 8, width: '90%' },
  button2: { backgroundColor: '#007AFF', padding: 8, borderRadius: 8, width: '90%', alignItems: 'center', marginTop: 8 },
  clearButton: { marginLeft: 8, backgroundColor: '#FF3B30' },
  buttonText: { color: '#fff' },
  footerButton: { backgroundColor: '#007AFF', padding: 16, alignItems: 'center' },
  footerText: { color: '#fff', fontWeight: 'bold' }
});

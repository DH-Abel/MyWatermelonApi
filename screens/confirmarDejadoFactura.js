// ConfirmarDejadoFactura.js
import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Alert,
  FlatList,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { database } from '../src/database/database';
import { Q } from '@nozbe/watermelondb';
import { formatear, formatearFecha } from '../assets/formatear';
import { printTest } from './funciones/print';
import { rDejado } from './reportes/rDejado';
import { getVendedor1 } from '../src/sincronizaciones/secuenciaHelper';
import { AuthContext } from './context/AuthContext';


/*
  Este componente recibe por route.params:
   - clienteSeleccionado: Objeto con datos del cliente (incluye f_id y f_vendedor).
   - facturasSeleccionadas: Array de objetos { documento, fecha, monto, balance }
     correspondientes a las facturas marcadas en “DejarFactura.js”.
*/

export default function ConfirmarDejadoFactura() {
  const navigation = useNavigation();
  const route = useRoute();
  const { clienteSeleccionado, facturasSeleccionadas } = route.params;

  // Estado para la observación que el usuario quiera agregar al registro padre
  const [observacion, setObservacion] = useState('');
  // Para mostrar indicador de guardado
  const [isSaving, setIsSaving] = useState(false);

  // Totales calculados a partir de facturasSeleccionadas
  const [totalMonto, setTotalMonto] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);

  // Fecha de hoy en formato 'dd/mm/yyyy'
  const fechaHoy = new Date().toLocaleDateString('en-GB');

  const [clientesMap, setClientesMap] = useState({});

  const { user } = useContext(AuthContext)


  // Carga todos los clientes en un mapa para impresión
  useEffect(() => {
    (async () => {
      try {
        const allClients = await database.collections.get('t_clientes').query().fetch();
        const map = {};
        allClients.forEach(c => map[c.f_id] = c._raw);
        setClientesMap(map);
      } catch (e) {
        console.error("Error cargando clientes para impresión:", e);
      }
    })();
  }, []);


  useEffect(() => {
    // Al montar, calculamos totales de monto y balance
    const sumaMonto = facturasSeleccionadas.reduce(
      (acc, f) => acc + parseFloat(f.monto),
      0
    );
    const sumaBalance = facturasSeleccionadas.reduce(
      (acc, f) => acc + parseFloat(f.balance),
      0
    );
    setTotalMonto(parseFloat(sumaMonto.toFixed(2)));
    setTotalBalance(parseFloat(sumaBalance.toFixed(2)));
  }, [facturasSeleccionadas]);

  // Función que se ejecuta al presionar “Guardar” (similar a la lógica de creación en ConfirmarCobranza.js )
  const guardarDejado = async () => {
    if (facturasSeleccionadas.length === 0) {
      Alert.alert('Error', 'No hay facturas seleccionadas para dejar.');
      return;
    }

    try {
      setIsSaving(true);

      // Generamos un ID/número para el documento. Temporalmente usamos timestamp modificado.
      const nodoc = Date.now() % 1000000; // hasta seis dígitos
      const tipodoc = 'DEJAD'; // valor fijo mientras no se implemente t_secuencias :contentReference[oaicite:1]{index=1}
      const f_documento = `${tipodoc}${String(nodoc).padStart(6, '0')}`;

      // Preparamos variables para impresión
      let nuevoDejado = null;
      const detallesAGuardar = [];
      const { vendedor } = await getVendedor1(user);

      // Escribimos en la base de datos local (watermelondb)
      await database.write(async () => {

        // 1) Creación del registro padre en t_dejar_factura_pda :contentReference[oaicite:2]{index=2}
        const dejarCol = database.collections.get('t_dejar_factura_pda');
        const padre = await dejarCol.create(df => {
          df.f_id = nodoc;
          df.f_cliente = clienteSeleccionado.f_id;
          df.f_fecha = fechaHoy;
          df.f_monto = totalMonto;
          df.f_balance = totalBalance;
          df.f_documento = f_documento;
          df.f_vendedor = vendedor;
          df.f_enviado = false;
          df.f_observacion = observacion;
        });

        // Construimos objeto plano para impresión
        nuevoDejado = {
          f_id: padre.f_id,
          f_cliente: padre.f_cliente,
          f_fecha: padre.f_fecha,
          f_monto: padre.f_monto,
          f_balance: padre.f_balance,
          f_documento: padre.f_documento,
          f_vendedor: padre.f_vendedor,
          f_observacion: padre.f_observacion,
        };

        // 2) Creación de cada detalle en t_det_dejar_factura_pda :contentReference[oaicite:4]{index=4}
        const detCol = database.collections.get('t_det_dejar_factura_pda');
        for (const fac of facturasSeleccionadas) {
          await detCol.create(det => {
            det.f_documento = f_documento;
            det.f_factura = fac.documento;
            det.f_fecha = fac.fecha;
            det.f_monto = parseFloat(fac.monto);
            det.f_balance = parseFloat(fac.balance);
          });
          detallesAGuardar.push({
            factura: fac.documento,
            fecha: fac.fecha,
            monto: parseFloat(fac.monto),
            balance: parseFloat(fac.balance),
          });
        }
      });

      setIsSaving(false);
      // Generar e imprimir el ticket usando el mismo print.js



      Alert.alert('Éxito', '“Dejado de Factura” guardado correctamente.', [
        {
          text: 'OK',
          onPress: () => {
            // Regresamos a la primera pestaña del flow y reseteamos el stack
            const ticket = rDejado(nuevoDejado, detallesAGuardar, clientesMap);
            printTest(ticket).catch(err => console.error('Error al imprimir ticket:', err)).
              then(() => navigation.reset({
                index: 1,
                routes: [
                  { name: 'MenuPrincipal' },        // primera en el historial
                  { name: 'ConsultaDejadosFactura' }       // activa, a la que llegarás
                ],
              }));

          },
        },
      ]);
    } catch (err) {
      console.error('Error al guardar Dejado de Factura:', err);
      setIsSaving(false);
      Alert.alert('Error', 'Ocurrió un problema al guardar el “Dejado de Factura”.');
    }
  };

  // Render de cada factura en el FlatList
  const renderFactura = ({ item }) => (
    <View style={styles.itemContainer}>
      <View style={styles.infoContainer}>
        <Text style={styles.documentoText}>{item.documento}</Text>
        <Text>Fecha: {formatearFecha(item.fecha)}</Text>
        <Text>Monto: {formatear(item.monto)}</Text>
        <Text>Balance: {formatear(item.balance)}</Text>
      </View>
    </View>
  );

  // Si todavía está guardando, mostramos indicador
  if (isSaving) {
    return <ActivityIndicator size="large" style={styles.loading} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header con datos del cliente y totales */}
      <View style={styles.header}>
        <Text style={styles.title}>Confirmar “Dejar Factura”  ({fechaHoy})</Text>
        <Text style={styles.subtitle}>
          Cliente: ({clienteSeleccionado.f_id}) {clienteSeleccionado.f_nombre}
        </Text>
        <Text style={styles.subtitle}>
          Total Monto: {formatear(totalMonto)}
        </Text>
              <Text style={styles.subtitle}>
         Total Balance: {formatear(totalBalance)}
        </Text>
      </View>

      {/* Listado de facturas seleccionadas */}
      <FlatList
        data={facturasSeleccionadas}
        keyExtractor={(item) => item.documento}
        renderItem={renderFactura}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No hay facturas para confirmar.</Text>
        }
        style={styles.list}
      />

      {/* Campo para agregar observación */}
      <View style={styles.observacionContainer}>
        <Text style={styles.label}>Observación (opcional):</Text>
        <TextInput
          style={styles.input}
          placeholder="Escribe una observación..."
          value={observacion}
          onChangeText={setObservacion}
          multiline
        />
      </View>

      {/* Botón de “Guardar” */}
      <View style={styles.footer}>
        <Pressable
          onPress={guardarDejado}
          style={({ pressed }) => [
            styles.buttonSave,
            pressed ? { opacity: 0.7 } : {},
          ]}
        >
          <Text style={styles.buttonText}>Guardar “Dejado”</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fb',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomColor: '#ddd',
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
    color: '#555',
  },
  list: {
    flex: 1,
    marginVertical: 8,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoContainer: {
    marginLeft: 4,
    flex: 1,
  },
  documentoText: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 2,
    color: '#222',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#777',
  },
  observacionContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
    color: '#333',
  },
  footer: {
    padding: 16,
    borderTopColor: '#ddd',
    borderTopWidth: 1,
    backgroundColor: '#fff',
  },
  buttonSave: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

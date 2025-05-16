import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, ActivityIndicator, SafeAreaView,
  Pressable, Modal, Alert, PermissionsAndroid,InteractionManager
} from 'react-native';
import { database } from '../src/database/database';
import { Q } from '@nozbe/watermelondb';
import NetInfo from '@react-native-community/netinfo';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Ionicons from 'react-native-vector-icons/Ionicons';
import { formatear } from '../assets/formatear';
import { consultaStyles } from '../assets/consultaStyles';
import { enviarPedido } from '../src/sincronizaciones/enviarPedido';
import sincronizarEstado from '../src/sincronizaciones/estadoPedido';
import { PrinterExample } from './funciones/print'
import { printTest } from './funciones/print';
import { rPedido } from './reportes/rPedido';





export default function Pedidos({ navigation }) {
  const [pedidos, setPedidos] = useState([]);
  const [fullPedidos, setFullPedidos] = useState([]); //Nuevo estado para almacenar todos los pedidos
  const [loading, setLoading] = useState(true);

  // Estados para filtro por fecha
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [isStartPickerVisible, setIsStartPickerVisible] = useState(false);
  const [isEndPickerVisible, setIsEndPickerVisible] = useState(false);

  // Estados para el modal de detalle
  const [detalleModalVisible, setDetalleModalVisible] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [detallePedido, setDetallePedido] = useState([]);
  const [detalleLoading, setDetalleLoading] = useState(false);

  const [productosMap, setProductosMap] = useState({});
  const [clientesMap, setClientesMap] = useState({});


  const parseDateFromDDMMYYYY = (dateStr) => {
    const [day, month, year] = dateStr.split('/');
    const d = new Date(year, month - 1, day);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const condicionPedido = [
    { id: 0, nombre: 'Contado' },
    { id: 1, nombre: 'Crédito' },
    { id: 2, nombre: 'Contra entrega' },
    { id: 3, nombre: 'Vuelta viaje' },
  ]

  const condicionPedidoMap = {};
  condicionPedido.forEach(item => {
    condicionPedidoMap[item.id] = item;
  });



  const filtrarPedidosPorFecha = async () => {
    const facturaCollection = database.collections.get('t_factura_pedido');
    const allPedidos = await facturaCollection.query().fetch();
    setFullPedidos(allPedidos);
  };

  // MODIFICADO: Función cargarEstado para asignar a fullPedidos

  const cargarEstado = async () => {
    const netState = await NetInfo.fetch();
    if (netState.isConnected) {
      try {
        if (pedidos.length > 0) {
        await sincronizarEstado(pedidos);
        const facturaCollection = database.collections.get('t_factura_pedido');
        const allPedidos = await facturaCollection.query().fetch();
        setFullPedidos(allPedidos);
        }else {
          console.log("No hay pedidos para sincronizar");
        }
      } catch (error) {
        console.error("Error al sincronizar, se mantienen los estados locales:", error);
      }
    }
  };
  //select * from t_clientes




  const cargarProductosMap = async () => {
    try {
      console.log("Cargando productos...");
      const productosCollection = database.collections.get('t_productos_sucursal');
      const allproductos = await productosCollection.query().fetch();
      const mapping = {};
      allproductos.forEach(producto => { mapping[producto.f_referencia] = producto._raw });
      setProductosMap(mapping);
      console.log("Productos cargados");
    } catch (error) {
      console.error("Error al obtener los productos:", error);
    }
  }

  const cargarClientesMap = async () => {
    try {
      console.log("Cargando clientes...");
      const clientesCollection = database.collections.get('t_clientes');
      const allClientes = await clientesCollection.query().fetch();
      const mappingClientes = {};
      allClientes.forEach(cliente => { mappingClientes[cliente.f_id] = cliente._raw });
      setClientesMap(mappingClientes);
      console.log("Clientes cargados");
    } catch (error) {
      console.error("Error al obtener los clientes:", error);
    }
  }

  const handleEditarPedido = async (pedidoItem) => {
    if (pedidoItem._raw.f_enviado) {
      Alert.alert("Pedido en empresa", "Ya este pedido se encuentra en la empresa, no puede ser editado")
      return;
    }
    try {
      // Consulta los detalles del pedido
      const detalleCollection = database.collections.get('t_detalle_factura_pedido');
      const detalles = await detalleCollection.query(
        Q.where('f_documento', pedidoItem.f_documento)
      ).fetch();

      // Convierte los detalles en el formato que usa el estado "pedido" en Pedido.js.
      // Por ejemplo, un objeto indexado por f_referencia:
      const pedidoEdit = {};
      detalles.forEach(det => {
        pedidoEdit[det.f_referencia] = {
          f_referencia: det.f_referencia,
          cantidad: det.f_cantidad,
          // Usamos f_precio de la tabla de detalles; asume que es equivalente a f_precio5
          f_precio5: det.f_precio,
          // Si lo requieres, puedes agregar otros campos (por ejemplo, descripción) o luego se cargarán desde productos locales.
        };
      });

      // Construye el objeto orderToEdit a partir del encabezado y el detalle.
      const orderToEdit = {
        id: pedidoItem.id, // Asegúrate de que este campo exista o usa pedidoItem._raw.id
        f_documento: pedidoItem.f_documento,
        f_fecha: pedidoItem.f_fecha,
        f_hora_vendedor: pedidoItem.f_hora_vendedor,
        f_monto: pedidoItem.f_monto,
        f_descuento: pedidoItem.f_descuento,
        f_observacion: pedidoItem.f_observacion,
        // Agrega otros campos necesarios del encabezado si lo requieres.
        pedido: pedidoEdit, // Aquí se guardan los detalles del pedido
      };

      // Asumiendo que ya tienes un mapping de clientes en ConsultaPedidos (por ejemplo, en clientesMap)
      const clienteSeleccionado = clientesMap[pedidoItem.f_cliente] || {};

      // Navega a MainTabs pasando el cliente y el orderToEdit en los parámetros de ruta.
      navigation.navigate('MainTabs', { clienteSeleccionado, orderToEdit });
    } catch (error) {
      console.error("Error al preparar la edición del pedido:", error);
    }
  };


  const handleEnviarPedido = async (pedidoItem) => {
    try {
      // Obtener el detalle del pedido desde la base de datos
      const detalleCollection = database.collections.get('t_detalle_factura_pedido');
      const detalles = await detalleCollection.query(
        Q.where('f_documento', pedidoItem.f_documento)
      ).fetch();

      // Transformar el detalle al formato que espera enviarPedido
      const productosPedido = detalles.map(det => ({
        f_referencia: det.f_referencia,
        cantidad: det.f_cantidad,
        f_precio: det.f_precio,
      }));



      // Preparar los parámetros usando los datos del pedidoItem
      const documento = pedidoItem.f_documento;
      const fechaActual = pedidoItem.f_fecha;
      const computedItbis = pedidoItem.f_itbis;
      const computedDescuentoAplicado = pedidoItem.f_descuento;
      const descuentoGlobal = pedidoItem.f_porc_descuento;
      const computedTotalNeto = pedidoItem.f_monto;
      const totalBruto = pedidoItem.f_monto_bruto;
      // Supongamos que tienes un mapping de clientes (clientesMap) ya cargado:
      const clienteSeleccionado = clientesMap[pedidoItem.f_cliente];
      // Si el pedido guarda la condición y la nota, se pueden extraer directamente; de lo contrario, asigna valores por defecto
      const condicionSeleccionada = { id: pedidoItem.f_condicion };
      const nota = pedidoItem.f_observacion;


      const facturaCollection = database.collections.get('t_factura_pedido');
      const allPedidos = await facturaCollection.query().fetch();
      console.log("Todos los pedidos (f_fecha):", allPedidos.map(p => p.f_fecha || p._raw.f_fecha));



      async function requestBluetoothPermission() {
        if (Platform.OS === 'android' && Platform.Version >= 31) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            {
              title: 'Permiso para usar Bluetooth',
              message: 'Esta app necesita acceso Bluetooth para conectarse a la impresora.',
              buttonPositive: 'OK',
            },
          );
          // Puedes también solicitar BLUETOOTH_SCAN si planeas buscar nuevos dispositivos
        }
      }






      // Llama a la función enviarPedido
      await enviarPedido({
        productosPedido,
        documento,
        fechaActual,
        computedItbis,
        computedDescuentoAplicado,
        descuentoGlobal,
        computedTotalNeto,
        clienteSeleccionado,
        condicionSeleccionada,
        nota,
        totalBruto,
        // Como en consulta de pedidos no manejas estos estados, puedes pasar funciones vacías o realizar otra acción
        setPedido: () => { },
        setModalVisible: () => { },
        setClienteSeleccionado: () => { },
        setBalanceCliente: () => { },
        setDescuentoCredito: () => { },
        navigation,
        setIsSaving: () => { },
        pedido: pedidoItem._raw,
      });
    } catch (error) {
      console.error("Error al enviar el pedido:", error);
    }
  };



  useEffect(() => {
    async function obtenerTodosLosPedidos() {
      const facturaCollection = database.collections.get('t_factura_pedido');
      const todosLosPedidos = await facturaCollection.query().fetch();
      console.log("Todos los pedidos:", todosLosPedidos.map(p => p.f_fecha));
    }
    obtenerTodosLosPedidos();
  }, []);



  useEffect(() => {
  const facturaCollection = database.collections.get('t_factura_pedido');
  const subscription = facturaCollection
    .query()
    .observe()
    .subscribe((allPedidos) => {
      setFullPedidos(allPedidos);
      setLoading(false);

      // ⇨ cargar mapas solo después de que la UI haya respondido
      InteractionManager.runAfterInteractions(() => {
        cargarProductosMap();
        cargarClientesMap();
      });
    });

  return () => subscription.unsubscribe();
}, []);


  useEffect(() => {
    cargarEstado();
  }, [])

  useEffect(() => {
    const normalizedStartDate = new Date(startDate);
    normalizedStartDate.setHours(0, 0, 0, 0);
    const normalizedEndDate = new Date(endDate);
    normalizedEndDate.setHours(23, 59, 59, 999);

    const filtered = fullPedidos.filter(p => {
      const fechaStr = p.f_fecha || p._raw.f_fecha;
      const fechaPedido = parseDateFromDDMMYYYY(fechaStr);
      return fechaPedido >= normalizedStartDate && fechaPedido <= normalizedEndDate;
    });
    setPedidos(filtered);
  }, [fullPedidos, startDate, endDate]);

  // Función para consultar los detalles del pedido seleccionado
  const fetchDetallePedido = async (f_documento) => {
    setDetalleLoading(true);
    try {
      const detalleCollection = database.collections.get('t_detalle_factura_pedido');
      const detalles = await detalleCollection.query(
        Q.where('f_documento', f_documento)
      ).fetch();
      setDetallePedido(detalles);
      return detalles;  // Retornamos los detalles para poder usarlos en la impresión
    } catch (error) {
      console.error("Error al obtener el detalle del pedido:", error);
      return [];
    } finally {
      setDetalleLoading(false);
    }
  };


  // Función para abrir el modal de detalles
  const openDetalleModal = (pedido) => {
    // Enviamos los datos planos usando _raw (o extraemos los campos necesarios)
    const pedidoPlana = pedido._raw;
    setSelectedPedido(pedidoPlana);
    fetchDetallePedido(pedidoPlana.f_documento);
    setDetalleModalVisible(true);
  };

  const imprimirPedidoDesdeLista = async (pedido) => {
    // Usamos (pedido._raw || pedido) para asegurarnos de obtener el objeto plano
    const pedidoPlana = pedido._raw || pedido;
    console.log("Imprimiendo pedido:", pedidoPlana);
    
    const fDoc = pedidoPlana.f_documento;
    console.log("Valor de f_documento:", fDoc);
    
    // Llamamos a la función que obtiene los detalles
    const detalles = await fetchDetallePedido(fDoc);
    console.log("Detalles obtenidos:", detalles);
    
    if (!pedidoPlana || !detalles || detalles.length === 0) {
      Alert.alert("Error", "No hay datos del pedido para imprimir");
      return;
    }
    
    // Genera el reporte utilizando la función rPedido
    const reporte = rPedido(pedidoPlana, detalles, productosMap,clientesMap);
    console.log("Reporte generado:", reporte);
    
    // Envía el reporte a la impresora
    printTest(reporte);
  };
  


  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  const pedidosOrdenados = [...pedidos].sort((a, b) => {
    // Función para convertir un pedido en objeto Date
    function parseDateTime(pedido) {
      // Se obtiene la fecha y la hora (puedes ajustarlo según donde estén almacenados)
      const fechaStr = pedido.f_fecha || pedido._raw.f_fecha;
      const horaStr = pedido.f_hora_vendedor || pedido._raw.f_hora_vendedor;

      // Parsear la fecha "dd/mm/yyyy"
      const [day, month, year] = fechaStr.split('/');

      // Parsear la hora; si no existe, asumimos 00:00:00
      let hour = 0, minute = 0, second = 0;
      if (horaStr) {
        const parts = horaStr.split(':');
        hour = parseInt(parts[0], 10);
        minute = parseInt(parts[1], 10);
        if (parts[2]) {
          second = parseInt(parts[2], 10);
        }
      }
      // Crear el objeto Date con la fecha y hora
      return new Date(year, month - 1, day, hour, minute, second);
    }

    // Convertir cada pedido en su objeto Date y compararlos
    const dateA = parseDateTime(a);
    const dateB = parseDateTime(b);

    // Orden descendente (el más reciente primero)
    return dateB - dateA;
  });


  return (
    <SafeAreaView style={consultaStyles.container}>
      {/* Encabezado */}
      <View style={consultaStyles.headerCard}>
        <View style={consultaStyles.headerRow}>
          <Text style={consultaStyles.headerTitle}>Pedidos Realizados</Text>
          <View style={consultaStyles.headerButtons}>
            <Pressable onPress={() => cargarEstado()} style={consultaStyles.headerButton}>
              <Ionicons name="sync-outline" size={24} color="#fff" />
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('SelectClientScreen')}
              style={consultaStyles.headerButton}
            >
              <Ionicons name="add-circle-outline" size={24} color="#fff" />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Filtro por Fecha */}
      <View style={consultaStyles.filterCard}>
        <Pressable onPress={() => setIsStartPickerVisible(true)} style={consultaStyles.dateButton}>
          <Text style={consultaStyles.dateText}>
            {startDate ? startDate.toDateString() : 'Fecha Inicial'}
          </Text>
        </Pressable>
        <Pressable onPress={() => setIsEndPickerVisible(true)} style={consultaStyles.dateButton}>
          <Text style={consultaStyles.dateText}>
            {endDate ? endDate.toDateString() : 'Fecha Final'}
          </Text>
        </Pressable>
        {/* <Pressable onPress={filtrarPedidosPorFecha} style={consultaStyles.filterButton}>
        <Ionicons name="filter-outline" size={24} color="#fff" />
      </Pressable> */}
      </View>

      {/* Pickers de Fecha */}
      <DateTimePickerModal
        isVisible={isStartPickerVisible}
        mode="date"

        onConfirm={(date) => {
          setStartDate(date);
          setIsStartPickerVisible(false);
        }}
        onCancel={() => setIsStartPickerVisible(false)}
      />
      <DateTimePickerModal
        isVisible={isEndPickerVisible}
        mode="date"
        onConfirm={(date) => {
          setEndDate(date);
          setIsEndPickerVisible(false);
        }}
        onCancel={() => setIsEndPickerVisible(false)}
      />

      {/* Listado de Pedidos */}
      <FlatList
        data={pedidosOrdenados}
        keyExtractor={(item) => item.f_documento.toString()}
        renderItem={({ item }) => {
          const cliente = clientesMap[item.f_cliente] || {};
          return (
            <Pressable onPress={() => openDetalleModal(item)}>

              <View style={consultaStyles.pedidoCard}>
                {/* Sección de Título: Documento y Nombre del Cliente */}
                <View style={consultaStyles.pedidoTitleSection}>
                  <Text style={consultaStyles.pedidoTitle}>Documento: {item.f_documento}</Text>
                  <Text style={consultaStyles.pedidoTitle}>
                    Cliente: ({item.f_cliente}) {cliente.f_nombre}
                  </Text>
                </View>

                {/* Sección de Información y Botones */}
                <View style={consultaStyles.pedidoInfoSection}>
                  {/* Información: fecha, hora, total, etc. */}
                  <View style={{ flex: 1 }}>
                    <Text style={consultaStyles.pedidoText}>
                      Fecha: {item.f_fecha} - {item.f_hora_vendedor}
                    </Text>
                    <Text style={consultaStyles.pedidoText}>
                      Total: {formatear(item.f_monto)}
                    </Text>
                    <Text style={consultaStyles.pedidoText}>
                      Estado: {item.f_estado_pedido} || Factura: {item.f_factura}
                    </Text>

                    <Text style={consultaStyles.pedidoText}>
                      Enviado: {item._raw.f_enviado ? 'Sí' : 'No'}
                    </Text>
                  </View>
                  {/* Botones pequeños en columna */}
                  <View style={consultaStyles.pedidoButtonColumn}>

                    <Pressable onPress={() => handleEditarPedido(item)} style={consultaStyles.pedidoSmallButton}>
                      <Ionicons name="create-outline" size={23} color="#fff" />
                    </Pressable>
                    <Pressable
                      onPress={() => imprimirPedidoDesdeLista(item)}
                      style={consultaStyles.pedidoSmallButton}
                    >
                      <Ionicons name="print-outline" size={23} color="#fff" />
                    </Pressable>



                    <Pressable onPress={() => {
                      handleEnviarPedido(item); cargarEstado()
                    }} style={consultaStyles.pedidoSmallButton}>
                      <Ionicons name="send-outline" size={23} color="#fff" />
                    </Pressable>
                  </View>
                </View>
              </View>
            </Pressable>

          );
        }}
      />

      {/* Modal de Detalle de Pedido */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={detalleModalVisible}
        onRequestClose={() => setDetalleModalVisible(false)}
      >
        <SafeAreaView style={consultaStyles.modalContainer}>
          <View style={consultaStyles.modalContent}>
            {selectedPedido ? (
              <>
                <Text style={consultaStyles.modalTitle}>🛒 Detalle del Pedido</Text>
                <Text style={consultaStyles.modalText}>
                  Documento: {selectedPedido.f_documento}
                </Text>
                <Text style={consultaStyles.modalText}>
                  Cliente: {selectedPedido.f_cliente}
                </Text>
                <Text style={consultaStyles.modalText}>
                  Fecha: {selectedPedido.f_fecha}
                </Text>
                <Text style={consultaStyles.modalText}>
                  Condición: {condicionPedido[selectedPedido.f_condicion].nombre} | Estado: {selectedPedido.f_estado}
                </Text>
                <Text style={consultaStyles.modalText}>
                  Subtotal: {formatear(selectedPedido.f_monto - selectedPedido.f_itbis)}
                </Text>
                <Text style={consultaStyles.modalText}>
                  ITBIS: {formatear(selectedPedido.f_itbis)}
                </Text>
                <Text style={consultaStyles.modalText}>
                  Total: {formatear(selectedPedido.f_monto)}
                </Text>
                <Text style={consultaStyles.modalText}>
                  Nota: {selectedPedido.f_observacion}
                </Text>
                <Text style={consultaStyles.modalSubtitle}>Productos del Pedido:</Text>
                {detalleLoading ? (
                  <ActivityIndicator size="large" style={{ marginTop: 20 }} />
                ) : detallePedido.length > 0 ? (
                  <FlatList
                    data={detallePedido}
                    keyExtractor={(det) =>
                      det.id ? det.id.toString() : det.f_referencia.toString()
                    }
                    renderItem={({ item: det }) => {
                      const producto = productosMap[det.f_referencia] || {};
                      return (
                        <View style={consultaStyles.modalProductCard}>
                          <Text style={consultaStyles.modalProductText}>
                            ({det.f_referencia}) {producto.f_referencia_suplidor || 'N/A'}
                          </Text>
                          <Text style={consultaStyles.modalProductText}>
                            Descripción: {producto.f_descripcion || 'N/A'}
                          </Text>
                          <Text style={consultaStyles.modalProductText}>
                            Cantidad: {det.f_cantidad}
                          </Text>
                          <Text style={consultaStyles.modalProductText}>
                            Precio: {formatear(det.f_precio)} Total: {formatear(Number(det.f_precio) * Number(det.f_cantidad))}
                          </Text>
                        </View>
                      );
                    }}
                  />
                ) : (
                  <Text style={consultaStyles.modalProductText}>
                    No se encontraron productos para este pedido.
                  </Text>
                )}
              </>
            ) : (
              <Text style={consultaStyles.modalText}>
                No se encontró información del pedido.
              </Text>
            )}
          </View>
          <Pressable
            onPress={() => setDetalleModalVisible(false)}
            style={consultaStyles.modalCloseButton}
          >
            <Ionicons name="close-circle-outline" size={28} color="#fff" />
          </Pressable>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );



}


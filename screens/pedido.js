import React, { useEffect, useState } from 'react';
import {
  View, Text, ActivityIndicator, TextInput, TouchableOpacity, Modal, SafeAreaView, Alert, Pressable,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/axios.js';
import { database } from '../src/database/database.js';
import { styles } from '../assets/styles.js';
import { KeyboardAwareFlatList } from 'react-native-keyboard-aware-scroll-view';
import CambiarCantidadModal from './modal/cambiarCantidad.js';
import { formatear } from '../assets/formatear.js';
import sincronizarProductos from '../src/sincronizaciones/cargarProductosLocales.js';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { realizarPedidoLocal } from '../screens/funciones/realizarPedidoLocal.js';

const CLAVE_PEDIDO_GUARDADO = 'pedido_guardado';


export default function Pedido({ clienteSeleccionado: initialClienteSeleccionado,
  creditoDisponible, setCreditoDisponible = () => { },
  descuentoCredito, setDescuentoCredito,
  descuentoGlobal,
  setNota, nota,
  condicionSeleccionada
}) {
  // const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [productos, setProductos] = useState([]);
  const [searchTextProductos, setSearchTextProductos] = useState('');
  const [pedido, setPedido] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [balanceCliente, setBalanceCliente] = useState(0);
  const [modalEditVisible, setModalEditVisible] = useState(false);
  const [productoParaEditar, setProductoParaEditar] = useState(null);
  const [nuevaCantidad, setNuevaCantidad] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const pedidoRef = React.useRef(pedido);

  const [clienteSeleccionado, setClienteSeleccionado] = useState(initialClienteSeleccionado);

  const navigation = useNavigation();
  const parentNavigation = navigation.getParent(); // Accedemos al padre
  const hasLoadedPedido = React.useRef(false);

  const totalBruto = Object.values(pedido).reduce((total, item) => (total + item.f_precio5 * item.cantidad), 0)

  const realizarPedidoLocalWrapper = async () => {
    await realizarPedidoLocal({
      pedido,
      totalBruto,
      clienteSeleccionado,
      descuentoGlobal,
      nota,
      condicionSeleccionada,
      setIsSaving,
      setPedido,
      setModalVisible,
      setClienteSeleccionado,
      setBalanceCliente,
      setDescuentoCredito,
      navigation,
    });
  };

  useEffect(() => {
    parentNavigation.setParams({
      clienteSeleccionado,
      balanceCliente,
      creditoDisponible

    });
  }, [
    clienteSeleccionado,
    balanceCliente,
    creditoDisponible,
    parentNavigation
  ]);


  useEffect(() => {
    if (clienteSeleccionado) {
      const fetchClientesCxc = async () => {
        try {
          const response = await api.get(`/cuenta_cobrar/${clienteSeleccionado.f_id}`);
          setBalanceCliente(response.data.f_balance || 0);
        } catch (error) {
          console.error('❌ Error al obtener cxc:', error);
          setBalanceCliente(0);
        } finally {
          setLoading(false);
        }
      };
      fetchClientesCxc();
    }
  }, [clienteSeleccionado]);

  useEffect(() => {
    // Si el total del pedido cambia, actualizamos el crédito disponible
    // Por ejemplo, si el crédito disponible se reduce en función del total del pedido:
    const nuevoCredito = (clienteSeleccionado.f_limite_credito - totalBruto - balanceCliente);
    setCreditoDisponible(nuevoCredito);
  }, [totalBruto, clienteSeleccionado, balanceCliente, setCreditoDisponible]);


  const cargarProductosLocales = async () => {
    try {
      const productosLocales = await database.collections
        .get('t_productos_sucursal')
        .query()
        .fetch();
      // Si es necesario, transforma los registros de WatermelonDB a objetos JS planos
      setProductos(productosLocales);
    } catch (error) {
      console.error('Error al cargar productos locales:', error);
    }
  };

  // Función que decide si sincronizar o cargar localmente según la conexión
  const cargarProductos = async () => {
    // Primero carga los productos locales para una respuesta inmediata
    await cargarProductosLocales();

    // Luego verifica si hay conexión a internet
    const netState = await NetInfo.fetch();
    if (netState.isConnected) {
      try {
        // Sincroniza con la API para actualizar los productos
        await sincronizarProductos();
        await cargarProductosLocales();
      } catch (error) {
        console.error("Error al sincronizar, se mantienen los productos locales:", error);
      }
    }
  };

  useEffect(() => {
    // Configura el intervalo para revisar y sincronizar cada 5 minutos
    const intervalId = setInterval(() => {
      cargarProductos();
    }, 30000); // 90,000 ms = 90 segundos

    // Limpia el intervalo cuando el componente se desmonte
    return () => clearInterval(intervalId);
  }, []);



  // Al seleccionar un cliente, carga los productos (sincronizando o desde la base local)
  useEffect(() => {
    if (clienteSeleccionado) {
      setLoading(true);
      cargarProductos().finally(() => setLoading(false));
    }
  }, [clienteSeleccionado]);

  useEffect(() => {
    const guardarPedidoAsync = async () => {
      try {
        if (Object.keys(pedido).length > 0) {
          const pedidoJSON = JSON.stringify(pedido);
          await AsyncStorage.setItem(CLAVE_PEDIDO_GUARDADO, pedidoJSON);
          console.log('Pedido guardado en Async Storage:', pedidoJSON);
        } else {
          // No se elimina el pedido guardado si el estado "pedido" está vacío,
          // lo dejamos intacto para que, al cargar la pantalla, se pueda preguntar al usuario.
          console.log('Pedido vacío, pero no se elimina AsyncStorage para preservar el pedido guardado.');
        }
      } catch (error) {
        console.error('Error al guardar el pedido en Async Storage:', error);
      }
    };
    guardarPedidoAsync();
  }, [pedido]);


  useFocusEffect(
    React.useCallback(() => {
      const cargarPedidoGuardado = async () => {
        console.log('Cargando pedido guardado Async Storage...');
        try {
          const pedidoGuardadoJSON = await AsyncStorage.getItem(CLAVE_PEDIDO_GUARDADO);
          if (pedidoGuardadoJSON) {
            const pedidoGuardado = JSON.parse(pedidoGuardadoJSON);
            if (pedidoGuardado && Object.keys(pedidoGuardado).length > 0 && Object.keys(pedido).length === 0) {
              Alert.alert(
                'PEDIDO GUARDADO ENCONTRADO',
                '¿Desea cargar el pedido guardado?',
                [
                  { text: 'No', style: 'cancel' },
                  {
                    text: 'Sí',
                    onPress: () => {
                      setPedido(pedidoGuardado);
                    },
                  },
                ]
              );
            }
          }
        } catch (error) {
          console.error('Error al leer el pedido guardado de AsyncStorage:', error);
        } finally {
          // Marcamos que ya se intentó cargar el pedido
          hasLoadedPedido.current = true;
        }
      };
      cargarPedidoGuardado();
    }, [])
  );

  useEffect(() => {
    const guardarPedidoAsync = async () => {
      try {
        if (Object.keys(pedido).length > 0) {
          const pedidoJSON = JSON.stringify(pedido);
          await AsyncStorage.setItem(CLAVE_PEDIDO_GUARDADO, pedidoJSON);
          console.log('Pedido guardado en Async Storage:', pedidoJSON);
        } else {
          // Solo eliminamos el pedido si ya se intentó cargar
          if (hasLoadedPedido.current) {
            await AsyncStorage.removeItem(CLAVE_PEDIDO_GUARDADO);
            console.log('Pedido vacío, se eliminó de Async Storage.');
          }
        }
      } catch (error) {
        console.error('Error al guardar el pedido en Async Storage:', error);
      }
    };
    guardarPedidoAsync();
  }, [pedido]);



  useEffect(() => {
    pedidoRef.current = pedido;
  }, [pedido]);

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />;
  }

  const productosFiltrados = productos.filter(producto =>
    (producto.f_descripcion || '').toLowerCase().includes(searchTextProductos.toLowerCase()) ||
    (producto.f_referencia ? producto.f_referencia.toString().toLowerCase() : '').includes(searchTextProductos.toLowerCase())
  );



  // Funciones para actualizar pedido y eliminar productos (se mantienen igual)
  const actualizarCantidad = (f_referencia, cantidad, producto) => {
    if (cantidad === '') {
      setPedido(prevPedido => {
        const nuevoPedido = { ...prevPedido };
        delete nuevoPedido[f_referencia];
        return nuevoPedido;
      });
    } else {
      const cantidadNumerica = parseInt(cantidad, 10) || 0;
      setPedido(prevPedido => ({
        ...prevPedido,
        [f_referencia]: prevPedido[f_referencia]
          ? { ...prevPedido[f_referencia], cantidad: cantidadNumerica }
          : { f_referencia: producto.f_referencia, f_precio5: producto.f_precio5, cantidad: cantidadNumerica, f_referencia_suplidor: producto.f_referencia_suplidor, f_descripcion: producto.f_descripcion, f_existencia: producto.f_existencia }
      }));
    }
  };


  const eliminarDelPedido = (f_referencia) => {
    setPedido(prevPedido => {
      const nuevoPedido = { ...prevPedido };
      delete nuevoPedido[f_referencia];
      return nuevoPedido;
    });
  };

  //funcion del modal cambiar cantidad adel resumen del pedido
  const cambiarCantidad = (f_referencia) => {
    const producto = pedido[f_referencia];
    if (!producto) {
      Alert.alert("Producto no encontrado", "El producto seleccionado no existe en el pedido.");
      return;
    }
    setProductoParaEditar({ ...producto, f_referencia });
    setNuevaCantidad(producto.cantidad.toString());
    setModalEditVisible(true);
  };





  const descuentoAplicado = (descuentoGlobal / 1000) * totalBruto;
  const itbis = Number(totalBruto - descuentoAplicado) * 0.18;
  const totalNeto = Number(totalBruto) + Number(itbis) - Number(descuentoAplicado);
  //const creditoDisponible = clienteSeleccionado ? clienteSeleccionado.f_limite_credito - balanceCliente - totalNeto : 0;


  return (

    <SafeAreaView style={styles.container}>
      <View style={{ alignItems: 'center' }}>
        <View>
          <View flexDirection="row" alignItems="center" justifyContent="space-between">
            <Text>
              Descuento:
            </Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: 'black', width: 50, height: 30, textAlign: 'center' }}
              placeholder="Desc.%"
              value={descuentoCredito}
              onChangeText={setDescuentoCredito}
            />
            <Pressable style={styles.button} onPress={() => setPedido({})}>
              <Text>Limpiar</Text>
            </Pressable>
          </View>
        </View>
        <View flexDirection="row">
          <Pressable onPress={() => setModalVisible(true)} style={styles.buttonB}>
            <Text style={styles.buttonText}>VER PEDIDO</Text>
          </Pressable>
          <View flexDirection="center">
            <Text style={{ flex: 2, textAlign: 'center' }}>
              Credito disponible: {formatear(creditoDisponible)}
            </Text>
            <Text style={{ flex: 2, textAlign: 'center', fontWeight: 'bold' }}>Total del pedido {formatear(totalNeto)}</Text>

          </View>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Buscar producto"
          value={searchTextProductos}
          onChangeText={setSearchTextProductos}
        />
      </View>


      {/* Listado de productos hacer pedido*/}
      <View style={styles.listContainer2}>
        <FlashList
          estimatedItemSize={85}
          removeClippedSubviews={false}
          data={productosFiltrados}
          keyExtractor={(item) => (item.f_referencia ? item.f_referencia.toString() : item.f_referencia.toString())}
          // keyboardShouldPersistTaps="always"
          extraScrollHeight={20}
          renderItem={({ item }) => (
            <View style={styles.listContainer}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemText}>
                  ({item.f_referencia}) - {item.f_referencia_suplidor}
                </Text>
                <Text style={styles.itemText}>{item.f_descripcion}</Text>
                <Text style={styles.itemText}>Precio:{formatear(item.f_precio5)}{'    '}credito: {descuentoCredito ? formatear((item.f_precio5 + (item.f_precio5 * 0.18)) - (item.f_precio5) * (Number(descuentoCredito) / 100)) : formatear(item.f_precio5 + (item.f_precio5 * 0.18))}</Text>
                <Text style={styles.itemText}>Existencia: {item.f_existencia}</Text>
              </View>
              <TextInput
                style={styles.inputP}
                placeholder="QTY"
                keyboardType="numeric"
                value={pedido[item.f_referencia]?.cantidad?.toString() || ''}
                onChangeText={(cantidad) => actualizarCantidad(item.f_referencia, cantidad, item)}
              />
            </View>

          )}
          ListEmptyComponent={<Text>No se encontraron productos</Text>}
        />
      </View>


      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1, padding: 10 }}>
            {/* Sección no scrollable: encabezado */}
            <View>
              <Text style={styles.title}>🛒 Resumen del Pedido</Text>
              <Text style={styles.title}>
                Cliente: ({clienteSeleccionado.f_id}) {clienteSeleccionado.f_nombre}
              </Text>
              <Text>Crédito Disponible: {formatear(creditoDisponible)}</Text>
              <View style={styles.modalHeader}>
                <Text>Total bruto: {formatear(totalBruto)}</Text>
                <Text>Descuento: {formatear(descuentoAplicado)}</Text>
                <Text>ITBIS: {formatear(itbis)}</Text>
                <Text style={styles.title}>
                  Total del pedido: {formatear(totalNeto)}
                </Text>
              </View>
              <View>
                <TextInput
                  style={styles.input}
                  placeholder="Nota"
                  value={nota}
                  onChangeText={setNota}
                />
              </View>
              <Text style={styles.title}>Detalle del pedido:</Text>
            </View>

            {/* Área scrollable: lista de productos */}
            <View style={{ flex: 1 }}>
              {Object.keys(pedido).length > 0 ? (
                <KeyboardAwareFlatList
                  data={Object.entries(pedido)}
                  keyExtractor={([f_referencia]) => f_referencia}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  renderItem={({ item: [f_referencia, data] }) => (
                    <View style={styles.listContainer}>
                      <View style={{ flex: 1 }}>
                        <Text>
                          ({data.f_referencia}) - {data.f_referencia_suplidor}
                        </Text>
                        <Text>{data.f_descripcion}</Text>
                        <Text>Cantidad: {data.cantidad}</Text>
                        <Text>
                          Precio: ${data.f_precio5} Total:
                          {formatear(data.f_precio5 * data.cantidad)}
                        </Text>
                      </View>
                      <View>
                        <TouchableOpacity onPress={() => cambiarCantidad(f_referencia)} style={styles.modalButton2}>
                          <Text style={[styles.modalButtonText, isSaving && { opacity: 0.6 }]}
                            disabled={isSaving}>✍️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => eliminarDelPedido(f_referencia)} style={[styles.modalButton3, isSaving && { opacity: 0.6 }]}
                          disabled={isSaving}>
                          <Text style={styles.modalButtonText}>❌</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                />
              ) : (
                <Text>No hay productos en el pedido</Text>
              )}
            </View>
          </View>

          {/* Contenedor fijo de botones */}
          <View style={{ height: 60, flexDirection: 'row', justifyContent: 'space-between', padding: 10 }}>
            <Pressable onPress={() => setModalVisible(false)} style={[styles.buttonRow2, isSaving && { opacity: 0.6 }]}
              disabled={isSaving}>
              <Text style={styles.buttonText}>Agregar productos</Text>
            </Pressable>
            <Pressable
              onPress={realizarPedidoLocalWrapper}
              style={[styles.buttonRow, isSaving && { opacity: 0.6 }]}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Confirmar Pedido</Text>
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      <CambiarCantidadModal
        visible={modalEditVisible}
        onCancel={() => setModalEditVisible(false)}
        onAccept={() => {
          actualizarCantidad(productoParaEditar.f_referencia, nuevaCantidad, productoParaEditar);
          setModalEditVisible(false);
        }}
        producto={productoParaEditar}
        nuevaCantidad={nuevaCantidad}
        setNuevaCantidad={setNuevaCantidad}
      />
    </SafeAreaView>
  );
}

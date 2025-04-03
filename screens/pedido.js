import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Alert,
  Pressable,
  StyleSheet,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/axios.js';
import { database } from '../src/database/database.js';
import { formatear } from '../assets/formatear.js';
import { KeyboardAwareFlatList } from 'react-native-keyboard-aware-scroll-view';
import CambiarCantidadModal from './modal/cambiarCantidad.js';
import sincronizarProductos from '../src/sincronizaciones/cargarProductosLocales.js';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import { realizarPedidoLocal } from '../screens/funciones/realizarPedidoLocal.js';
import MyCheckbox from './utilities/checkbox.js';
import { Q } from '@nozbe/watermelondb';

const CLAVE_PEDIDO_GUARDADO = 'pedido_guardado';

export default function Pedido({
  clienteSeleccionado: initialClienteSeleccionado,
  creditoDisponible,
  setCreditoDisponible = () => {},
  descuentoCredito,
  setDescuentoCredito,
  descuentoGlobal,
  setNota,
  nota,
  condicionSeleccionada,
  orderToEdit
}) {
  // ----- Estados y lógica (se mantiene sin cambios) -----
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
  const [checkBoxChecked, setCheckBoxChecked] = useState(false);
  const pedidoRef = React.useRef(pedido);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(initialClienteSeleccionado);

  const navigation = useNavigation();
  const parentNavigation = navigation.getParent();

// ...
//const orderToEdit = orderToEditProp || route.params?.orderToEdit;
const isEditing = !!orderToEdit;

  const totalBruto = Object.values(pedido).reduce(
    (total, item) => total + item.f_precio5 * item.cantidad,
    0
  );
  const descuentoAplicado = (descuentoGlobal / 1000) * totalBruto;
  const itbis = Number(totalBruto - descuentoAplicado) * 0.18;
  const totalNeto = Number(totalBruto) + Number(itbis) - Number(descuentoAplicado);

  const realizarPedidoLocalWrapper = async () => {
    if (isEditing) {
      try {
        await database.write(async () => {
          // Asumiendo que orderToEdit tiene un campo "id" que identifica el registro en la colección
          const orderRecord = await database.collections.get('t_factura_pedido').find(orderToEdit.id);
          await orderRecord.update(record => {
            record.f_monto = totalNeto; // Actualiza los campos correspondientes
            record.f_descuento = descuentoAplicado;
            record.f_observacion = nota;

            AsyncStorage.removeItem(CLAVE_PEDIDO_GUARDADO);
            // Actualiza otros campos según corresponda (productos, fecha, etc.)
          });

          const detalleCollection = database.collections.get('t_detalle_factura_pedido');
          const detallesExistentes = await detalleCollection.query(
            Q.where('f_documento', orderToEdit.f_documento)
          ).fetch();

          for (const detalle of detallesExistentes) {
            await detalle.markAsDeleted();
          }

          const productosPedido = Object.entries(pedido).map(([f_referencia, data]) => ({
            f_referencia: parseInt(f_referencia, 10),
            cantidad: data.cantidad,
            f_precio: data.f_precio5,
          }));

          for (const item of productosPedido) {
            await detalleCollection.create(record => {
              record.f_documento = orderToEdit.f_documento; // Reutilizamos el mismo documento
              record.f_referencia = item.f_referencia;
              record.f_cantidad = item.cantidad;
              record.f_precio = item.f_precio;
            });
          }

        });
        Alert.alert("Pedido actualizado con éxito");
        navigation.reset({
          index: 0,
          routes: [{ name: 'ConsultaPedidos' }]
        });
      } catch (error) {
        console.error("Error al actualizar el pedido:", error);
        Alert.alert("Ocurrió un error al actualizar el pedido");
      }
    } else {
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
        creditoDisponible,
      });
    }
  };


  const cargarProductos = async () => {
    // Primero carga los productos locales para una respuesta inmediata
    await cargarProductosLocales();

    // Luego verifica si hay conexión a internet
    const netState = await NetInfo.fetch();
    if (netState.isConnected) {
      try {
        await sincronizarProductos();
        await cargarProductosLocales();
      } catch (error) {
        console.error("Error al sincronizar, se mantienen los productos locales:", error);
      }
    }
  };

  const limpiarPedido = async () => {
    Alert.alert(
      'Borrar pedido',
      '¿Desea borrar el pedido?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceptar',
          onPress: async () => {
            setPedido({});
            try {
              await AsyncStorage.removeItem(CLAVE_PEDIDO_GUARDADO);
              console.log('Pedido y AsyncStorage limpios.');
            } catch (error) {
              console.error('Error al limpiar AsyncStorage:', error);
            }
          },
        },
      ]
    );
  };

  const cargarProductosLocales = async () => {
    try {
      const productosLocales = await database.collections
        .get('t_productos_sucursal')
        .query()
        .fetch();
      setProductos(productosLocales);
    } catch (error) {
      console.error('Error al cargar productos locales:', error);
    }
  };

  const productosFiltrados = productos.filter((producto) =>
    (producto.f_descripcion || '')
      .toLowerCase()
      .includes(searchTextProductos.toLowerCase()) ||
    (producto.f_referencia ? producto.f_referencia.toString().toLowerCase() : '')
      .includes(searchTextProductos.toLowerCase())
  );

  const actualizarCantidad = (f_referencia, cantidad, producto) => {
    if (cantidad === '') {
      setPedido((prevPedido) => {
        const nuevoPedido = { ...prevPedido };
        delete nuevoPedido[f_referencia];
        return nuevoPedido;
      });
    } else {
      const cantidadNumerica = parseInt(cantidad, 10) || 0;
      setPedido((prevPedido) => ({
        ...prevPedido,
        [f_referencia]: prevPedido[f_referencia]
          ? { ...prevPedido[f_referencia], cantidad: cantidadNumerica }
          : {
              f_referencia: producto.f_referencia,
              f_precio5: producto.f_precio5,
              cantidad: cantidadNumerica,
              f_referencia_suplidor: producto.f_referencia_suplidor,
              f_descripcion: producto.f_descripcion,
              f_existencia: producto.f_existencia,
            },
      }));
    }
  };

  const eliminarDelPedido = (f_referencia) => {
    Alert.alert(
      'Eliminar Producto',
      '¿Desea eliminar el producto del pedido?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          onPress: () => {
            setPedido((prevPedido) => {
              const nuevoPedido = { ...prevPedido };
              delete nuevoPedido[f_referencia];
              AsyncStorage.removeItem(CLAVE_PEDIDO_GUARDADO);
              console.log('Pedido y AsyncStorage limpios.');
              return nuevoPedido;
            });
          },
        },
      ]
    );
  };

  const cambiarCantidad = (f_referencia) => {
    const producto = pedido[f_referencia];
    if (!producto) {
      Alert.alert('Producto no encontrado', 'El producto seleccionado no existe en el pedido.');
      return;
    }
    setProductoParaEditar({ ...producto, f_referencia });
    setNuevaCantidad(producto.cantidad.toString());
    setModalEditVisible(true);
  };

  useEffect(() => {
    if (isEditing) {
      // Supongamos que en orderToEdit tienes un objeto con la estructura similar al estado "pedido"
      setPedido(orderToEdit.pedido); // Asegúrate de tener la estructura necesaria
      setNota(orderToEdit.f_observacion);
      // Aquí puedes precargar otros estados relevantes (cliente, descuento, etc.)
    }
  }, [isEditing]);

  
  useEffect(() => {
    parentNavigation.setParams({
      clienteSeleccionado,
      balanceCliente,
      creditoDisponible,
    });
  }, [clienteSeleccionado, balanceCliente, creditoDisponible, parentNavigation]);

  useEffect(() => {
    if (clienteSeleccionado && descuentoGlobal > 0) {
      setCheckBoxChecked(true);
    }
  }, [clienteSeleccionado, descuentoGlobal]);

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
    const nuevoCredito = clienteSeleccionado.f_limite_credito - totalBruto - balanceCliente;
    setCreditoDisponible(nuevoCredito);
  }, [totalBruto, clienteSeleccionado, balanceCliente, setCreditoDisponible]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      cargarProductos();
    }, 30000);
    return () => clearInterval(intervalId);
  }, []);

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
          console.log('Pedido vacío, se preserva el pedido guardado.');
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
            if (pedidoGuardado && Object.keys(pedidoGuardado).length > 0) {
              const sizeGuardado = Object.keys(pedidoGuardado).length;
              const sizeActual = Object.keys(pedido).length;
              if (sizeGuardado !== sizeActual && sizeActual <= 0) {
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
          }
        } catch (error) {
          console.error('Error al leer el pedido guardado de AsyncStorage:', error);
        }
      };
      cargarPedidoGuardado();
    }, [pedido])
  );

  useEffect(() => {
    pedidoRef.current = pedido;
  }, [pedido]);

  // if (loading) {
  //   return <ActivityIndicator size="large" color="#007AFF" style={{ flex: 1 }} />;
  // }
  

  // ----- Diseño Nuevo -----
  return (
    <SafeAreaView style={pedidoStyles.container}>
      {/* Encabezado: Descuento, botón Limpiar, crédito y total */}
      <View style={pedidoStyles.headerCard}>
        <View style={pedidoStyles.row}>
          <Text style={pedidoStyles.label}>Descuento:</Text>
          <TextInput
            style={pedidoStyles.discountInput}
            placeholder="Desc.%"
            value={descuentoCredito}
            onChangeText={setDescuentoCredito}
          />
          <Pressable style={pedidoStyles.clearButton} onPress={limpiarPedido}>
            <Text style={pedidoStyles.buttonText}>Limpiar</Text>
          </Pressable>
          <MyCheckbox checked={checkBoxChecked} setChecked={setCheckBoxChecked} />
        </View>
        <View style={[pedidoStyles.row, { marginTop: 10 }]}>
          <View style={{ flex: 1 }}>
            <Text style={pedidoStyles.infoText}>
              Cred. disponible: {formatear(creditoDisponible)}
            </Text>
            <Text style={[pedidoStyles.infoText, { fontWeight: 'bold' }]}>
              Total del pedido: {formatear(totalNeto)}
            </Text>
          </View>
          <Pressable onPress={() => setModalVisible(true)} style={pedidoStyles.orderButton}>
            <Text style={pedidoStyles.orderButtonText}>VER PEDIDO</Text>
          </Pressable>
        </View>
      </View>

      {/* Buscador de producto */}
      <View style={pedidoStyles.searchContainer}>
        <TextInput
          style={pedidoStyles.searchInput}
          placeholder="Buscar producto"
          value={searchTextProductos}
          onChangeText={setSearchTextProductos}
        />
      </View>

      {/* Listado de productos */}
      <View style={pedidoStyles.productListContainer}>
        <FlashList
          estimatedItemSize={85}
          data={productosFiltrados}
          keyExtractor={(item) => item.f_referencia.toString()}
          extraScrollHeight={20}
          renderItem={({ item }) => {
            const precioGlobal = () => {
              const precioTransp =
                (item.f_precio5 -
                  item.f_precio5 * (Number(descuentoCredito) / 100)) +
                ((item.f_precio5 -
                  item.f_precio5 * (Number(descuentoCredito) / 100)) * 0.18);
              const precioNormal =
                item.f_precio5 +
                item.f_precio5 * 0.18 -
                item.f_precio5 * (Number(descuentoCredito) / 100);
              return checkBoxChecked ? precioTransp : precioNormal;
            };

            return (
              <View style={pedidoStyles.productCard}>
                <View style={{ flex: 1 }}>
                  <Text style={pedidoStyles.productTitle}>
                    ({item.f_referencia}) - {item.f_referencia_suplidor}
                  </Text>
                  <Text style={pedidoStyles.productDescription}>{item.f_descripcion}</Text>
                  <Text style={pedidoStyles.productInfo}>
                    Precio: {formatear(item.f_precio5)} | Neto: {formatear(precioGlobal())}
                  </Text>
                  <Text style={pedidoStyles.productInfo}>Existencia: {item.f_existencia}</Text>
                </View>
                <TextInput
                  style={pedidoStyles.quantityInput}
                  placeholder="QTY"
                  keyboardType="numeric"
                  value={pedido[item.f_referencia]?.cantidad?.toString() || ''}
                  onChangeText={(cantidad) =>
                    actualizarCantidad(item.f_referencia, cantidad, item)
                  }
                />
              </View>
            );
          }}
          ListEmptyComponent={<Text style={pedidoStyles.emptyText}>No se encontraron productos</Text>}
        />
      </View>

      {/* Modal: Resumen del pedido */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={pedidoStyles.modalContainer}>
          <View style={pedidoStyles.modalContent}>
            <Text style={pedidoStyles.modalTitle}>🛒 Resumen del Pedido</Text>
            <Text style={pedidoStyles.modalSubtitle}>
              Cliente: ({clienteSeleccionado.f_id}) {clienteSeleccionado.f_nombre}
            </Text>
            <Text style={pedidoStyles.modalInfo}>
              Crédito Disponible: {formatear(creditoDisponible)}
            </Text>
            <View style={pedidoStyles.modalCard}>
              <Text>Total bruto: {formatear(totalBruto)}</Text>
              <Text>Descuento: {formatear(descuentoAplicado)}</Text>
              <Text>ITBIS: {formatear(itbis)}</Text>
              <Text style={pedidoStyles.modalTotal}>Total: {formatear(totalNeto)}</Text>
            </View>
            <TextInput
              style={pedidoStyles.modalInput}
              placeholder="Agregar Nota"
              value={nota}
              onChangeText={setNota}
            />
            <Text style={pedidoStyles.modalSectionTitle}>Detalle del pedido:</Text>
          </View>
          <View style={pedidoStyles.modalListContainer}>
            {Object.keys(pedido).length > 0 ? (
              <KeyboardAwareFlatList
                data={Object.entries(pedido)}
                keyExtractor={([f_referencia]) => f_referencia}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item: [f_referencia, data] }) => (
                  <View style={pedidoStyles.modalItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={pedidoStyles.modalItemTitle}>
                        ({data.f_referencia}) - {data.f_referencia_suplidor}
                      </Text>
                      <Text style={pedidoStyles.modalItemDescription}>{data.f_descripcion}</Text>
                      <Text style={pedidoStyles.modalItemInfo}>Cantidad: {data.cantidad}</Text>
                      <Text style={pedidoStyles.modalItemInfo}>
                        Precio: {formatear(data.f_precio5)} | Total: {formatear(data.f_precio5 * data.cantidad)}
                      </Text>
                    </View>
                    <View style={pedidoStyles.modalItemActions}>
                      <TouchableOpacity onPress={() => cambiarCantidad(f_referencia)} style={pedidoStyles.editButton}>
                        <Text style={pedidoStyles.buttonText}>✍️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => eliminarDelPedido(f_referencia)} style={pedidoStyles.deleteButton}>
                        <Text style={pedidoStyles.buttonText}>❌</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            ) : (
              <Text style={pedidoStyles.emptyText}>No hay productos en el pedido</Text>
            )}
          </View>
          <View style={pedidoStyles.modalFooter}>
            <Pressable onPress={() => setModalVisible(false)} style={pedidoStyles.footerButton}>
              <Text style={pedidoStyles.footerButtonText}>Agregar productos</Text>
            </Pressable>
            <Pressable onPress={realizarPedidoLocalWrapper} style={pedidoStyles.footerButton}>
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={pedidoStyles.footerButtonText}>Confirmar Pedido</Text>
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

const pedidoStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fb',
    padding: 16,
  },
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
  },
  discountInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    width: 60,
    textAlign: 'center',
    marginLeft: 8,
  },
  clearButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  infoText: {
    fontSize: 14,
    color: '#333',
  },
  orderButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  orderButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  productListContainer: {
    flex: 1,
    marginBottom: 16,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  productDescription: {
    fontSize: 12,
    color: '#666',
  },
  productInfo: {
    fontSize: 12,
    color: '#333',
  },
  quantityInput: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    width: 60,
    textAlign: 'center',
    marginLeft: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#999',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fb',
    padding: 16,
  },
  modalContent: {
    flex: 1,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  modalInfo: {
    fontSize: 14,
    color: '#333',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  modalTotal: {
    fontSize: 16,
    marginTop: 8,
    color: '#007AFF',
  },
  modalInput: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginVertical: 12,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalListContainer: {
    flex: 1,
  },
  modalItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  modalItemTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  modalItemDescription: {
    fontSize: 12,
    color: '#666',
  },
  modalItemInfo: {
    fontSize: 12,
    color: '#333',
  },
  modalItemActions: {
    flexDirection: 'row',
  },
  editButton: {
    backgroundColor: '#e0f0ff',
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  deleteButton: {
    backgroundColor: '#ffe0e0',
    padding: 8,
    borderRadius: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  footerButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  footerButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

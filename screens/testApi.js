import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, ActivityIndicator,
  TextInput, Button, TouchableOpacity, Modal, SafeAreaView, Alert, Pressable,
  Platform
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import api from '../api/axios';
import { database } from '../src/database/database';
import { styles } from '../assets/styles';
import { Q } from '@nozbe/watermelondb';
import { KeyboardAwareFlatList } from 'react-native-keyboard-aware-scroll-view';
import Icon from 'react-native-vector-icons/MaterialIcons';
import CambiarCantidadModal from './modal/cambiarCantidad';
import { formatear } from '../assets/formatear';
import ModalOptions from './modal/condicionPedido';
import MyCheckbox from './utilities/checkbox.js';
import sincronizarClientes from '../sincronizaciones/clientesLocal.js';
import sincronizarProductos from '../sincronizaciones/cargarProductosLocales.js';



export default function TestApi() {
  // Estados para clientes y productos
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [productos, setProductos] = useState([]);
  const [searchTextClientes, setSearchTextClientes] = useState('');
  const [searchTextProductos, setSearchTextProductos] = useState('');
  const [pedido, setPedido] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [balanceCliente, setBalanceCliente] = useState(0);
  const [modalEditVisible, setModalEditVisible] = useState(false);
  const [productoParaEditar, setProductoParaEditar] = useState(null);
  const [nuevaCantidad, setNuevaCantidad] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [modalVisibleCondicion, setModalVisibleCondicion] = useState(false);
  const [condicionSeleccionada, setCondicionSeleccionada] = useState(null);
  const [descuentoCredito, setDescuentoCredito] = useState(10);


  // Carga de clientes al iniciar
  // Función para obtener clientes desde la API
  const fetchClientes = async () => {
    setLoading(true);
    try {
      const response = await api.get('/clientes');
      setClientes(response.data);
    } catch (error) {
      console.error('❌ Error al obtener clientes:', error);
      Alert.alert('Error', 'No se pudo obtener la lista de clientes. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  // Cargar clientes al iniciar el componente
  useEffect(() => {
    fetchClientes();
  }, []);
  // Buscar cuenta por cobrar del cliente seleccionado
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


  // Función para cargar productos desde la base de datos local
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

  const cargarClientesLocales = async () => {
    try {
      const clientesLocales = await database.collections.get('t_clientes').query().fetch();
      setClientes(clientesLocales);
    } catch (error) {
      console.error('Error al cargar clientes locales:', error);
    }

  }

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

  useEffect(() => {
    // Cargar clientes locales de inmediato
    cargarClientesLocales();

    // Verificar la conexión y sincronizar si es posible
    NetInfo.fetch().then(netState => {
      if (netState.isConnected) {
        sincronizarClientes();
      }
    });
  }, []);


  // Al seleccionar un cliente, carga los productos (sincronizando o desde la base local)
  useEffect(() => {
    if (clienteSeleccionado) {
      setLoading(true);
      cargarProductos().finally(() => setLoading(false));
    }
  }, [clienteSeleccionado]);


  useEffect(() => {
    if (clienteSeleccionado && clienteSeleccionado.f_termino !== undefined) {
      const defaultCondicion = condicionPedido.find(
        item => item.id === clienteSeleccionado.f_termino
      );
      if (defaultCondicion) {
        setCondicionSeleccionada(defaultCondicion);
      }
    }
  }, [clienteSeleccionado]);

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />;
  }

  // Selección de cliente si aún no se ha seleccionado
  if (!clienteSeleccionado) {
    const clientesFiltrados = clientes.filter(cliente =>
      (cliente.f_nombre.toLowerCase().includes(searchTextClientes.toLowerCase())) ||
      (cliente.f_id ? cliente.f_id.toString().toLowerCase() : '').includes(searchTextClientes.toLowerCase())
    );

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Selecciona un Cliente</Text>
        <Pressable title='cargar Clientes' onPress={fetchClientes}></Pressable>
        <TextInput
          style={styles.input}
          placeholder="Buscar cliente..."
          value={searchTextClientes}
          onChangeText={setSearchTextClientes}
        />
        {/* Listado de clientes filtrados */}
        <View style={styles.listContainer2}>
          <KeyboardAwareFlatList
            data={clientesFiltrados}
            keyExtractor={item => item.f_id.toString()}
            renderItem={({ item }) => (
              <View style={styles.item}>
                <View >
                  <TouchableOpacity onPress={() => setClienteSeleccionado(item)}>
                    <Text style={styles.itemText}>({item.f_id}) {item.f_nombre}</Text>
                    <Text style={styles.itemText}>Municipio: {item.f_d_municipio}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={<Text>No se encontraron clientes</Text>}
          />
        </View>
      </View>
    );
  }

  // Filtrar productos según búsqueda
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

  const realizarPedidoLocal = async () => {
    if (isSaving) return;
    setIsSaving(true);
    // Convertir el objeto 'pedido' en un array de detalles
    const productosPedido = Object.entries(pedido).map(([f_referencia, data]) => ({
      f_referencia: parseInt(f_referencia, 10),
      cantidad: data.cantidad,
      f_precio: data.f_precio5,
    }));

    if (productosPedido.length === 0) {
      Alert.alert("Error", "No has seleccionado ningún producto");
      return;
    }

    try {
      await database.write(async () => {
        // Obtener las colecciones correspondientes
        const facturaCollection = database.collections.get('t_factura_pedido');
        const detalleCollection = database.collections.get('t_detalle_factura_pedido');

        // Generar un identificador único para el documento del pedido
        const documento = `PEDO-${Date.now()}`;

        // Insertar el encabezado (factura del pedido)
        await facturaCollection.create(record => {
          record.f_cliente = clienteSeleccionado.f_id;
          record.f_documento = documento;
          record.f_tipodoc = 'PEDO';
          record.f_nodoc = 1; // Ajusta según tu lógica
          record.f_fecha = new Date().toISOString();
          record.f_itbis = itbis; // Calculado previamente
          record.f_descuento = 0;
          record.f_porc_descuento = 0;
          record.f_monto = totalNeto; // Total neto del pedido
          record.f_condicion = 1; // Por ejemplo, 1 para contado
        });

        // Insertar cada detalle del pedido
        for (const item of productosPedido) {
          await detalleCollection.create(record => {
            record.f_documento = documento; // Relaciona el detalle con el encabezado
            record.f_referencia = item.f_referencia;
            record.f_cantidad = item.cantidad;
            record.f_precio = item.f_precio;
          });
        }
      });

      Alert.alert("Éxito", "Pedido guardado localmente");
      setPedido({});
      setModalVisible(false);
    } catch (error) {
      console.error("Error al guardar el pedido localmente:", error);
      Alert.alert("Error", "No se pudo guardar el pedido localmente");
    }
    finally {
      setIsSaving(false);
    }
  };


  const totalBruto = Object.values(pedido).reduce((total, item) => (total + item.f_precio5 * item.cantidad), 0)



  const descuento = () => {
    if (clienteSeleccionado && condicionSeleccionada) {
      if (condicionSeleccionada.id === 0 || condicionSeleccionada.id === 2) {
        return clienteSeleccionado.f_descuento_maximo
      } else {
        return clienteSeleccionado.f_descuento1;
      }
    }
    return 0; // En caso de que clienteSeleccionado o condicionSeleccionada sean null
  };

  const descuentoGlobal = descuento();
  const descuentoAplicado = descuento() * totalBruto;
  const itbis = Number(totalBruto - descuentoAplicado) * 0.18;
  const totalNeto = Number(totalBruto) + Number(itbis) - Number(descuentoAplicado);
  const creditoDisponible = clienteSeleccionado.f_limite_credito - balanceCliente - totalNeto;


  const condicionPedido = [
    { id: 0, nombre: 'Contado' },
    { id: 1, nombre: 'Crédito' },
    { id: 2, nombre: 'Contra entrega' },
    { id: 3, nombre: 'Vuelta viaje' },
  ];

  const condicionPedidoElegida = (option) => {
    // Aquí puedes usar tanto el id como el name de la opción seleccionada
    console.log("Seleccionaste:", option.id, option.nombre);
    setCondicionSeleccionada(option);
    setModalVisibleCondicion(false);
  };



  return (

    <SafeAreaView style={styles.container}>
      <View>
        <ModalOptions
          modalVisibleCondicion={modalVisibleCondicion}
          setModalVisibleCondicion={setModalVisibleCondicion}
          condicionPedido={condicionPedido}
          condicionPedidoElegida={condicionPedidoElegida}
        />
      </View>

      <View>
        <View style={{ flexDirection: 'row', borderWidth: 1 }}>
          <View style={{ flex: 7, borderWidth: 1, borderColor: 'red' }}>
            <Text style={styles.title}>Cliente: ({clienteSeleccionado.f_id}) {clienteSeleccionado.f_nombre}</Text>
          </View>
          <View style={{ borderWidth: 1, borderColor: 'blue', flex: 1 }} >
            <Pressable onPress={() => setClienteSeleccionado(null)} style={[styles.button, { flex: 1, marginBottom: 10 }]}>
              <Text style={[styles.buttonText]}>✍️</Text>
            </Pressable>

          </View>
        </View>
        <Text>
          Condición seleccionada:{" "}
          {condicionSeleccionada ? condicionSeleccionada.nombre : "Ninguna"}
        </Text>
        <Pressable title="Mostrar opciones" onPress={() => setModalVisibleCondicion(true)} style={[styles.button]}>
          <Text style={styles.buttonText}>condicion✍️</Text>
        </Pressable>
        <View style={styles.headerContainer}>
          <View style={{ flex: 2 }}>
            <Text style={styles.headerText}>Limite de credito: {formatear(clienteSeleccionado.f_limite_credito)}</Text>
            <Text style={styles.headerText}>Balance: {formatear(balanceCliente)}</Text>
            <Text style={styles.headerText}>Disponible: {formatear(creditoDisponible)}</Text>
            <Text style={styles.headerText}>{/*Descuento: {(clienteSeleccionado.f_descuento1)}*/} Descuento Global: {descuentoGlobal} Descuento Credito: {descuentoCredito}{/*Descuento contado: {clienteSeleccionado.f_descuento_maximo}*/}</Text>
            <TextInput
              style={styles.input}
              placeholder="Descuento"
              value={descuentoCredito}
              onChangeText={setDescuentoCredito}
            />
            <MyCheckbox />

            <Text style={styles.title}>Total del pedido: {formatear(totalNeto)}</Text>
          </View>
          <View style={{ flex: 1 }}>


            {/*<Pressable onPress={cargarProductosLocales} style={styles.button}>
            <Text style={styles.buttonText}>Cargar productos localess</Text>
          </Pressable>*/}

            <TextInput>

            </TextInput>


          </View>
        </View>
      </View>
      <View style={{ alignItems: 'center' }}>
        <TextInput
          style={styles.input}
          placeholder="Buscar por nombre o referencia"
          value={searchTextProductos}
          onChangeText={setSearchTextProductos}
        />
      </View>


      {/* Listado de productos hacer pedido*/}
      <View style={styles.listContainer2}>
        <KeyboardAwareFlatList
          data={productosFiltrados}
          keyExtractor={(item) => (item.f_referencia ? item.f_referencia.toString() : item.f_referencia.toString())}
          keyboardShouldPersistTaps="always"
          extraScrollHeight={20}
          renderItem={({ item }) => (
            <View style={styles.listContainer}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemText}>
                  ({item.f_referencia}) - {item.f_referencia_suplidor}
                </Text>
                <Text style={styles.itemText}>{item.f_descripcion}</Text>
                <Text style={styles.itemText}>Precio:{formatear(item.f_precio5)}{'   '} Precio credito: {descuentoCredito ? formatear((item.f_precio5 + (item.f_precio5 * 0.18)) - (item.f_precio5) * (Number(descuentoCredito) / 100)) : formatear(item.f_precio5 + (item.f_precio5 * 0.18))}</Text>
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
      <View style={styles.buttonContainer}>
        <Pressable onPress={() => setModalVisible(true)} style={styles.buttonB}>
          <Text style={styles.buttonText}>VER PEDIDO</Text>
        </Pressable>
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
                <Text>Descuento: {formatear(totalBruto * descuento)}</Text>
                <Text>ITBIS: {formatear(itbis)}</Text>
                <Text style={styles.title}>
                  Total del pedido: {formatear(totalNeto)}
                </Text>
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
              onPress={realizarPedidoLocal}
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

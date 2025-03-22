import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, SafeAreaView, Pressable, Modal, TouchableOpacity } from 'react-native';
import { database } from '../src/database/database';
import { Q } from '@nozbe/watermelondb';
import { formatear } from '../assets/formatear';
import { styles } from '../assets/styles';

export default function Pedidos({ navigation }) {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para el modal de detalle
  const [detalleModalVisible, setDetalleModalVisible] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [detallePedido, setDetallePedido] = useState([]);
  const [detalleLoading, setDetalleLoading] = useState(false);

  const [productosMap, setProductosMap] = useState({});
  const [clientesMap, setClientesMap] = useState({});
  
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



  const cargarProductosMap = async () =>{
    try {
      const productosCollection = database.collections.get('t_productos_sucursal');
      const allproductos = await productosCollection.query().fetch();
      const mapping = {};
      allproductos.forEach(producto =>{mapping[producto.f_referencia]= producto._raw});
      setProductosMap(mapping);
    } catch (error) {
      console.error("Error al obtener los productos:", error);
    }
  }

  const cargarClientesMap = async () =>{
    try {
      const clientesCollection = database.collections.get('t_clientes');
      const allClientes = await clientesCollection.query().fetch();
      const mappingClientes = {};
      allClientes.forEach(cliente =>{mappingClientes[cliente.f_id]= cliente._raw});
      setClientesMap(mappingClientes);
    } catch (error) {
      console.error("Error al obtener los clientes:", error);
    }
  }


  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        const facturaCollection = database.collections.get('t_factura_pedido');
        const allPedidos = await facturaCollection.query().fetch();
        setPedidos(allPedidos);
      } catch (error) {
        console.error("Error al obtener los pedidos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPedidos();
    cargarProductosMap();
    cargarClientesMap();
    
  }, []);

  // Función para consultar los detalles del pedido seleccionado
  const fetchDetallePedido = async (f_documento) => {
    setDetalleLoading(true);
    try {
      const detalleCollection = database.collections.get('t_detalle_factura_pedido');
      // Asumiendo que en la tabla 't_detalle_factura_pedido' el campo 'f_documento' relaciona el detalle con el pedido
      const detalles = await detalleCollection.query(
        Q.where('f_documento', f_documento)
      ).fetch();
      setDetallePedido(detalles);
    } catch (error) {
      console.error("Error al obtener el detalle del pedido:", error);
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

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Pressable
        onPress={() => navigation.navigate('SelectClientScreen')}
        style={{ padding: 10, backgroundColor: '#f0f0f0', borderRadius: 8, marginBottom: 16 }}
      >
        <Text style={{ fontSize: 18, backgroundColor: '#ADD8E6', padding: 10, borderRadius: 8 }}>Nuevo Pedido</Text>
      </Pressable>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>Pedidos Realizados</Text>
      <FlatList
        data={pedidos}
        keyExtractor={item => item.f_documento.toString()}
        renderItem={({ item }) => {
          
          const cliente = clientesMap[item.f_cliente] || {};

          return (
            
            <View style={styles.listContainer2}>
            <Text style={{ fontSize: 18 }}>Documento: {item.f_documento}</Text>
            <Text style={{ fontSize: 16 }}>Cliente: ({item.f_cliente}) {cliente.f_nombre} </Text>
            {/*<Text style={{ fontSize: 16 }}>Tipo: {item.f_tipodoc}</Text>*/}
            <Text style={{ fontSize: 16 }}>Fecha: {item.f_fecha}</Text>
            <Text style={{ fontSize: 16 }}>Total: {formatear(item.f_monto)}</Text>
            <Pressable
              onPress={() => openDetalleModal(item)}
              style={{ padding: 10, backgroundColor: '#ccc', borderRadius: 8, marginTop: 10 }}
            >
              <Text style={{ fontSize: 16 }}>Ver Detalles</Text>
            </Pressable>
          </View>
          )
          
        }}
      />

      {/* Modal de detalles de pedido */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={detalleModalVisible}
        onRequestClose={() => setDetalleModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1, padding: 10 }}>
            {selectedPedido ? (
              <>
                {/* Encabezado del pedido */}
                <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>🛒 Detalle del Pedido</Text>
                <Text style={{ fontSize: 18 }}>Documento: {selectedPedido.f_documento}</Text>
                <Text style={{ fontSize: 18 }}>Cliente: {selectedPedido.f_cliente}</Text>
                <Text style={{ fontSize: 18 }}>Tipo: {selectedPedido.f_tipodoc}</Text>
                <Text style={{ fontSize: 18 }}>Fecha: {selectedPedido.f_fecha}</Text>
                <Text style={{ fontSize: 18 }}>Condicion pedido: {condicionPedido[selectedPedido.f_condicion].nombre} </Text>
                <Text style={{ fontSize: 18 }}>Estado: {selectedPedido.f_estado}</Text>
                <Text style={{ fontSize: 18 }}>Subtotal: {formatear((selectedPedido.f_monto)-(selectedPedido.f_itbis))}</Text>
                <Text style={{ fontSize: 18 }}>ITBIS: {formatear(selectedPedido.f_itbis)}</Text>
                <Text style={{ fontSize: 18 }}>Total: {formatear(selectedPedido.f_monto)}</Text>
                <Text style={{ fontSize: 18 }}>Nota: {(selectedPedido.f_nota)}</Text>
                {/* Agrega más campos según necesites */}
                
                <Text style={{ fontSize: 20, fontWeight: 'bold', marginTop: 16 }}>Productos del Pedido:</Text>
                {detalleLoading ? (
                  <ActivityIndicator size="large" style={{ marginTop: 20 }} />
                ) : detallePedido.length > 0 ? (
                  <FlatList
                    data={detallePedido}
                    keyExtractor={det => det.id ? det.id.toString() : det.f_referencia.toString()}
                    renderItem={({ item: det }) => {

                      const producto = productosMap[det.f_referencia] || {};
                      return(
                      <View style={{ padding: 10, backgroundColor: '#e0e0e0', borderRadius: 8, marginVertical: 5 }}>
                        <Text>({det.f_referencia}) {producto.f_referencia_suplidor || 'N/A'} </Text>
                        <Text>Descripción: {producto.f_descripcion || 'N/A'}</Text>
                        <Text>Cantidad: {det.f_cantidad}</Text>
                        <Text>Precio: {formatear(det.f_precio)}    total: {formatear(Number(det.f_precio) * Number(det.f_cantidad))} </Text>
                  
                      </View>
                      )
                    }}
                  />
                ) : (
                  <Text style={{ marginTop: 20 }}>No se encontraron productos para este pedido.</Text>
                )}
              </>
            ) : (
              <Text>No se encontró información del pedido.</Text>
            )}
          </View>

          {/* Botón para cerrar el modal */}
          <Pressable
            onPress={() => setDetalleModalVisible(false)}
            style={{ backgroundColor: '#ccc', padding: 12, borderRadius: 8, alignItems: 'center', margin: 10 }}
          >
            <Text style={{ fontSize: 16 }}>Cerrar</Text>
          </Pressable>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

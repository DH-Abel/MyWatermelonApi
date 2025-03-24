 import AsyncStorage from "@react-native-async-storage/async-storage";
 import { Alert } from "react-native";
 import { database } from "../../src/database/database";
 import api from "../../api/axios";
 
 
 export const realizarPedidoLocal = async ({
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
  }) => {
    if (!pedido || Object.keys(pedido).length === 0) {
      Alert.alert("Error", "No has seleccionado ningún producto");
      return;
    }
    setIsSaving(true);
  
    // Convertir el objeto 'pedido' en un array de detalles
    const productosPedido = Object.entries(pedido).map(([f_referencia, data]) => ({
      f_referencia: parseInt(f_referencia, 10),
      cantidad: data.cantidad,
      f_precio: data.f_precio5,
    }));
    if (productosPedido.length === 0) {
      Alert.alert("Error", "No has seleccionado ningún producto");
      setIsSaving(false);
      return;
    }
  
    // Calcula totales
    const computedDescuentoAplicado = (descuentoGlobal / 1000) * totalBruto;
    const computedItbis = Number(totalBruto - computedDescuentoAplicado) * 0.18;
    const computedTotalNeto = Number(totalBruto) + Number(computedItbis) - Number(computedDescuentoAplicado);
  
    // Genera identificador y fecha
    const documento = `PED-${Date.now()}`;
    const fechaActual = new Date().toISOString();
  
    try {
      // Guarda localmente en WatermelonDB
      await database.write(async () => {
        const facturaCollection = database.collections.get('t_factura_pedido');
        const detalleCollection = database.collections.get('t_detalle_factura_pedido');
  
        await facturaCollection.create(record => {
          record.f_cliente = clienteSeleccionado.f_id;
          record.f_documento = documento;
          record.f_tipodoc = 'PED';
          record.f_nodoc = parseInt(fechaActual);
          record.f_fecha = fechaActual;
          record.f_itbis = computedItbis;
          record.f_descuento = computedDescuentoAplicado;
          record.f_porc_descuento = descuentoGlobal;
          record.f_monto = computedTotalNeto;
          record.f_condicion = condicionSeleccionada ? condicionSeleccionada.id : null;
          record.f_monto_bruto = totalBruto;
          record.f_nota = nota;
        });
  
        for (const item of productosPedido) {
          await detalleCollection.create(record => {
            record.f_documento = documento;
            record.f_referencia = item.f_referencia;
            record.f_cantidad = item.cantidad;
            record.f_precio = item.f_precio;
          });
        }
      });
      console.log("Pedido guardado localmente con éxito");
  
      // Enviar pedido a la API (asegúrate de que la ruta incluya el prefijo correcto)
      const responsePedido = await api.post('/pedidos/pedido', {
        f_cliente: clienteSeleccionado.f_id,
        f_documento: documento,
        f_tipodoc: 'PED',
        f_nodoc: parseInt(fechaActual,10),
        f_fecha: fechaActual,
        f_itbis: computedItbis,
        f_descuento: computedDescuentoAplicado,
        f_porc_descuento: descuentoGlobal,
        f_monto: computedTotalNeto,
        f_condicion: condicionSeleccionada ? condicionSeleccionada.id : null,
      });
      console.log("Pedido enviado a la API:", responsePedido.data);
  
      // Enviar cada detalle a la API
      for (const item of productosPedido) {
        const responseDetalle = await api.post('/pedidos/detalle-pedido', {
          f_documento: documento,
          f_referencia: item.f_referencia,
          f_cantidad: item.cantidad,
          f_precio: item.f_precio,
        });
        console.log("Detalle enviado a la API:", responseDetalle.data);
      }
  
      Alert.alert("Éxito", "Pedido guardado localmente y enviado a la API");
      await AsyncStorage.removeItem('pedido_guardado');
  
      // Reiniciar estados y navegar
      setPedido({});
      setModalVisible(false);
      setClienteSeleccionado(null);
      setBalanceCliente(0);
      setDescuentoCredito(0);
      navigation.reset({
        index: 0,
        routes: [{ name: 'ConsultaPedidos' }],
      });
    } catch (error) {
      console.error("Error al guardar o enviar el pedido:", error);
      Alert.alert("Error", "No se pudo guardar o enviar el pedido a la API");
    } finally {
      setIsSaving(false);
      console.log("Pedido procesado:", JSON.stringify(pedido));
    }
  };
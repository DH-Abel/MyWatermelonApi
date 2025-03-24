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

  const enviarPedido = async () => {
    try {
      // Enviar encabezado a la API
      const responsePedido = await api.post('/pedidos/pedido', {
        f_cliente: clienteSeleccionado.f_id,
        f_documento: documento,
        f_tipodoc: 'PED',
        f_nodoc: parseInt(fechaActual, 10),
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

      Alert.alert("Éxito", "Pedido guardado localmente y enviado a la empresa");
      await AsyncStorage.removeItem('pedido_guardado');

      // Reiniciar estados y navegador a pantalla de consulta de pedidos
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
      console.error("Error al enviar el pedido a la API:", error);
      Alert.alert("Error", "El pedido se guardó localmente, pero no se pudo enviar a la API. Reintenta el envío más tarde.");
      await AsyncStorage.removeItem('pedido_guardado')
      setModalVisible(false)

      navigation.reset({
        index: 0,
        routes: [{ name: 'ConsultaPedidos' }]
      })
    } finally {
      setIsSaving(false);
      console.log("Pedido procesado:", JSON.stringify(pedido));
    }
  };

  // --- Paso 1: Guardar localmente en WatermelonDB ---
  try {
    await database.write(async () => {
      const facturaCollection = database.collections.get('t_factura_pedido');
      const detalleCollection = database.collections.get('t_detalle_factura_pedido');

      // Guarda el encabezado del pedido
      await facturaCollection.create(record => {
        record.f_cliente = clienteSeleccionado.f_id;
        record.f_documento = documento;
        record.f_tipodoc = 'PED';
        record.f_nodoc = parseInt(fechaActual);
        record.f_fecha = parseInt(fechaActual);
        record.f_itbis = computedItbis;
        record.f_descuento = computedDescuentoAplicado;
        record.f_porc_descuento = descuentoGlobal;
        record.f_monto = computedTotalNeto;
        record.f_condicion = condicionSeleccionada ? condicionSeleccionada.id : null;
        record.f_monto_bruto = totalBruto;
        record.f_nota = nota;
      });

      // Guarda cada detalle del pedido
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

    Alert.alert(
      "Pedido guardado existosamente2",
      "¿Deseas enviar el pedido?",
      [
        {
          text: "No",
          onPress: async () => {
            await AsyncStorage.removeItem('pedido_guardado')
            setPedido({})
            setModalVisible(false)
            setClienteSeleccionado(null)
            setBalanceCliente(0)
            setDescuentoCredito(0)

            navigation.reset({
              index: 0,
              routes: [{ name: 'ConsultaPedidos' }]
            })
          },
          style: "cancel"
        },
        {
          text: "Si",
          onPress: enviarPedido
        }
      ]
    )

  } catch (error) {
    console.error("Error al guardar localmente el pedido:", error);
    Alert.alert("Error", "No se pudo guardar el pedido localmente");
    setIsSaving(false);
    return; // Si falla el guardado local, no se intenta enviar a la API
  }

  // --- Paso 2: Enviar el pedido a la API ---
  
}



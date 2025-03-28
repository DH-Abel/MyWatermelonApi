import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { database } from "../../src/database/database";
import api from "../../api/axios";
import { enviarPedido } from "../../src/sincronizaciones/enviarPedido";

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
  creditoDisponible
}) => {
  // Primero verificamos que haya pedido seleccionado
  if (!pedido || Object.keys(pedido).length === 0) {
    Alert.alert("Error", "No has seleccionado ningún producto");
    return;
  }

  // Convertir el objeto 'pedido' en un array de detalles
  const productosPedido = Object.entries(pedido).map(([f_referencia, data]) => ({
    f_referencia: parseInt(f_referencia, 10),
    cantidad: data.cantidad,
    f_precio: data.f_precio5,
  }));

  // Calcula totales
  const computedDescuentoAplicado = (descuentoGlobal / 1000) * totalBruto;
  const computedItbis = Number(totalBruto - computedDescuentoAplicado) * 0.18;
  const computedTotalNeto = Number(totalBruto) + Number(computedItbis) - Number(computedDescuentoAplicado);

  // Genera identificador y fecha
  const documento = `PED-${Date.now()}`;
  const fechaActual = new Date().toISOString();

  // Definimos la función que guarda el pedido localmente
  const guardarPedidoLocal = async () => {
    setIsSaving(true);
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
          record.f_fecha = (fechaActual);
          record.f_itbis = computedItbis;
          record.f_descuento = computedDescuentoAplicado;
          record.f_porc_descuento = descuentoGlobal;
          record.f_monto = computedTotalNeto;
          record.f_condicion = condicionSeleccionada ? condicionSeleccionada.id : null;
          record.f_monto_bruto = totalBruto;
          record.f_observacion = nota;
          record.f_estado_pedido = 1;
          record.f_vendedor = 83;
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
        "Pedido guardado existosamente",
        "¿Deseas enviar el pedido?",
        [
          {
            text: "No",
            onPress: async () => {
              await AsyncStorage.removeItem('pedido_guardado');
              setPedido({});
              setModalVisible(false);
              setClienteSeleccionado(null);
              setBalanceCliente(0);
              setDescuentoCredito(0);
              navigation.reset({
                index: 0,
                routes: [{ name: 'ConsultaPedidos' }]
              });
            },
            style: "cancel"
          },
          {
            text: "Si",
            onPress: async () => {
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
                setPedido,
                setModalVisible,
                setClienteSeleccionado,
                setBalanceCliente,
                setDescuentoCredito,
                navigation,
                setIsSaving,
                pedido,
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error("Error al guardar localmente el pedido:", error);
      Alert.alert("Error", "No se pudo guardar el pedido localmente");
      setIsSaving(false);
      return;
    }
  };

  // Si se cumple la condición de crédito negativo, mostramos la alerta y esperamos la respuesta
  if (creditoDisponible < 0 && (condicionSeleccionada.id === 1 || condicionSeleccionada.id === 3)) {
    Alert.alert(
      "ALERTA",
      "Estas extra limitando el credito del cliente",
      [
        { text: "Cancelar", onPress: () => { return; } },
        { text: "Aceptar", onPress: async () => { await guardarPedidoLocal(); } }
      ]
    );
    return; // Detenemos la ejecución hasta que el usuario responda
  }

  // Si no se cumple la condición, continuamos guardando el pedido
  await guardarPedidoLocal();
  setIsSaving(false);
};

// enviarPedido.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import api from "../../api/axios";

export const enviarPedido = async ({
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
}) => {
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

        Alert.alert("Éxito", "Pedido enviado a la empresa");
        await AsyncStorage.removeItem('pedido_guardado');

        // Reiniciar estados y navegar a ConsultaPedidos
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
        if (error.response && error.response.data && error.response.data.error.includes("duplicate key value violates unique constraint")) {
            Alert.alert("Error", "El pedido ya se encuentra registrado en la empresa.");
        } else {
            Alert.alert("Error", "El pedido se guardó localmente, pero no se pudo enviar a la API. Reintenta el envío más tarde.");
        }

        await AsyncStorage.removeItem('pedido_guardado');
        setModalVisible(false);
        navigation.reset({
            index: 0,
            routes: [{ name: 'ConsultaPedidos' }],
        });
    } finally {
        setIsSaving(false);
        console.log("Pedido procesado:", JSON.stringify(pedido));
    }
};

// enviarPedido.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import api from "../../api/axios";
import { database } from "../../src/database/database";
import { Q } from '@nozbe/watermelondb';

export const enviarPedido = async ({
    productosPedido,
    documento,
    fechaActual,
    horaActual,
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

    const state = navigation.getState();
    const currentRouteName = state.routes[state.index].name;

    try {
        // Enviar encabezado a la API
        const responsePedido = await api.post('/pedidos/pedido', {
            f_cliente: clienteSeleccionado.f_id,
            f_documento: documento,
            f_tipodoc: 'PED',
            f_nodoc: parseInt(fechaActual, 10),
            f_fecha: fechaActual,
            f_hora_vendedor: horaActual,
            f_itbis: computedItbis,
            f_descuento: computedDescuentoAplicado,
            f_porc_descuento: descuentoGlobal,
            f_monto: computedTotalNeto,
            f_monto_bruto: totalBruto,
            f_condicion: condicionSeleccionada ? condicionSeleccionada.id : null,
            f_estado_pedido: 1,
            f_vendedor: 83,
            f_observacion: nota
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
           // console.log("Detalle enviado a la API:", responseDetalle.data);
        } 

        try {
            const facturaCollection = database.collections.get('t_factura_pedido');
            const pedidosLocal = await facturaCollection.query(Q.where('f_documento', documento)).fetch();
            console.log("Pedidos locales encontrados:", pedidosLocal);
            if (pedidosLocal.length > 0) {
                await database.write(() => {
                    return pedidosLocal[0].update(record => {
                        record.f_enviado = true;
                    });
                });
                
                console.log(`Pedido(s) con documento ${documento} marcados como enviados en la base local.`);
            } else {
                console.log(`No se encontró ningún pedido local con f_documento ${documento}`);
            }
        } catch (updateError) {
            console.log("Error al actualizar el pedido local:", updateError);
        }
        

        Alert.alert("Éxito", "Pedido enviado a la empresa");
        if (currentRouteName !== 'ConsultaPedidos') {
            // Reiniciar estados y navegar a ConsultaPedidos
            setPedido({});
            await AsyncStorage.removeItem('pedido_guardado');
            setModalVisible(false);
            setClienteSeleccionado(null);
            setBalanceCliente(0);
            setDescuentoCredito(0);
            
            navigation.reset({
                index: 0,
                routes: [{ name: 'ConsultaPedidos' }],
            });
        }

    } catch (error) {
        console.error("Error al enviar el pedido a la API:", error);
        if (error.response && error.response.data && error.response.data.error.includes("duplicate key value violates unique constraint")) {
            Alert.alert("Error", "El pedido ya se encuentra registrado en la empresa.");
        } else {
            Alert.alert("Error", "El pedido se guardó localmente, pero no se pudo enviar a la API. Reintenta el envío más tarde.");
        }
        if (currentRouteName !== 'ConsultaPedidos') {
            // Reiniciar estados y navegar a ConsultaPedidos
            setPedido({});
            await AsyncStorage.removeItem('pedido_guardado');
            setModalVisible(false);
            setClienteSeleccionado(null);
            setBalanceCliente(0);
            setDescuentoCredito(0);
            
            navigation.reset({
                index: 0,
                routes: [{ name: 'ConsultaPedidos' }],
            });
        }
    } finally {
        setIsSaving(false);
        //console.log("Pedido procesado:", JSON.stringify(pedido));
    }
};

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { database } from "../../src/database/database";
import { enviarPedido } from "../../src/sincronizaciones/enviarPedido";
import { getNextPedidoSequence } from "../../src/sincronizaciones/secuenciaHelper";
import {AuthContext} from '../context/AuthContext';
import React, { useContext } from 'react';


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
  creditoDisponible,
  user
}) => {


  // Primero verificamos que haya pedido seleccionado
  if (!pedido || Object.keys(pedido).length === 0) {
    Alert.alert("Error", "No has seleccionado ningún producto");
    return;
  }

  // Convertir el objeto 'pedido' en un array de detalles
  // ① Generamos un array que incluye tanto ítems pagados como regalos
  const productosPedido = Object.entries(pedido).flatMap(([f_referencia, data]) => {
    const refNum = parseInt(f_referencia, 10);
    const lineas = [];

    // — Línea pagada (solo si no es ítem de regalo de cross-SKU)
    if (!data.isGift) {
      lineas.push({
        f_referencia: refNum,
        cantidad: data.cantidad,
        f_precio: data.f_precio5,
      });
    }

    // — Si es self-offer, añadimos la cantidad gratis en precio 0
    if (data.freeCantidad > 0) {
      lineas.push({
        f_referencia: refNum,
        cantidad: data.freeCantidad,
        f_precio: 0,
      });
    }

    // — Si es cross-SKU gift (isGift), añadimos esa línea gratis
    if (data.isGift) {
      lineas.push({
        f_referencia: refNum,
        cantidad: data.cantidad,
        f_precio: 0,
      });
    }

    return lineas;
  });

  // Calcula totales
  const computedDescuentoAplicado = Number((descuentoGlobal / 100) * Number(totalBruto.toFixed(2)));
  const computedItbis = Number(totalBruto - computedDescuentoAplicado) * 0.18;
  const computedTotalNeto = Number(totalBruto) + Number(computedItbis) - Number(computedDescuentoAplicado);

  // Agrega una función para formatear la fecha
  function formatDate(date) {
    const d = new Date(date);
    // Restamos 4 horas en milisegundos (4 * 60 * 60 * 1000)
    const adjusted = new Date(d.getTime() - (4 * 60 * 60 * 1000));

    // Usamos los métodos getUTC... para obtener la fecha ajustada sin interferencia de la zona local
    let day = adjusted.getUTCDate();
    let month = adjusted.getUTCMonth() + 1;
    const year = adjusted.getUTCFullYear();

    if (day < 10) day = '0' + day;
    if (month < 10) month = '0' + month;

    return `${day}/${month}/${year}`;
  }


  // Genera identificador y fecha
  const fechaActual = formatDate(new Date());
  const horaActual = new Date().toLocaleTimeString('en-GB');

  // Definimos la función que guarda el pedido localmente
  const guardarPedidoLocal = async () => {
    setIsSaving(true);
    try {
      
        const { tipodoc, nodoc } = await getNextPedidoSequence(user);
        const id = String(nodoc);
        const documento = `${tipodoc}${String(id).padStart(6, '0')}`;
        
      await database.write(async () => {
        const facturaCollection = database.collections.get('t_factura_pedido');
        const detalleCollection = database.collections.get('t_detalle_factura_pedido');

        
        
        // Guarda el encabezado del pedido
        await facturaCollection.create(record => {
          record.f_cliente = clienteSeleccionado.f_id;
          record.f_documento = documento;
          record.f_tipodoc = tipodoc;
          record.f_nodoc = nodoc;
          record.f_fecha = (fechaActual);
          record.f_hora_vendedor = horaActual;
          record.f_itbis = Number(computedItbis.toFixed(2));
          record.f_descuento = Number(computedDescuentoAplicado.toFixed(2));
          record.f_porc_descuento = descuentoGlobal;
          record.f_monto = Number(computedTotalNeto.toFixed(2));
          record.f_condicion = condicionSeleccionada ? condicionSeleccionada.id : null;
          record.f_monto_bruto = Number(totalBruto.toFixed(2));
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
            record.f_precio = Number(item.f_precio);
          });
        }

        await AsyncStorage.removeItem('pedido_guardado');
      });
      console.log("Pedido guardado localmente con éxito");
      setIsSaving(false);
      Alert.alert(
        "Pedido guardado existosamente",
        
        "¿Deseas enviar el pedido?",
        [
          {
            text: "No",
            onPress: async () => {
              setPedido({});
              setModalVisible(false);
              await AsyncStorage.removeItem('pedido_guardado');
              setClienteSeleccionado(null);
              setBalanceCliente(0);
              setDescuentoCredito(0);
              navigation.reset({
                index: 1,                            // la ruta activa será la segunda
                routes: [
                  { name: 'MenuPrincipal' },        // primera en el historial
                  { name: 'ConsultaPedidos' }       // activa, a la que llegarás
                ]
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

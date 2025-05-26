// src/sincronizaciones/enviarDevoluciones.js
import { Alert } from "react-native";
import api from "../../api/axios";
import { database } from "../database/database";
import { formatearFechaRec } from "../../assets/formatear";

export const enviarDevoluciones = async ({
  devolucion,      // objeto _raw de la devolución
  detalles,        // array de objetos _raw del detalle
  navigation,
  setIsSending      // callback para loader
}) => {
  const state = navigation.getState();
  const currentRoute = state.routes[state.index].name;
  setIsSending(true);

  try {
    // 1) Enviar encabezado de devolución
    const payload = {
      f_documento: devolucion.f_documento,
      f_tipodoc: devolucion.f_tipodoc,
      f_nodoc: Number(devolucion.f_nodoc) || null,
      f_monto: Number(devolucion.f_monto) || 0,
      f_p_descuento1: Number(devolucion.f_descuento_transp) || 0,
      f_p_descuento2: Number(devolucion.f_descuento_nc) || 0,
      f_descuento2: Number(devolucion.f_descuento2) || 0,
      f_itbis: Number(devolucion.f_itbis) || 0,
      f_fecha: formatearFechaRec(devolucion.f_fecha),
      f_hora: devolucion.f_hora || null,
      f_hechopor: Number(devolucion.f_hechopor) || 0,
      f_vendedor: Number(devolucion.f_vendedor) || 0,
      f_pedido: devolucion.f_pedido,
      f_cliente: Number(devolucion.f_cliente) || null,
      f_monto_excento: Number(devolucion.f_monto_excento) || 0,
      f_base_imponible: Number(devolucion.f_base_imponible) || 0,
      f_monto_bruto: Number(devolucion.f_monto_bruto) || 0,
      f_observacion: devolucion.f_observacion || null,
      f_concepto: Number(devolucion.f_concepto) || null
    };
    await api.post('/devoluciones/factura_dev', payload);  // fileciteturn2file9

    // 2) Enviar detalle de devolución
    for (const item of detalles) {
      const payloadDet = {
        f_documento: item.f_documento,
        f_tipodoc: devolucion.f_tipodoc,
        f_nodoc: Number(devolucion.f_nodoc) || null,
        f_referencia: Number(item.f_referencia),
        f_precio: Number(item.f_precio) || 0,
        f_cantidad: Number(item.f_cantidad) || 0,
        f_itbs: Number(item.f_itbis) || 0,
        f_descuento: 0
      };
      await api.post('/devoluciones/detalle_factura_dev', payloadDet);  // fileciteturn2file9
    }

    // 3) Marcar localmente como enviado
    await database.write(async () => {
      const devModel = await database.collections
        .get('t_factura_dev_pda')
        .find(devolucion.id);
      await devModel.update(d => { d.f_enviado = true; });
    });

    if (currentRoute !== "ConsultaDevoluciones") {
      
    Alert.alert("Éxito", "Devolución enviada correctamente");
      navigation.navigate("ConsultaDevoluciones");
    }
  } catch (error) {
    console.error("Error al enviar devolución:", error);
    Alert.alert("Error", "No se pudo enviar la devolución");
    throw error;
  } finally {
    setIsSending(false);
  }
};

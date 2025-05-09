// src/sincronizaciones/enviarRecibo.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import api from "../../api/axios";
import { database } from "../database/database";
import { Q } from '@nozbe/watermelondb';
import {formatearFechaRec} from "../../assets/formatear.js"

export const enviarRecibo = async ({
  recibo,            // objeto _raw del recibo
  aplicaciones,      // array de objetos _raw de aplicaciones
  navigation,
  setIsSending,      // callback para loader
  notas
}) => {
  const state = navigation.getState();
  const currentRoute = state.routes[state.index].name;
  setIsSending(true);

  try {
    // 1) Enviar encabezado de recibo
    // saneamos los campos que pueden venir como "" y deben ser NUMERIC o NULL
    const payload = {
      ...recibo,
      f_fecha: formatearFechaRec(recibo.f_fecha), // formatear fecha a yyyy/mm/dd
      f_monto: Number(recibo.f_monto) || 0,
      f_efectivo: Number(recibo.f_efectivo) || 0,
      f_monto_transferencia: Number(recibo.f_monto_transferencia) || 0,
      f_cheque: Number(recibo.f_cheque) || 0,
      f_cheque_numero: 
        recibo.f_cheque_numero === '' ? null : Number(recibo.f_cheque_numero),
      f_cheque_banco:
        recibo.f_cheque_banco === '' ? null : Number(recibo.f_cheque_banco),
      f_banco_transferencia:
        recibo.f_banco_transferencia === '' ? null : Number(recibo.f_banco_transferencia),
      f_enviado: true,
    };
    await api.post('/recibos/recibo', payload);


    // 2) Enviar cada aplicación
    for (const app of aplicaciones) {
      await api.post('/recibos/aplicaciones', {
        ...app
      });
    }

    // 3) Enviar notas (usa el array que te pasaron)
    for (const nota of notas) {
      
      // convierto campos que puedan venir como string o nulos
      const payloadNC = {
        f_documento: nota.f_documento,     // string
        f_tipo: nota.f_tipo,               // string
        f_nodoc: Number(nota.f_nodoc),     // integer
        f_monto: Number(nota.f_monto),     // numeric
        f_fecha: formatearFechaRec(nota.f_fecha),             // string fecha
        f_concepto: nota.f_concepto,               // string
        f_idcliente: Number(nota.f_idcliente),       // integer
        f_tipo_nota: nota.f_tipo_nota,              // (string o integer según tu API)
        f_factura: nota.f_factura,                // string
        f_ncf: nota.f_ncf || null,     // null en lugar de ""
        f_porc: Number(nota.f_porc),           // integer
        f_documento_principal: 'REC'+Number(recibo.f_norecibo),      // integer
        f_nodoc: Number(nota.f_nodoc) || 0,
        f_monto: Number(nota.f_monto) || 0,
        f_idcliente: Number(nota.f_idcliente) || null,
        f_porc: Number(nota.f_porc) || 0,
        f_enviado: true,
      };
      await api.post('/nc/nc', payloadNC);
    }


    // 4) Marcar localmente como enviados
    await database.write(async () => {
      // recibo
      const recModel = await database.collections
        .get('t_recibos_pda2')
        .find(recibo.id);
      await recModel.update(r => { r.f_enviado = true; });

      // aplicaciones
      for (const app of aplicaciones) {
        const appModel = await database.collections
          .get('t_aplicaciones_pda2')
          .find(app.id);
        await appModel.update(a => { a.f_enviado = true; });
      }

      // notas
      for (const nota of notas) {
        const ncModel = await database.collections
          .get('t_nota_credito_venta_pda2')
          .find(nota.id);
        await ncModel.update(n => { n.f_enviado = true; });
      }
    });

    Alert.alert("Éxito", "Cobranza enviada correctamente");
    if (currentRoute !== 'ConsultaRecibos') {
      await AsyncStorage.removeItem('recibo_guardado');
      // navigation.reset({
      //   index: 0,
      //   routes: [{ name: 'ConsultaRecibos' }],
      // });
    }

  }  catch (error) {
    console.error("Error al enviar cobranza:", error);
    if (error.response?.data?.error?.includes("duplicate key")) {
      Alert.alert("Error", "La cobranza ya existe en la empresa.");
    } else {
      Alert.alert("Error", "No se pudo enviar. Intenta de nuevo más tarde.");
    }
    // Propaga el error para que la función guardar() pueda capturarlo
    throw error;
  } finally {
    setIsSending(false);
  }
};

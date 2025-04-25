// src/sincronizaciones/enviarRecibo.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import api from "../../api/axios";                          // :contentReference[oaicite:0]{index=0}&#8203;:contentReference[oaicite:1]{index=1}
import { database } from "../database/database";
import { Q } from '@nozbe/watermelondb';

export const enviarRecibo = async ({
  recibo,            // objeto _raw del recibo
  aplicaciones,      // array de objetos _raw de aplicaciones
  navigation,
  setIsSending,      // callback para loader
}) => {
  const state = navigation.getState();
  const currentRoute = state.routes[state.index].name;
  setIsSending(true);

  try {
    // 1) Enviar encabezado de recibo
    // saneamos los campos que pueden venir como "" y deben ser NUMERIC o NULL
    const payload = {
      ...recibo,
      f_monto: Number(recibo.f_monto) || 0,
      f_efectivo: Number(recibo.f_efectivo) || 0,
      f_monto_transferencia:
        recibo.f_monto_transferencia === '' ? null : Number(recibo.f_monto_transferencia),
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
      });                                                    // :contentReference[oaicite:4]{index=4}&#8203;:contentReference[oaicite:5]{index=5}
    }

    // 3) Enviar notas de crédito asociadas
    const notaCol = database.collections.get('t_nota_credito_venta_pda2');
    const notas = await notaCol
      .query(
        Q.where('f_nodoc', recibo.f_norecibo),
        Q.where('f_enviado', false)
      ).fetch();

    for (const nc of notas) {
      await api.post('/nc/nc', {
        ...nc._raw
      });                                                    // :contentReference[oaicite:6]{index=6}&#8203;:contentReference[oaicite:7]{index=7}
    }

    // 4) Marcar localmente como enviados
    await database.write(async () => {
      // recibo
      const recModel = await database.collections.get('t_recibos_pda')
        .find(recibo.id);
      await recModel.update(r => { r.f_enviado = true; });

      // aplicaciones
      for (const app of aplicaciones) {
        const appModel = await database.collections.get('t_aplicaciones_pda')
          .find(app.id);
        await appModel.update(a => { a.f_enviado = true; });
      }

      // notas
      for (const nc of notas) {
        const ncModel = await database.collections.get('t_nota_credito_venta_pda2')
          .find(nc.id);
        await ncModel.update(n => { n.f_enviado = true; });
      }
    });

    Alert.alert("Éxito", "Cobranza enviada correctamente");
    if (currentRoute !== 'ConsultaRecibos') {
      await AsyncStorage.removeItem('recibo_guardado');
      navigation.reset({
        index: 0,
        routes: [{ name: 'ConsultaRecibos' }],
      });
    }

  } catch (error) {
    console.error("Error al enviar cobranza:", error);
    if (error.response?.data?.error?.includes("duplicate key")) {
      Alert.alert("Error", "La cobranza ya existe en la empresa.");
    } else {
      Alert.alert("Error", "No se pudo enviar. Intenta de nuevo más tarde.");
    }
    if (currentRoute !== 'ConsultaRecibos') {
      navigation.reset({
        index: 0,
        routes: [{ name: 'ConsultaRecibos' }],
      });
    }
  } finally {
    setIsSending(false);
  }
};

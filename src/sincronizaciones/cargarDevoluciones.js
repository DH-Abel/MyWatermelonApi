import api from '../../api/axios';
import { database } from '../database/database';
import { Q } from '@nozbe/watermelondb';
import { syncHistory } from './syncHistory';
import { InteractionManager } from 'react-native';

let syncInProgress = false;

/**
 * Sincroniza encabezados y detalles de facturas para devoluciones de un cliente.
 * - /devoluciones/:cliente → t_factura
 * - /devoluciones/detalle/:cliente → t_detalle_factura
 */
const cargarDevoluciones = async clienteId => {
  
  if (syncInProgress) return;
  syncInProgress = true;
  console.log('Sincronizando devoluciones...');

  try {
    // 1) Obtener encabezados
    const resHdr = await api.get(`/devoluciones/${encodeURIComponent(clienteId)}`);
    const headers = Array.isArray(resHdr.data) ? resHdr.data : [resHdr.data];

    // 2) Obtener detalles
    const resDet = await api.get(`/devoluciones/detalle/${encodeURIComponent(clienteId)}`);
    const details = Array.isArray(resDet.data) ? resDet.data : [resDet.data];

    // 3) Colecciones locales
    const colHdr = database.collections.get('t_factura');
    const colDet = database.collections.get('t_detalle_factura');

    // 4) Registros locales existentes
    const hdrIds = headers.map(h => h.f_documento);
    const localHdrs = hdrIds.length
      ? await colHdr.query(Q.where('f_documento', Q.oneOf(hdrIds))).fetch()
      : [];
    const localHdrMap = new Map(localHdrs.map(r => [r.f_documento, r]));

    const detKeys = details.map(d => `${d.f_documento}_${d.f_referencia}`);
    const localDets = detKeys.length
      ? await colDet.query(Q.where('id', Q.oneOf(detKeys))).fetch()
      : [];
    const localDetMap = new Map(localDets.map(r => [r.id, r]));

    const actions = [];

    // 5) Sincronizar encabezados
    for (const h of headers) {
      const doc = h.f_documento;
      const local = localHdrMap.get(doc);
      // Normalizar campos
      const nodoc = parseInt(h.f_nodoc, 10);
      const f_vendedor = parseInt(h.f_vendedor, 10);
      const cliente = parseInt(h.f_cliente, 10);
      const monto = parseFloat(h.f_monto);
      const itbis = parseFloat(h.f_itbis);
      const desc = parseFloat(h.f_descuento);
      const fecha = h.f_fecha;
      const descTr = parseFloat(h.f_descuento_transp);
      const descNc = parseFloat(h.f_descuento_nc);

      if (local) {
        // Actualizar si cambió algo
        const changed =
          local.f_cliente !== cliente ||
          local.f_nodoc !== nodoc ||
          local.f_vendedor !== f_vendedor ||
          local.f_monto !== monto ||
          local.f_itbis !== itbis ||
          local.f_descuento !== desc ||
          local.f_fecha !== fecha ||
          local.f_descuento_transp !== descTr ||
          local.f_descuento_nc !== descNc;
        if (changed) {
          actions.push(
            local.prepareUpdate(rec => {
              rec._raw.f_nodoc = nodoc;
              rec._raw.f_vendedor = f_vendedor;
              rec._raw.f_cliente = cliente;
              rec._raw.f_monto = monto;
              rec._raw.f_itbis = itbis;
              rec._raw.f_descuento = desc;
              rec._raw.f_fecha = fecha;
              rec._raw.f_descuento_transp = descTr;
              rec._raw.f_descuento_nc = descNc;
            })
          );
        }
      } else {
        // Crear nuevo encabezado
        actions.push(
          colHdr.prepareCreate(rec => {
            rec._raw.f_documento = doc;
            rec._raw.f_nodoc = nodoc;
            rec._raw.f_vendedor = f_vendedor;
            rec._raw.f_cliente = cliente;
            rec._raw.f_monto = monto;
            rec._raw.f_itbis = itbis;
            rec._raw.f_descuento = desc;
            rec._raw.f_fecha = fecha;
            rec._raw.f_descuento_transp = descTr;
            rec._raw.f_descuento_nc = descNc;
          })
        );
      }
    }

    // 6) Sincronizar detalles
    for (const d of details) {
      const key = `${d.f_documento}_${d.f_referencia}`;
      const local = localDetMap.get(key);
      const cantidad = parseFloat(d.f_cantidad);
      const precio = parseFloat(d.f_precio);
      const itbis = parseFloat(d.f_itbis);
      const qtyDev = parseFloat(d.f_qty_devuelta);

      if (local) {
        // Actualizar detalle existente
        const changed =
          local.f_referencia !== d.f_referencia ||
          local.f_cantidad !== cantidad ||
          local.f_precio !== precio ||
          local.f_itbis !== itbis ||
          local.f_qty_devuelta !== qtyDev;
        if (changed) {
          actions.push(
            local.prepareUpdate(rec => {
              rec._raw.f_referencia = d.f_referencia;
              rec._raw.f_cantidad = cantidad;
              rec._raw.f_precio = precio;
              rec._raw.f_itbis = itbis;
              rec._raw.f_qty_devuelta = qtyDev;
            })
          );
        }
      } else {
        // Crear nuevo detalle
        actions.push(
          colDet.prepareCreate(rec => {
            rec._raw.f_documento = d.f_documento;
            rec._raw.f_cliente = parseInt(d.f_cliente, 10);
            rec._raw.f_referencia = d.f_referencia;
            rec._raw.f_cantidad = cantidad;
            rec._raw.f_precio = precio;
            rec._raw.f_itbis = itbis;
            rec._raw.f_qty_devuelta = qtyDev;
          })
        );
      }
    }

    // 7) Ejecutar batch tras interacciones
await InteractionManager.runAfterInteractions();
if (actions.length) {
  await database.write(async () => {
    await database.batch(actions);
  });
}
    console.log(`Sincronización completada: ${actions.length} acciones.`);
  
    // 8) Registrar historial de sync
    await syncHistory('t_factura');
    await syncHistory('t_detalle_factura');
  } catch (error) {
    console.error('Error sincronizando devoluciones:', error);
  } finally {
    syncInProgress = false;
  }
};

export default cargarDevoluciones;
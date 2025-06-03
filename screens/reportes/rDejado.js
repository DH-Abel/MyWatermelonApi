// src/imprimir/rDejado.js
import { wrapText, formatear,formatearFecha } from "../../assets/formatear";

/**
 * Genera el ticket térmico ESC/POS para un “Dejado de Factura”.
 * @param {Object} dejado    - Registro padre de t_dejar_factura_pda (_raw). Campos relevantes:
 *   - f_documento (string), f_fecha (dd/mm/yyyy), f_vendedor, f_cliente, f_monto, f_balance, f_observacion
 * @param {Array} detalles   - Arreglo de { factura, fecha, monto, balance } de t_det_dejar_factura_pda
 * @param {Object} clientesMap - Mapa { [f_id]: cliente._raw } para obtener nombre, RNC y dirección
 */
export function rDejado(dejado, detalles, clientesMap) {
  // Comandos ESC/POS
  const left = "\x1B\x61\x00";
  const center = "\x1B\x61\x01";
  const right = "\x1B\x61\x02";
  const boldOn = "\x1B\x45\x01";
  const boldOff = "\x1B\x45\x00";
  const separator = "--------------------------------\n"; // ~32 caracteres

  // Fecha y hora de impresión
  const ahora = new Date();
  const fechaPrint = ahora.toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
  const horaPrint = ahora.toLocaleTimeString('es-ES', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  let report = "";

  // ======== Cabecera ========
  report += center + boldOn + "Importadora Fidodido SRL\n" + boldOff;
  report += center + boldOn + "C/ La Rosa #20, Moca, Espaillat\n" + boldOff;
  report += "RNC: 131523226\n";
  report += "Tel: 809-578-1310\n";
  report += separator;

  report += center + boldOn + "DEJADO DE FACTURA\n" + boldOff;
  report += separator;

  // ====== Datos del documento padre ======
  report += left + `No. Documento: ${dejado.f_documento}\n`;
  report += `Fecha (Dejado): ${dejado.f_fecha}\n`;
  report += `Vendedor: ${dejado.f_vendedor}\n`;
  const cliente = clientesMap[dejado.f_cliente] || {};
  report += boldOn + `Cliente: (${dejado.f_cliente}) ${cliente.f_nombre || ""}\n` + boldOff;
  report += `RNC: ${cliente.f_cedula || "-"}\n`;
  report += `Dirección: ${cliente.f_direccion || "-"}\n`;
  report += separator;

  // ====== Detalle de facturas ======
  report += boldOn + `Factura: ` + boldOff + ``
  detalles.forEach(item => {
    // Aseguramos que monto y balance sean strings con dos decimales
    const montoStr = Number(item.monto).toFixed(2);
    const balanceStr = Number(item.balance).toFixed(2);

    // Ajustamos columnas para 32 caracteres aproximadamente:
    //   - “Factura”: 8 chars
    //   - “Fecha”  : 10 chars (dd/mm/yyyy)
    //   - “Monto”  : 8 chars alineado a la derecha
    //   - “Balance”: 8 chars alineado a la derecha
    const facPadded = String(item.factura).padEnd(8).slice(0, 8);
    const fechaPadded = String(item.fecha).replace(/\s+/g, "").padEnd(10).slice(0, 10);
    const montoFmt = formatear(montoStr).padStart(8);
    const balanceFmt = formatear(balanceStr).padStart(8);
    report += separator;
    report += `Factura: `+ boldOn + `${facPadded}` + boldOff + ` Fecha: ${formatearFecha(fechaPadded)}\n`;
    recort += `Monto: ${montoFmt} Balance: ${balanceFmt}\n`;
  });
  report += separator;

  // ====== Totales ======
  report += left + `Total Monto:   RD$${formatear(dejado.f_monto)}\n`;
  report += left + `Total Balance: RD$${formatear(dejado.f_balance)}\n`;
  report += separator;

  // ====== Observación (opcional) ======
  if (dejado.f_observacion && dejado.f_observacion.trim() !== "") {
    report += boldOn + "Observación:\n" + boldOff;
    // Dividimos la observación en líneas de 32 chars
    const linesObs = wrapText(dejado.f_observacion, 32);
    linesObs.forEach(line => {
      report += left + line + "\n";
    });
    report += separator;
  }

  // ====== Pie de página ======
  report += center + `Impresión: ${fechaPrint} ${horaPrint}\n`;
  report += "\n\n\n"; // Saltos para que la impresora haga corte

  return report;
}

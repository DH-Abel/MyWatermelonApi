import { formatNumberToWords, wrapText, formatear } from "../../assets/formatear.js";

// Genera el ticket de devolución con formato ESC/POS
export function rDevoluciones(devolucion, detalles, clientesMap, productosMap) {
  // Comandos ESC/POS básicos
  const left = "\x1B\x61\x00";
  const center = "\x1B\x61\x01";
  const right = "\x1B\x61\x02";
  const boldOn = "\x1B\x45\x01";
  const boldOff = "\x1B\x45\x00";
  const separator = "--------------------------------\n";

  // Fecha y hora actuales
  const ahora = new Date();
  const fecha = ahora.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  let report = "";
  // ===== Cabecera =====
  report += center + boldOn + "Importadora Fidodido SRL\n" + boldOff;
  report += center + boldOn + "DEVOLUCIÓN DE MERCANCÍA\n" + boldOff;
  report += separator;
  report += left + `No. Devolución: ${devolucion.f_tipodoc}${devolucion.f_nodoc}\n`;
  report += left + `Fecha: ${devolucion.f_fecha}   Hora: ${hora}\n`;
  const cliente = clientesMap[devolucion.f_cliente] || {};
  report += boldOn + `Cliente: (${devolucion.f_cliente}) ${cliente.f_nombre || 'N/A'}\n` + boldOff;
  report += `Concepto: ${devolucion.f_concepto}\n`;
  report += `Obs: ${devolucion.f_observacion || '-'}\n`;
  report += separator;

  // ===== Total en letras =====
  const totalEnLetras = formatNumberToWords(devolucion.f_monto);
  const lines = wrapText(totalEnLetras, 32);
  report += boldOn + "Total en Letras:\n" + boldOff;
  lines.forEach(line => {
    report += left + line + '\n';
  });
  report += separator;

 // ===== Detalle (como en rPedido, con ITBIS, Descuento, Descripción y Referencia) =====
// ===== Detalle (formato rPedido con ITBIS, Descuento, Descripción y Referencia) =====
report += boldOn + "Productos:\n" + boldOff;
detalles.forEach(item => {
  // 1) Datos del producto
  const prod = productosMap[item.f_referencia] || {};

  // 2) Preparar strings acotados
  const refProv = prod.f_referencia_suplidor || '';
  let desc = prod.f_descripcion || 'Sin descripción';
  

  // 3) Valores numéricos
  const qty       = Number(item.f_qty_devuelta ?? item.f_cantidad);
  const price     = Number(item.f_precio);
  const itbis     = Number(item.f_itbis);
  const descuento = Number(item.f_descuento ?? 0);

  // 4) Cálculos
  const bruto      = qty * price;
  const totalItbis = qty * itbis;
  const totalDesc  = qty * descuento;
  const total      = (bruto + totalItbis - totalDesc).toFixed(2);

  // 5) Línea 1: referencia interna y de proveedor
  report += `(${item.f_referencia}) ${refProv}\n`;
  // 6) Línea 2: descripción
  report += `${desc}\n`;
  // 7) Línea 3: QTY × Precio + ITBIS − Descuento = Total
  report += `QTY: ${qty} x Precio: ${formatear(price)}\n`;
  report += `Itbis:${formatear(itbis)} - ${descuento? `Descuento:${formatear(descuento)}\n` : ''} Total:${formatear(total)}\n`;
  report += separator;
});
report += separator;






  // ===== Resumen =====
  report += left + `Bruto:        ${Number(devolucion.f_monto_bruto).toFixed(2)}\n`;
  report += left + `Itbis:        ${Number(devolucion.f_itbis).toFixed(2)}\n`;
  devolucion.f_descuento2 ? report += left + `Descuento2:    ${Number(devolucion.f_descuento2).toFixed(2)}\n`: '';
  report += boldOn + `TOTAL A DEVOLVER: RD${formatear(devolucion.f_monto)}\n` + boldOff;

  // Pie de impresión
  report += right + `Impresión: ${fecha} ${hora}`;
  report += "\n\n\n"; // espacio para corte

  return report;
}

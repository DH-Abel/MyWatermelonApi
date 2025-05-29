import { formatNumberToWords, wrapText, formatear } from "../../assets/formatear.js";

// Genera el ticket de recibo de pago con formato inicial ESC/POS
export function rRecibo(recibo, detalle, clientesMap, bancosMap) {
  // Comandos ESC/POS básicos:
  const left = "\x1B\x61\x00";
  const center = "\x1B\x61\x01";
  const right = "\x1B\x61\x02";
  const boldOn = "\x1B\x45\x01";
  const boldOff = "\x1B\x45\x00";
  // Separador ajustado a ancho ~32 caracteres
  const separator = "--------------------------------\n";

  const ahora = new Date();
  const fecha = ahora.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const hora = ahora.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  let report = "";
  // ===== Cabecera =====
  report += right + `Fecha recibo: ${recibo.f_fecha}\n\n`;
  report += center + boldOn + "Importadora Fidodido SRL\n" + boldOff;
  report += center + boldOn + `C/ La Rosa #20, Moca, Espaillat\n` + boldOff;
  report += "RNC: 131523226\n";
  report += "Tel: 809-578-1310\n";
  report += separator;
  report += center + boldOn + "RECIBO DE PAGO\n" + boldOff;
  report += left;
  report += `No. Recibo: ${recibo.f_tiporecibo}${recibo.f_norecibo}\n`;
  report += `Fecha: ${recibo.f_fecha}\n`;
  const cliente = clientesMap[recibo.f_idcliente] || {};
  report += boldOn + `(${recibo.f_idcliente})${cliente.f_nombre || recibo.f_idcliente}\n` + boldOff;
  report += `Cobrador: ${recibo.f_cobrador}\n`;
  report += `RNC: ${cliente.f_cedula || '-'}\n`;
  report += `Direccion: ${cliente.f_direccion || '-'}\n`;
  report += `Concepto: ${recibo.f_concepto || '-'}\n`;
  report += separator;

  const totalEnLetras = formatNumberToWords(recibo.f_monto);      // p.ej. "Doscientos ochenta pesos con cero centavos"
  const lineas = wrapText(totalEnLetras, 32);   // Ajusta a 32 caracteres por línea 
  report += boldOn + "Total en Letras:\n" + boldOff;              
  lineas.forEach(linea => {
    report += left  +  linea + '\n';
  });
  report += separator;


  // ===== Detalle intercalado (monto, descuento y balance) =====
  report += boldOn + "Factura     Pagado   Descuento\n" + boldOff;
  detalle.forEach(item => {
    const fac = item.f_documento_aplicado;
    const monto = Number(item.f_monto).toFixed(2);
    const desc = Number(item.descuento || 0).toFixed(2);
    // Calcula balance: saldo original menos monto y descuento
    const balanceVal = Math.abs(Number(item.f_balance)).toFixed(2);
    const concepto = item.f_concepto || '-';
    // Línea principal con 4 columnas (anchos sumando ~32)
    report += `${fac.padEnd(12)}${monto.padStart(6)} ${desc.padStart(7)}\n`;
    // Línea secundaria con el concepto
    report += `  Concepto: ${concepto}\n`;
    report += `  Balance:  ${balanceVal}\n`;
    report += separator;
  });
  report += separator;

  // ===== Resumen de pagos =====
  report += left + "Resumen de Pagos\n";
  report += recibo.f_efectivo ?`Efectivo:      ${Number(recibo.f_efectivo).toFixed(2)}\n`  : '';
  report += recibo.f_monto_transferencia ?`Transferencia: ${Number(recibo.f_monto_transferencia).toFixed(2)}\n` : '';
  report += recibo.f_cheque ?`Cheque:        ${Number(recibo.f_cheque).toFixed(2)}\n` : '';
  report += recibo.f_cheque ? `Banco cheque:${bancosMap[recibo.f_cheque_banco]} \n` : '';
  report += recibo.f_cheque ? `Cheque No:    ${recibo.f_cheque_numero}\n` : '';
  report += recibo.f_cheque ? `Fecha de cobro:     ${recibo.f_cheque_cobro}\n` : '';
  report += recibo.f_monto_transferencia ? `Banco transferencia: ${bancosMap[recibo.f_banco_transferencia]}\n` : '';
  report += boldOn + `\n TOTAL:         RD${formatear(recibo.f_monto)}\n\n` + boldOff;
  report += center + `_____________________________\n`
  report += center +`Realizado por \n`;

  
  report += center + `Impresion: ${fecha} ${hora}`;




  report += "\n\n\n"; // espacio para el corte

  return report;
}

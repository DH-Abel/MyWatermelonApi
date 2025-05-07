// rRecibo.js
// Genera el ticket de recibo de pago con formato inicial ESC/POS
export function rRecibo(recibo, detalle, clientesMap) {
    // Comandos ESC/POS básicos:
    const left = "\x1B\x61\x00";
    const center = "\x1B\x61\x01";
    const right = "\x1B\x61\x02";
    const boldOn = "\x1B\x45\x01";
    const boldOff = "\x1B\x45\x00";
    // Separador ajustado a ancho ~32 caracteres
    const separator = "--------------------------------\n";
  
    let report = "";
    // ===== Cabecera =====
    report += center + boldOn + "RECIBO DE PAGO\n" + boldOff;
    report += left;
    report += `No. Recibo: ${recibo.f_tiporecibo}${recibo.f_norecibo}\n`;
    report += `Fecha: ${recibo.f_fecha}\n`;
    const cliente = clientesMap[recibo.f_idcliente] || {};
    report += `Cliente: ${cliente.f_nombre || recibo.f_idcliente}\n`;
    report += `Concepto: ${recibo.f_concepto || '-'}\n`;
    report += separator;
  
    // ===== Detalle intercalado (monto, descuento y balance) =====
    report += boldOn + "Factura     Monto Descto Balance\n" + boldOff;
    detalle.forEach(item => {
      const fac = item.f_documento_aplicado;
      const monto = Number(item.f_monto).toFixed(2);
      const desc = Number(item.descuento || 0).toFixed(2);
      // Calcula balance: saldo original menos monto y descuento
      const balanceVal = Number(item.f_balance).toFixed(2);
      const concepto = item.f_concepto || '-';
      // Línea principal con 4 columnas (anchos sumando ~32)
      report += `${fac.padEnd(12)}${monto.padStart(6)}${desc.padStart(7)}\n`;
      // Línea secundaria con el concepto
      report += `  Concepto: ${concepto} ${balanceVal.padStart(7)}\n`; 
      report += separator;
    });
    report += separator;
  
    // ===== Resumen de pagos =====
    report += left + "Resumen de Pagos\n";
    report += `Efectivo:      ${Number(recibo.f_efectivo).toFixed(2)}\n`;
    report += `Transferencia: ${Number(recibo.f_monto_transferencia).toFixed(2)}\n`;
    report += `Cheque:        ${Number(recibo.f_cheque).toFixed(2)}\n`;
    report += boldOn + `TOTAL:         ${Number(recibo.f_monto).toFixed(2)}\n` + boldOff;
    report += "\n\n\n"; // espacio para el corte
  
    return report;
  }
  
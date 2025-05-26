import { formatear } from "../../assets/formatear";
export function rPedido(pedido, detalle, productosMap, clientesMap) {
  // Comandos ESC/POS básicos:
  const left = "\x1B\x61\x00";
  const center = "\x1B\x61\x01";
  const right = "\x1B\x61\x02";
  const boldOn = "\x1B\x45\x01";
  const boldOff = "\x1B\x45\x00";

  // Separador (puedes ajustar la cantidad de guiones según el ancho)
  const separator = "--------------------------------\n";

  let report = "";

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

  report += right + `Fecha Pedido: ${pedido.f_fecha}\n\n`;
  report += center + boldOn + "Importadora Fidodido SRL\n" + boldOff;
  report += center + boldOn + `C/ La Rosa #20, Moca, Espaillat\n` + boldOff;
  report += "RNC: 131523226\n";
  report += "Tel: 809-578-1310\n";
  report += separator;
  report += center + boldOn + "PEDIDO\n" + boldOff;
  report += left;
  report += `No. Pedido: ${pedido.f_documento}\n`;
  report += `Fecha: ${pedido.f_fecha}\n`;
  const cliente = clientesMap[pedido.f_cliente] || {};
  report += boldOn + `(${pedido.f_cliente})${cliente.f_nombre || pedido.f_idcliente}\n` + boldOff;
  report += `Cobrador: ${pedido.f_vendedor}\n`;
  report += `RNC: ${cliente.f_cedula || '-'}\n`;
  report += `Direccion: ${cliente.f_direccion || '-'}\n`;
  report += `Concepto: ${pedido.f_concepto || '-'}\n`;
  report += separator;

  // Cabecera centrada en negrita
  report += center + boldOn + "REPORTE DE PEDIDO\n" + boldOff;
  report += left + separator;

  // Datos generales del pedido
  report += `Doc: ${pedido.f_documento}\n`;
  report += `Fecha: ${pedido.f_fecha} ${pedido.f_hora_vendedor}\n`;
  report += `Cliente: ${pedido.f_cliente}\n`;
  // Puedes agregar más campos, por ejemplo la condición, nota, etc.
  report += separator;

  // Encabezado del detalle
  report += boldOn + "Productos:\n" + boldOff;
  
  // Recorremos cada producto del detalle
  detalle.forEach(item => {
    const producto = productosMap[item.f_referencia] || {};
    // Obtén la descripción del producto y, si es necesario, acórtala para que no se desborde.
    let descripcion = producto.f_descripcion || "Sin descripción";
   

    // Calculamos el total por producto
    const totalProducto = Number(item.f_cantidad) * Number(item.f_precio);

    // Línea 1: Código y descripción (puedes ajustar el formato, por ejemplo, separando en columnas)
    report += `(${item.f_referencia}) ${producto.f_referencia_suplidor}\n`;
    report += `${descripcion}\n`;
    // Línea 2: Cantidad, precio unitario y total (formato simplificado)
    report += `  QTY: ${item.f_cantidad} x $${item.f_precio} = ${totalProducto}\n`;
    
  report += separator;
  
  });

  report += separator;

  // Totales
  // Suponiendo que:
  // - Subtotal = monto - ITBIS  
  // - ITBIS y Total vienen en el pedido
  const subtotal = Number(pedido.f_monto) - Number(pedido.f_itbis);
  report += `Subtotal: ${formatear(subtotal)}\n`;
  report += `Descuento: ${formatear(pedido.f_descuento)}\n`;
  report += `ITBIS:    ${formatear(pedido.f_itbis)}\n`;
  report += boldOn + `TOTAL:    ${formatear(pedido.f_monto)}\n` + boldOff;
  report += separator;

  report += center + `Impresion: ${fecha} ${hora}`;

  // Pie de ticket centrado
  report += center + "¡Gracias por su compra!\n";
  report += "\n\n\n"; // Espacio para el corte

  return report;
}

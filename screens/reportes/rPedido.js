// En print.js o en un módulo aparte, según prefieras:
export function rPedido(pedido, detalle, productosMap) {
    // Comandos ESC/POS básicos:
    const left = "\x1B\x61\x00";
    const center = "\x1B\x61\x01";
    const right = "\x1B\x61\x02";
    const boldOn = "\x1B\x45\x01";
    const boldOff = "\x1B\x45\x00";
    
    // Separador (puedes ajustar la cantidad de guiones según el ancho)
    const separator = "--------------------------------\n";
    
    let report = "";
    
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
      if (descripcion.length > 20) {
        descripcion = descripcion.substring(0, 20) + "...";
      }
      
      // Calculamos el total por producto
      const totalProducto = Number(item.f_cantidad) * Number(item.f_precio);
      
      // Línea 1: Código y descripción (puedes ajustar el formato, por ejemplo, separando en columnas)
      report += `${item.f_referencia} ${descripcion}\n`;
      // Línea 2: Cantidad, precio unitario y total (formato simplificado)
      report += `  ${item.f_cantidad} x ${item.f_precio} = ${totalProducto}\n`;
    });
    
    report += separator;
    
    // Totales
    // Suponiendo que:
    // - Subtotal = monto - ITBIS  
    // - ITBIS y Total vienen en el pedido
    const subtotal = Number(pedido.f_monto) - Number(pedido.f_itbis);
    report += `Subtotal: ${subtotal}\n`;
    report += `ITBIS:    ${pedido.f_itbis}\n`;
    report += boldOn + `TOTAL:    ${pedido.f_monto}\n` + boldOff;
    report += separator;
    
    // Pie de ticket centrado
    report += center + "¡Gracias por su compra!\n";
    report += "\n\n\n"; // Espacio para el corte
    
    return report;
  }
  
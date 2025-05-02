import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const mySchema = appSchema({
  version: 10, // Cambiar la versión de la base de datos, por si agrego campos o tablas
  tables: [
    tableSchema({
      name: 't_productos_sucursal',
      columns: [
        { name: 'f_referencia', type: 'number' },
        { name: 'f_referencia_suplidor', type: 'string' },
        { name: 'f_descripcion', type: 'string' },
        { name: 'f_precio5', type: 'number' },
        { name: 'f_existencia', type: 'number' },
        { name: 'f_activo', type: 'boolean' },
      ]
    }),
    tableSchema({
      name: 't_clientes',
      columns: [
        { name: 'f_id', type: 'number' },
        { name: 'f_nombre', type: 'string' },
        { name: 'f_d_municipio', type: 'string' },
        { name: 'f_vendedor', type: 'number' },
        { name: 'f_zona', type: 'number' },
        { name: 'f_telefono', type: 'string' },
        { name: 'f_telefono_pro', type: 'string' },
        { name: 'f_descuento_maximo', type: 'number' },
        { name: 'f_descuento1', type: 'number' },
        { name: 'f_clasificacion', type: 'number' },
        { name: 'f_direccion', type: 'string' },
        { name: 'f_activo', type: 'boolean' },
        { name: 'f_cedula', type: 'string' },
        { name: 'f_dias_aviso', type: 'number' },
        { name: 'f_bloqueo_credito', type: 'boolean' },
        { name: 'f_facturar_contra_entrega', type: 'boolean' },
        { name: 'f_bloqueo_ck', type: 'boolean' },
        { name: 'f_limite_credito', type: 'number' },
        { name: 'f_termino', type: 'number' },
      ],
    }),
    tableSchema({
      name: 't_cuenta_cobrar',
      columns: [
        { name: 'f_idcliente', type: 'number' },
        { name: 'f_documento', type: 'string' },
        { name: 'f_tipodoc', type: 'string' },
        { name: 'f_nodoc', type: 'number' },
        { name: 'f_fecha', type: 'string' },
        { name: 'f_fecha_vencimiento', type: 'string' },
        { name: 'f_monto', type: 'number' },
        { name: 'f_balance', type: 'number' },
        { name: 'f_impuesto', type: 'number' },
        { name: 'f_base_imponible', type: 'number' },
        { name: 'f_descuento', type: 'number' },

      ],
    }),
    tableSchema({
      name: 't_factura_pedido',
      columns: [
        { name: 'f_cliente', type: 'number' },
        { name: 'f_documento', type: 'string' },
        { name: 'f_tipodoc', type: 'string' },
        { name: 'f_nodoc', type: 'number' },
        { name: 'f_fecha', type: 'string' },
        { name: 'f_hora_vendedor', type: 'string' },
        { name: 'f_itbis', type: 'number' },
        { name: 'f_descuento', type: 'number' },
        { name: 'f_porc_descuento', type: 'number' },
        { name: 'f_monto_bruto', type: 'number' },
        { name: 'f_monto', type: 'number' },
        { name: 'f_condicion', type: 'number' },
        { name: 'f_observacion', type: 'string' },
        { name: 'f_vendedor', type: 'number' },
        { name: 'f_estado_pedido', type: 'number' },
        { name: 'f_enviado', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 't_detalle_factura_pedido',
      columns: [
        { name: 'f_documento', type: 'string' },
        { name: 'f_referencia', type: 'number' },
        { name: 'f_cantidad', type: 'number' },
        { name: 'f_precio', type: 'number' },
      ],
    }),
    tableSchema({
      name: 't_condiciones',
      columns: [
        { name: 'f_id', type: 'number' },
        { name: 'f_descripcion', type: 'string' },
      ],
    }),
    tableSchema({
      name: 't_sync',
      columns: [
        { name: 'f_id', type: 'number' },
        { name: 'f_tabla', type: 'string' },
        { name: 'f_fecha', type: 'string' },
      ],
    }),
    tableSchema({
      name: 't_recibos_pda2',
      columns: [
        { name: 'f_documento', type: 'string' }, //documento del recibo (f_tiporecibo+f_norecibo)
        { name: 'f_tiporecibo', type: 'string' }, //Es 'Rec+f_cobrador'
        { name: 'f_norecibo', type: 'string' }, //secuencia del recibo
        { name: 'f_monto', type: 'number' },
        { name: 'f_fecha', type: 'string' },
        { name: 'f_concepto', type: 'string' },
        { name: 'f_idcliente', type: 'number' },
        { name: 'f_cobrador', type: 'number' }, // id del cobrador
        { name: 'f_efectivo', type: 'number' }, //monto en efectivo
        { name: 'f_monto_transferencia', type: 'number' },
        { name: 'f_cheque', type: 'number' }, //monto del cheque
        { name: 'f_cheque_numero', type: 'number' },
        { name: 'f_cheque_banco', type: 'number' }, //id del banco del cheque
        { name: 'f_banco_transferencia', type: 'number' }, // banco de la transferencia
        { name: 'f_cheque_recibido', type: 'string' },  //fecha en que se recibe el cheque
        { name: 'f_cheque_cobro', type: 'string' }, // fecha de cobro del cheque
        { name: 'f_aprobado', type: 'boolean' }, //Si esta aprobado o no
        { name: 'f_anulado', type: 'boolean' }, //Si esta anulado
        { name: 'f_enviado', type: 'boolean' }, //si fue enviado o no
      ]
    }),
    tableSchema({
      name: 't_aplicaciones_pda2',
      columns: [
        { name: 'f_documento_aplico', type: 'string' }, //documento del recibo que hizo el pago
        { name: 'f_documento_aplicado', type: 'string' },//factura a la que se le hizo el pago
        { name: 'f_tipo_doc', type: 'string' }, //Tipo de documento de la factura
        { name: 'f_concepto', type: 'string' }, //Si fue saldo o abono
        { name: 'f_monto', type: 'number' },
        { name: 'f_fecha', type: 'string' },
        { name: 'f_cliente', type: 'number' },
      ]
    }),
    tableSchema({
      name: 't_bancos',
      columns: [
        { name: 'f_idbanco', type: 'number' },
        { name: 'f_nombre', type: 'string' },
        { name: 'f_cooperativa', type: 'boolean' }, //Para saber si es banco o cooperativa
      ]
    }),
    tableSchema({
      name: 't_desc_x_pago_cliente',
      columns: [
        { name: 'f_cliente', type: 'number' },
        { name: 'f_dia_inicio', type: 'number' },
        { name: 'f_dia_fin', type: 'number' },
        { name: 'f_descuento1', type: 'number' }
      ]
    }),
    tableSchema({
      name: 't_productos_ofertas',
      columns: [
        { name: 'f_referencia', type: 'number' },
        { name: 'f_referencia_oferta', type: 'number' },
        { name: 'f_cantidad_req', type: 'number' },
        { name: 'f_cantidad', type: 'number' }
      ]
    }),
    tableSchema({
      name: 't_nota_credito_venta_pda2',
      columns: [
        { name: 'f_documento', type: 'string' },
        { name: 'f_tipo', type: 'string' },
        { name: 'f_nodoc', type: 'number' },
        { name: 'f_monto', type: 'number' },
        { name: 'f_fecha', type: 'string' },
        { name: 'f_concepto', type: 'string' },
        { name: 'f_idcliente', type: 'number' },
        { name: 'f_tipo_nota', type: 'number' },
        { name: 'f_factura', type: 'string' },
        { name: 'f_ncf', type: 'string' }, //Este es el documento de las devoluciones, en el sistema ARPA se usa con este nombre
        { name: 'f_porc', type: 'number' },
        { name: 'f_enviado', type: 'boolean' }, //si fue enviado o no
        { name: 'f_documento_principal', type: 'string'}
      ]
    }),
    
  ]

});
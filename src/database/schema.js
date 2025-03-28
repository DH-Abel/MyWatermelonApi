import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const mySchema = appSchema({
  version: 2, // Cambiar la versión de la base de datos, por si agrego campos o tablas
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
        { name: 'f_fecha', type: 'string'},
        { name: 'f_fecha_vencimiento', type: 'string' },
        { name: 'f_monto', type: 'number' },
        { name: 'f_balance', type: 'number' }
      ],
    }),
     tableSchema({
          name: 't_factura_pedido',
          columns: [
            { name: 'f_cliente', type: 'number' },
            { name: 'f_documento', type: 'string' },
            { name: 'f_tipodoc', type: 'string' },
            { name: 'f_nodoc', type: 'number' },
            { name: 'f_fecha', type: 'string'},
            { name: 'f_itbis', type: 'number' },
            { name: 'f_descuento', type: 'number'},
            {name: 'f_porc_descuento', type: 'number'},
            { name: 'f_monto_bruto', type: 'number' },
            { name: 'f_monto', type: 'number' },
            { name: 'f_condicion', type: 'number' },
            { name: 'f_observacion', type: 'string' },
            { name: 'f_vendedor', type: 'number' },
            { name: 'f_estado_pedido', type: 'number' },
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
          ]
   
  });
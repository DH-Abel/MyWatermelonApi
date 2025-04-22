import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 5,
      steps: [
        addColumns({
          table: 't_recibos_pda',
          columns: [
            { name: 'f_documento', type: 'string' },
            { name: 'f_tiporecibo', type: 'string' },
            { name: 'f_norecibo', type: 'string' },
            { name: 'f_monto', type: 'string' },
            { name: 'f_fecha', type: 'string' },
            { name: 'f_concepto', type: 'string' },
            { name: 'f_idcliente', type: 'number' },
            { name: 'f_cobrador', type: 'number' },
            { name: 'f_efectivo', type: 'number' },
            { name: 'f_monto_transferencia', type: 'string' },
            { name: 'f_cheque', type: 'number' },
            { name: 'f_cheque_numero', type: 'number' },
            { name: 'f_cheque_banco', type: 'number' },
            { name: 'f_banco_transferencia', type: 'number' },
            { name: 'f_cheque_recibido', type: 'string' },
            { name: 'f_cheque_cobro', type: 'string' },
            { name: 'f_estado', type: 'string' },
            { name: 'f_enviado', type: 'boolean' },
          ],
        }),
        addColumns({
          table: 't_aplicaciones_pda',
          columns: [
            { name: 'f_documento_aplico', type: 'string' },
            { name: 'f_documento_aplicado', type: 'string' },
            { name: 'f_tipo_doc', type: 'string' },
            { name: 'f_concepto', type: 'string' },
            { name: 'f_monto', type: 'number' },
            { name: 'f_fecha', type: 'string' },
            { name: 'f_cliente', type: 'number' },
          ],
        }),
        addColumns({
          table: 't_bancos',
          columns: [
            { name: 'f_idbanco', type: 'string' },
            { name: 'f_nombre', type: 'string' },
            { name: 'f_cooperativa', type: 'string' },
          ],
        }),
        addColumns({
          table: 't_desc_x_pago_cliente',
          columns: [
            { name: 'f_cliente', type: 'number' },
            { name: 'f_dia_inicio', type: 'number' },
            { name: 'f_dia_fin', type: 'number' },
            { name: 'f_descuento1', type: 'number' }
          ],
        }),
        addColumns({
          table: 't_productos_ofertas',
          columns: [
            { name: 'f_referencia', type: 'number' },
            { name: 'f_referencia_oferta', type: 'number' },
            { name: 'f_cantidad_req', type: 'number' },
            { name: 'f_cantidad', type: 'number' }
          ],
        }),
      ],
    },
  ],
});


import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 5,
      steps: [
        addColumns({
          table: 't_factura_pedido',
          columns: [
            { name: 'f_monto_bruto', type: 'number' }
          ],
        }),
      ],
    },
  ],
});

import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 't_factura_pedido',
          columns: [
            { name: 'f_vendedor', type: 'number' },
            { name: 'f_estado_pedido', type: 'number' },
          ],
        }),
      ],
    },
  ],
});

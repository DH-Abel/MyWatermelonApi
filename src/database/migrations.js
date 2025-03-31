import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 3,
      steps: [
        addColumns({
          table: 't_factura_pedido',
          columns: [
            { name: 'f_enviado', type: 'boolean' },
          ],
        }),
      ],
    },
  ],
});

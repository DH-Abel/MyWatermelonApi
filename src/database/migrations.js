import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 't_productos_sucursal',
          columns: [
            { name: 'f_base_imponible', type: 'number' },
            { name: 'f_impuesto', type: 'number' },
          ]
        })
      ],
    },
  ],
});


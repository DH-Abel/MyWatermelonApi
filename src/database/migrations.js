import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 10,
      steps: [
        addColumns({
          table: 't_cuenta_cobrar',
          columns: [
            { name: 'f_base_imponible', type: 'number' },
            { name: 'f_impuesto', type: 'number' },
          ]
        })
      ],
    },
  ],
});


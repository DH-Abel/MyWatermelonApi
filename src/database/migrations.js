import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 5,
      steps: [
        addColumns({
          table: 't_recibos_pda2',
          columns: [
            { name: 'f_impresiones', type: 'number' },
          ]
        })
      ],
    },
  ],
});


import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 4,
      steps: [
        addColumns({
          table: 't_usuarios',
          columns: [
            { name: 'Fvendedor_multiple', type: 'string' },
          ]
        })
      ],
    },
  ],
});


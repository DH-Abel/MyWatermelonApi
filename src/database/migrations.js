import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 6,
      steps: [
        addColumns({
          table: 't_sync',
          columns: [
            { name: 'f_id', type: 'number' },
            { name: 'f_fecha', type: 'string' },
            { name: 'f_tabla', type: 'string' },
          ],
        }),
      ],
    },
  ],
});

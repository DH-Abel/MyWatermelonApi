import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 4,
      steps: [
        addColumns({
          table: 't_clientes',
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
          ],
        }),
      ],
    },
  ],
});

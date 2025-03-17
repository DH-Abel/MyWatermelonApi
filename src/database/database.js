import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { mySchema } from './schema';
import { migrations } from './migrations';
import { DetalleFacturaPedido, Producto } from './models';
import { Clientes } from './models';
import { CuentaCobrar } from './models';
import { FacturaPedido } from './models';


// Configurar el adaptador de SQLite con migraciones
const adapter = new SQLiteAdapter({
  schema: mySchema,
  migrations, // Agrega las migraciones
});

// Crear la base de datos
export const database = new Database({
  adapter,
  modelClasses: [Producto, Clientes, CuentaCobrar, FacturaPedido, DetalleFacturaPedido],
});

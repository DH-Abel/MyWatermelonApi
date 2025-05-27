import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { mySchema } from './schema';
import { migrations } from './migrations';
import { DetalleFacturaPedido, Producto } from './models';
import { Clientes } from './models';
import { CuentaCobrar } from './models';
import { FacturaPedido } from './models';
import { Sync} from './models';
import {RecibosPDA} from './models';
import {Aplicaciones_pda} from './models';
import {DescuentosxPago} from './models';
import {OfertaProductos} from './models';
import {Bancos} from './models';
import { NotaCredito } from './models';
import { Devolucion } from './models';
import { DetalleDevolucion } from './models';
import { EstadoDev } from './models';
import { Factura, DetalleFactura } from './models';
import { ConceptoDevolucion } from './models';
import { Usuarios, Secuencias } from './models';


// Configurar el adaptador de SQLite con migraciones
const adapter = new SQLiteAdapter({
  schema: mySchema,
  migrations, // Agrega las migraciones
});

// Crear la base de datos
export const database = new Database({
  adapter,
  modelClasses: [Producto, Clientes, CuentaCobrar, FacturaPedido,Bancos
     ,DetalleFacturaPedido,Sync,RecibosPDA,Aplicaciones_pda,DescuentosxPago,OfertaProductos,
     NotaCredito,Devolucion,DetalleDevolucion,EstadoDev,Factura,ConceptoDevolucion,DetalleFactura
    ,Usuarios, Secuencias],
      actionsEnabled: true
});

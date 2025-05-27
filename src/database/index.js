// database/index.js
import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'
import { mySchema } from '../schema'
import Usuario from '../models/Usuario'

const adapter = new SQLiteAdapter({ schema: mySchema })
export const database = new Database({
  adapter,
  modelClasses: [Usuario],
  actionsEnabled: true,
})

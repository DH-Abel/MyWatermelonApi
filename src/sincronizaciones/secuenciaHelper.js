// secuenciasHelper.js

import { database } from '../database/database'           // ajusta la ruta si tu schema está en otro sitio
import { Q } from '@nozbe/watermelondb'

/**
 * Obtiene la siguiente secuencia de recibos para el usuario dado,
 * incrementa f_nodoc en la tabla t_secuencias y devuelve { tipodoc, nodoc }.
 *
 * @param {string} usuario — valor que coincide con t_secuencias.f_usuario
 * @returns {Promise<{ tipodoc: string, nodoc: number }>}
 * @throws si no existe un registro en t_secuencias para ese usuario y tabla
 */
export async function getNextReciboSequence(usuario) {
  const nombreTabla = 't_secuencias' // Asegúrate de que este es el nombre correcto de tu tabla
  let result
  await database.write(async () => {
    const seqCollection = database.collections.get(nombreTabla) // nombreTabla === 't_secuencias'
    const [record] = await seqCollection
      .query(
        Q.where('f_usuario', usuario),
        Q.where('f_tabla', 't_recibos_pda2'),
      )
      .fetch()

    if (!record) {
      throw new Error(
        `No existe secuencia para usuario "${usuario}" en tabla "t_recibos_pda2".`
      )
    }
    console.log('→ Raw f_nodoc leido:', record._raw.f_nodoc);
    // Coerción segura: tomamos el raw y forzamos a string antes de parsear
    const rawNodoc = record._raw.f_nodoc
    const current = parseInt(String(rawNodoc), 10) || 0
    const next = current + 1

    await record.update(r => {
      r.f_nodoc = next.toString()
    })

    // Tomamos también el tipodoc desde _raw para evitar posibles undefined
    result = {
      tipodoc: record._raw.f_tipodoc,
      nodoc: next,
      vendedor: record.f_vendedor
    }
  })
  return result
}
export async function getNextNCSequence(usuario) {
  const nombreTabla = 't_secuencias' // Asegúrate de que este es el nombre correcto de tu tabla
  let result
  await database.write(async () => {
    const seqCollection = database.collections.get(nombreTabla) // nombreTabla === 't_secuencias'
    const [record] = await seqCollection
      .query(
        Q.where('f_usuario', usuario),
        Q.where('f_tabla', 't_nota_credito_venta_pda2')
      )
      .fetch()

    if (!record) {
      throw new Error(
        `No existe secuencia para usuario "${usuario}" en tabla "t_nota_credito_venta_pda2".`
      )
    }
    console.log('→ Raw f_nodoc leido:', record._raw.f_nodoc);
    // Coerción segura: tomamos el raw y forzamos a string antes de parsear
    const rawNodoc = record._raw.f_nodoc
    const current = parseInt(String(rawNodoc), 10) || 0
    const next = current + 1

    await record.update(r => {
      r.f_nodoc = next.toString()
    })

    // Tomamos también el tipodoc desde _raw para evitar posibles undefined
    result = {
      tipodoc: record._raw.f_tipodoc,
      nodoc: next,
    }
  })
  return result
}

export async function getNextPedidoSequence(usuario) {
  const nombreTabla = 't_secuencias' // Asegúrate de que este es el nombre correcto de tu tabla
  let result
  await database.write(async () => {
    const seqCollection = database.collections.get(nombreTabla) // nombreTabla === 't_secuencias'
    const [record] = await seqCollection
      .query(
        Q.where('f_usuario', usuario),
        Q.where('f_tabla', 't_factura_pedido')
      )
      .fetch()

    if (!record) {
      throw new Error(
        `No existe secuencia para usuario "${usuario}" en tabla "t_factura_pedido".`
      )
    }
    console.log('→ Raw f_nodoc leido:', record._raw.f_nodoc);
    // Coerción segura: tomamos el raw y forzamos a string antes de parsear
    const rawNodoc = record._raw.f_nodoc
    const current = parseInt(String(rawNodoc), 10) || 0
    const next = current + 1

   
    await record.update(r => {
      r.f_nodoc = next.toString()
    })

    // Tomamos también el tipodoc desde _raw para evitar posibles undefined
    result = {
      tipodoc: record._raw.f_tipodoc,
      nodoc: next,
    }
  })
  return result
}

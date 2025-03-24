import api from '../../api/axios';
import { database } from '../database/database';
import { Q } from '@nozbe/watermelondb';

let syncInProgress = false;

const getLastSync = async (nombreTabla) => {
  try {
    const syncCollection = database.collections.get('t_sync');
    const registros = await syncCollection.query(Q.where('f_tabla', nombreTabla)).fetch();
    if (registros.length > 0) {
      // Convierte el string a número y crea un objeto Date para mostrarlo o usarlo en comparaciones
      const timestamp = parseInt(registros[0].f_fecha, 10);
      console.log("Fecha de la última sincronización: " + new Date(timestamp).toLocaleString());
      return timestamp;
    }
    console.log('No se encontraron registros de sincronización para la tabla ' + nombreTabla);
  } catch (error) {
    console.error('Error al obtener el historial de sincronización:', error);
  }
  return 0;
};

const normalizeText = (value) => {
  return value == null ? "" : String(value).trim();
};

const normalizeNumberField = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(value);
  return isNaN(n) ? 0 : n;
};

const sincronizarClientes = async () => {
  if (syncInProgress) return; // Evitar operaciones concurrentes
  const intervalMS = 14400000; // 4 hora en milisegundos
  const lastSync = await getLastSync('t_clientes');

  if (Date.now() - lastSync < intervalMS) {
    console.log('Se realizo hace menos de 1 hora, no se sincroniza, faltan ' + ((intervalMS - (Date.now() - lastSync)) / 60000) + ' minutos');
    return;
  }

  syncInProgress = true;
  try {
    // Obtén los clientes desde la API
    const response = await api.get('/clientes');
    const clientesRemotos = response.data;
    console.log(`Fetched ${clientesRemotos.length} clientes remotos.`);

    // Crea un Set con los f_id remotos para usarlo en la eliminación
    const remoteIds = new Set(
      clientesRemotos.map(cli => parseInt(cli.f_id, 10))
    );

    await database.write(async () => {
      const clientesCollection = database.collections.get('t_clientes');

      // Actualiza o inserta clientes según los datos remotos
      for (let cli of clientesRemotos) {
        // Normaliza campos de texto provenientes de la API
        cli.f_nombre = normalizeText(cli.f_nombre);
        cli.f_d_municipio = normalizeText(cli.f_d_municipio);
        cli.f_telefono = normalizeText(cli.f_telefono);
        cli.f_telefono_pro = normalizeText(cli.f_telefono_pro);
        cli.f_direccion = normalizeText(cli.f_direccion);
        cli.f_cedula = normalizeText(cli.f_cedula);

        // Normaliza campos numéricos
        cli.f_id = parseInt(cli.f_id, 10);
        cli.f_vendedor = normalizeNumberField(cli.f_vendedor);
        cli.f_zona = normalizeNumberField(cli.f_zona);
        cli.f_descuento_maximo = normalizeNumberField(cli.f_descuento_maximo);
        cli.f_descuento1 = normalizeNumberField(cli.f_descuento1);
        cli.f_clasificacion = normalizeNumberField(cli.f_clasificacion);
        cli.f_dias_aviso = normalizeNumberField(cli.f_dias_aviso);
        cli.f_limite_credito = normalizeNumberField(cli.f_limite_credito);
        cli.f_termino = normalizeNumberField(cli.f_termino);

        // Busca el cliente local por su f_id (clave única)
        const clientesLocales = await clientesCollection.query(
          Q.where('f_id', cli.f_id)
        ).fetch();

        if (clientesLocales.length > 0) {
          // El cliente ya existe: comparar campos para ver si es necesaria la actualización
          const clienteLocal = clientesLocales[0];
          let updateNeeded = false;
          let differences = [];

          if (normalizeText(clienteLocal.f_nombre) !== cli.f_nombre) {
            updateNeeded = true;
            differences.push(`f_nombre: local (${normalizeText(clienteLocal.f_nombre)}) vs remoto (${cli.f_nombre})`);
          }
          if (normalizeText(clienteLocal.f_d_municipio) !== cli.f_d_municipio) {
            updateNeeded = true;
            differences.push(`f_d_municipio: local (${normalizeText(clienteLocal.f_d_municipio)}) vs remoto (${cli.f_d_municipio})`);
          }
          if (clienteLocal.f_vendedor !== cli.f_vendedor) {
            updateNeeded = true;
            differences.push(`f_vendedor: local (${clienteLocal.f_vendedor}) vs remoto (${cli.f_vendedor})`);
          }
          if (clienteLocal.f_zona !== cli.f_zona) {
            updateNeeded = true;
            differences.push(`f_zona: local (${clienteLocal.f_zona}) vs remoto (${cli.f_zona})`);
          }
          if (normalizeText(clienteLocal.f_telefono) !== cli.f_telefono) {
            updateNeeded = true;
            differences.push(`f_telefono: local (${normalizeText(clienteLocal.f_telefono)}) vs remoto (${cli.f_telefono})`);
          }
          if (normalizeText(clienteLocal.f_telefono_pro) !== cli.f_telefono_pro) {
            updateNeeded = true;
            differences.push(`f_telefono_pro: local (${normalizeText(clienteLocal.f_telefono_pro)}) vs remoto (${cli.f_telefono_pro})`);
          }
          if (clienteLocal.f_descuento_maximo !== cli.f_descuento_maximo) {
            updateNeeded = true;
            differences.push(`f_descuento_maximo: local (${clienteLocal.f_descuento_maximo}) vs remoto (${cli.f_descuento_maximo})`);
          }
          if (clienteLocal.f_descuento1 !== cli.f_descuento1) {
            updateNeeded = true;
            differences.push(`f_descuento1: local (${clienteLocal.f_descuento1}) vs remoto (${cli.f_descuento1})`);
          }
          if (clienteLocal.f_clasificacion !== cli.f_clasificacion) {
            updateNeeded = true;
            differences.push(`f_clasificacion: local (${clienteLocal.f_clasificacion}) vs remoto (${cli.f_clasificacion})`);
          }
          if (normalizeText(clienteLocal.f_direccion) !== cli.f_direccion) {
            updateNeeded = true;
            differences.push(`f_direccion: local (${normalizeText(clienteLocal.f_direccion)}) vs remoto (${cli.f_direccion})`);
          }
          if (clienteLocal.f_activo !== cli.f_activo) {
            updateNeeded = true;
            differences.push(`f_activo: local (${clienteLocal.f_activo}) vs remoto (${cli.f_activo})`);
          }
          if (normalizeText(clienteLocal.f_cedula) !== cli.f_cedula) {
            updateNeeded = true;
            differences.push(`f_cedula: local (${normalizeText(clienteLocal.f_cedula)}) vs remoto (${cli.f_cedula})`);
          }
          if (clienteLocal.f_dias_aviso !== cli.f_dias_aviso) {
            updateNeeded = true;
            differences.push(`f_dias_aviso: local (${clienteLocal.f_dias_aviso}) vs remoto (${cli.f_dias_aviso})`);
          }
          if (clienteLocal.f_bloqueo_credito !== cli.f_bloqueo_credito) {
            updateNeeded = true;
            differences.push(`f_bloqueo_credito: local (${clienteLocal.f_bloqueo_credito}) vs remoto (${cli.f_bloqueo_credito})`);
          }
          if (clienteLocal.f_facturar_contra_entrega !== cli.f_facturar_contra_entrega) {
            updateNeeded = true;
            differences.push(`f_facturar_contra_entrega: local (${clienteLocal.f_facturar_contra_entrega}) vs remoto (${cli.f_facturar_contra_entrega})`);
          }
          if (clienteLocal.f_bloqueo_ck !== cli.f_bloqueo_ck) {
            updateNeeded = true;
            differences.push(`f_bloqueo_ck: local (${clienteLocal.f_bloqueo_ck}) vs remoto (${cli.f_bloqueo_ck})`);
          }
          if (clienteLocal.f_limite_credito !== cli.f_limite_credito) {
            updateNeeded = true;
            differences.push(`f_limite_credito: local (${clienteLocal.f_limite_credito}) vs remoto (${cli.f_limite_credito})`);
          }
          if (clienteLocal.f_termino !== cli.f_termino) {
            updateNeeded = true;
            differences.push(`f_termino: local (${clienteLocal.f_termino}) vs remoto (${cli.f_termino})`);
          }

          if (updateNeeded) {
            await clienteLocal.update(record => {
              record.f_nombre = cli.f_nombre;
              record.f_d_municipio = cli.f_d_municipio;
              record.f_vendedor = cli.f_vendedor;
              record.f_zona = cli.f_zona;
              record.f_telefono = cli.f_telefono;
              record.f_telefono_pro = cli.f_telefono_pro;
              record.f_descuento_maximo = cli.f_descuento_maximo;
              record.f_descuento1 = cli.f_descuento1;
              record.f_clasificacion = cli.f_clasificacion;
              record.f_direccion = cli.f_direccion;
              record.f_activo = cli.f_activo;
              record.f_cedula = cli.f_cedula;
              record.f_dias_aviso = cli.f_dias_aviso;
              record.f_bloqueo_credito = cli.f_bloqueo_credito;
              record.f_facturar_contra_entrega = cli.f_facturar_contra_entrega;
              record.f_bloqueo_ck = cli.f_bloqueo_ck;
              record.f_limite_credito = cli.f_limite_credito;
              record.f_termino = cli.f_termino;
            });
            console.log(`Cliente ${cli.f_id} actualizado. Cambios: ${differences.join(', ')}`);
          } else {
            //console.log(`Cliente ${cli.f_id} sin cambios.`);
          }
        } else {
          await clientesCollection.create(record => {
            record.f_id = cli.f_id;
            record.f_nombre = cli.f_nombre;
            record.f_dmunicipio = cli.f_dmunicipio; // Verifica que el nombre de campo coincida con tu esquema
            record.f_d_municipio = cli.f_d_municipio;
            record.f_vendedor = cli.f_vendedor;
            record.f_zona = cli.f_zona;
            record.f_telefono = cli.f_telefono;
            record.f_telefono_pro = cli.f_telefono_pro;
            record.f_descuento_maximo = cli.f_descuento_maximo;
            record.f_descuento1 = cli.f_descuento1;
            record.f_clasificacion = cli.f_clasificacion;
            record.f_direccion = cli.f_direccion;
            record.f_activo = cli.f_activo;
            record.f_cedula = cli.f_cedula;
            record.f_dias_aviso = cli.f_dias_aviso;
            record.f_bloqueo_credito = cli.f_bloqueo_credito;
            record.f_facturar_contra_entrega = cli.f_facturar_contra_entrega;
            record.f_bloqueo_ck = cli.f_bloqueo_ck;
            record.f_limite_credito = cli.f_limite_credito;
            record.f_termino = cli.f_termino;
          });
          console.log(`Cliente ${cli.f_id} insertado.`);
        }
      }

      // Eliminar registros locales que no estén en la API
      const clientesLocalesTotales = await clientesCollection.query().fetch();
      for (let clienteLocal of clientesLocalesTotales) {
        if (!remoteIds.has(clienteLocal.f_id)) {
          await clienteLocal.destroyPermanently();
          console.log(`Cliente ${clienteLocal.f_id} eliminado porque no figura en la API.`);
        }
      }
      console.log('Todos los clientes procesados dentro de la transacción.');
    });
    console.log('Sincronización de clientes completada.');
  } catch (error) {
    console.error('Error en la sincronización de clientes:', error);
  } finally {
    syncInProgress = false;
  }
};

export default sincronizarClientes;

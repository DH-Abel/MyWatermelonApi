import api from '../api/axios';
import { database } from '../src/database/database';
import { Q } from '@nozbe/watermelondb';



let syncClientesInProgress = false;
const normalizeString = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const normalizeNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  return Number(value);
};
const sincronizarClientes = async () => {
    if (syncClientesInProgress) return; // Evitar concurrencia
    syncClientesInProgress = true;
    try {
      const response = await api.get('/clientes');
      const clientesRemotos = response.data;

      await database.write(async () => {
        const clientesCollection = database.collections.get('t_clientes');

        for (let cli of clientesRemotos) {
          const remote = {
            f_id: cli.f_id,
            f_nombre: normalizeString(cli.f_nombre),
            f_d_municipio: normalizeString(cli.f_d_municipio),
            f_vendedor: normalizeString(cli.f_vendedor),
            f_zona: normalizeString(cli.f_zona),
            f_telefono: normalizeString(cli.f_telefono),
            f_telefono_pro: normalizeString(cli.f_telefono_pro),
            f_descuento_maximo: normalizeNumber(cli.f_descuento_maximo),
            f_descuento1: normalizeNumber(cli.f_descuento1),
            f_clasificacion: normalizeString(cli.f_clasificacion),
            f_direccion: normalizeString(cli.f_direccion),
            f_activo: normalizeString(cli.f_activo),
            f_cedula: normalizeString(cli.f_cedula),
            f_dias_aviso: normalizeString(cli.f_dias_aviso),
            f_bloqueo_credito: normalizeString(cli.f_bloqueo_credito),
            f_facturar_contra_entrega: normalizeString(cli.f_facturar_contra_entrega),
            f_bloqueo_ck: normalizeString(cli.f_bloqueo_ck),
            f_limite_credito: normalizeNumber(cli.f_limite_credito),
            f_termino: normalizeNumber(cli.f_termino)
          };

          const clientesLocales = await clientesCollection.query(
            Q.where('f_id', remote.f_id)
          ).fetch();

          if (clientesLocales.length > 0) {
            const clienteLocal = clientesLocales[0];
            const local = {
              f_id: clienteLocal.f_id,
              f_nombre: normalizeString(clienteLocal.f_nombre),
              f_d_municipio: normalizeString(clienteLocal.f_d_municipio),
              f_vendedor: normalizeString(clienteLocal.f_vendedor),
              f_zona: normalizeString(clienteLocal.f_zona),
              f_telefono: normalizeString(clienteLocal.f_telefono),
              f_telefono_pro: normalizeString(clienteLocal.f_telefono_pro),
              f_descuento_maximo: normalizeNumber(clienteLocal.f_descuento_maximo),
              f_descuento1: normalizeNumber(clienteLocal.f_descuento1),
              f_clasificacion: normalizeString(clienteLocal.f_clasificacion),
              f_direccion: normalizeString(clienteLocal.f_direccion),
              f_activo: normalizeString(clienteLocal.f_activo),
              f_cedula: normalizeString(clienteLocal.f_cedula),
              f_dias_aviso: normalizeString(clienteLocal.f_dias_aviso),
              f_bloqueo_credito: normalizeString(clienteLocal.f_bloqueo_credito),
              f_facturar_contra_entrega: normalizeString(clienteLocal.f_facturar_contra_entrega),
              f_bloqueo_ck: normalizeString(clienteLocal.f_bloqueo_ck),
              f_limite_credito: normalizeNumber(clienteLocal.f_limite_credito),
              f_termino: (clienteLocal.f_termino)
            };

            let updateNeeded = false;
            let differences = [];

            if (local.f_nombre !== remote.f_nombre) {
              updateNeeded = true;
              differences.push(`f_nombre: local (${local.f_nombre}) vs remoto (${remote.f_nombre})`);
            }
            // Compara el resto de los campos de la misma manera...
            if (local.f_d_municipio !== remote.f_d_municipio) {
              updateNeeded = true;
              differences.push(`f_d_municipio: local (${local.f_d_municipio}) vs remoto (${remote.f_d_municipio})`);
            }
            // ... agrega todas las comparaciones necesarias

            if (updateNeeded) {
              await clienteLocal.update(record => {
                record.f_id = remote.f_id;
                record.f_nombre = remote.f_nombre;
                record.f_d_municipio = remote.f_d_municipio;
                record.f_vendedor = remote.f_vendedor;
                record.f_zona = remote.f_zona;
                record.f_telefono = remote.f_telefono;
                record.f_telefono_pro = remote.f_telefono_pro;
                record.f_descuento_maximo = remote.f_descuento_maximo;
                record.f_descuento1 = remote.f_descuento1;
                record.f_clasificacion = remote.f_clasificacion;
                record.f_direccion = remote.f_direccion;
                record.f_activo = remote.f_activo;
                record.f_cedula = remote.f_cedula;
                record.f_dias_aviso = remote.f_dias_aviso;
                record.f_bloqueo_credito = remote.f_bloqueo_credito;
                record.f_facturar_contra_entrega = remote.f_facturar_contra_entrega;
                record.f_bloqueo_ck = remote.f_bloqueo_ck;
                record.f_limite_credito = remote.f_limite_credito;
                record.f_termino = remote.f_termino;
              });
              console.log(`Cliente ${remote.f_id} actualizado. Cambios: ${differences.join(', ')}`);
            } else {
              console.log(`Cliente ${remote.f_id} sin cambios.`);
            }
          } else {
            await clientesCollection.create(record => {
              record.f_id = remote.f_id;
              record.f_nombre = remote.f_nombre;
              record.f_d_municipio = remote.f_d_municipio;
              record.f_vendedor = remote.f_vendedor;
              record.f_zona = remote.f_zona;
              record.f_telefono = remote.f_telefono;
              record.f_telefono_pro = remote.f_telefono_pro;
              record.f_descuento_maximo = remote.f_descuento_maximo;
              record.f_descuento1 = remote.f_descuento1;
              record.f_clasificacion = remote.f_clasificacion;
              record.f_direccion = remote.f_direccion;
              record.f_activo = remote.f_activo;
              record.f_cedula = remote.f_cedula;
              record.f_dias_aviso = remote.f_dias_aviso;
              record.f_bloqueo_credito = remote.f_bloqueo_credito;
              record.f_facturar_contra_entrega = remote.f_facturar_contra_entrega;
              record.f_bloqueo_ck = remote.f_bloqueo_ck;
              record.f_limite_credito = remote.f_limite_credito;
              record.f_termino = remote.f_termino;
            });
            console.log(`Cliente ${remote.f_id} insertado.`);
          }
        }
      });
    } catch (error) {
      console.error('❌ Error al sincronizar clientes:', error);
    }
    finally {
      syncClientesInProgress = false;
    }
  };

  export default sincronizarClientes;
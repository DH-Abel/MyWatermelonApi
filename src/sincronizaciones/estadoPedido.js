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

const sincronizarEstado = async (pedidosSeleccionados = null) => {
    if (syncInProgress) return; // Evitar operaciones concurrentes

    const intervalMS = 30000; // 15 SEGUNDOS  
    const lastSync = await getLastSync('t_factura_pedido');


    if (Date.now() - lastSync < intervalMS) {
        console.log('Se realizo hace menos de 1 hora, no se sincroniza, faltan ' + ((intervalMS - (Date.now() - lastSync)) / 60000) + ' minutos');
        return;
    }

    syncInProgress = true;
    try {
        const pedidoCollection = database.collections.get('t_factura_pedido');
        let pedidosLocales = pedidosSeleccionados && pedidosSeleccionados.length >0
        ? pedidosSeleccionados
        : await pedidoCollection.query().fetch();


        if (pedidosLocales.length === 0) {
            console.log('No hay pedidos locales para sincronizar');
            return;
        }

        for (const pedidoLocal of pedidosLocales){
            const f_documentoLocal = pedidoLocal._raw.f_documento;

            console.log(`Intentando sincronizar para f_documento: ${f_documentoLocal}`);
    
            // Obtén los clientes desde la API
            const response = await api.get('/pedidos/estado', { params: { f_documento: f_documentoLocal } });
            const estadoRemoto = response.data;
    
            await database.write(async () => {
                const estadoCollection = database.collections.get('t_factura_pedido');
    
                // Actualiza o inserta clientes según los datos remotos
                for (let cli of estadoRemoto) {
    
                    // Busca el cliente local por su f_id (clave única)
                    const estadosLocales = await estadoCollection.query(
                        Q.where('f_documento', cli.f_documento)
                    ).fetch();
    
                    if (estadosLocales.length > 0) {
                        // El cliente ya existe: comparar campos para ver si es necesaria la actualización
                        const estadoLocal = estadosLocales[0];
                        let updateNeeded = false;
                        let differences = [];
    
                        if ((estadoLocal.f_estado_pedido) !== cli.f_estado_pedido) {
                            updateNeeded = true;
                            differences.push(`f_estado_pedido: local (${(estadoLocal.f_estado_pedido)}) vs remoto (${cli.f_estado_pedido})`);
                        }
                        if ((estadoLocal.f_factura) !== cli.f_factura) {
                            updateNeeded = true;
                            differences.push(`f_factura: local (${(estadoLocal.f_estado_pedido)}) vs remoto (${cli.f_estado_pedido})`);
                        }
    
                        if (updateNeeded) {
                            await estadoLocal.update(record => {
                                record.f_estado_pedido = cli.f_estado_pedido;
                                record.f_factura = cli.f_factura;
                            });
                            console.log(`pedido ${cli.f_documento} actualizado. Cambios: ${differences.join(', ')}`);
                        } else {
                            console.log(`pedido ${cli.f_documento} sin cambios.`);
                        }
                    }
    
                }
    
            });
        }
       
        console.log('Sincronización de pedidos completada.');
    } catch (error) {
        console.error('Error en la sincronización de pedidos:', error);
    } finally {
        syncInProgress = false;
    }
};

export default sincronizarEstado;

import api from '../../api/axios';
import { database } from '../database/database';
import { Q } from '@nozbe/watermelondb';

const nombreTabla = 't_secuencias';
let syncInProgress = false;



const trimString = (v) => (v == null ? '' : String(v).trim());


const sincronizarSecuencias = async (vendedorParam) => {
    if (syncInProgress) return;

    syncInProgress = true;
    try {
        // usa el vendedor que te pasen o, si no, cae al primero
        const vendedor = vendedorParam ?? (() => {
            console.warn('No vino vendedor por parámetro, uso el primero de t_usuarios');
            /* aquí podrías fallback a la colección si lo quieres: */
        })();

        const rutas = [
            { endpoint: 'recibos', tabla: 't_recibos_pda2' },
            { endpoint: 'pedidos', tabla: 't_factura_pedido' },
            { endpoint: 'devoluciones', tabla: 't_factura_dev_pda' },
        ];

        let remoteItems = [];
        for (const { endpoint, tabla } of rutas) {
            console.log(`Sincronizando secuencias: ${endpoint}…`);
            const { data: raw } = await api.get(
                `/secuencias/${endpoint}/${encodeURIComponent(vendedor)}`
            );
            if (!Array.isArray(raw)) continue;
            const items = raw.map(item => ({
                tipodoc: trimString(item.f_tipodoc),
                nodoc: parseInt(item.f_nodoc),
                tabla: trimString(item.f_tabla),
            }));
            remoteItems = remoteItems.concat(items);
        }

        // Leer registros locales
        const col = database.collections.get(nombreTabla);
        const locales = await col.query().fetch();
        const localMap = new Map(
            locales.map(r => [`${r.f_tipodoc}|${r.f_tabla}`, r])
        );

        // Preparar batch
        const batchActions = [];
        for (const s of remoteItems) {
            const key = `${s.tipodoc}|${s.tabla}`;
            const local = localMap.get(key);
            if (local) {
                if (local.f_nodoc !== s.nodoc) {
                    batchActions.push(
                        local.prepareUpdate(record => {
                            record.f_nodoc = s.nodoc;
                        })
                    );
                }
            } else {
                batchActions.push(
                    col.prepareCreate(record => {
                        record._raw.id = `${s.tipodoc}_${s.tabla}`;
                        record.f_id = 0; // Ajustar si el API retorna un ID
                        record.f_tipodoc = s.tipodoc;
                        record.f_nodoc = s.nodoc;
                        record.f_tabla = s.tabla;
                    })
                );
            }
        }

        // Ejecutar batch dentro de un writer
        await database.write(async () => {
            if (batchActions.length > 0) {
                await database.batch(batchActions);
                console.log(`Batch ejecutado: ${batchActions.length} acciones.`);
            } else {
                console.log('No hay cambios de secuencias que aplicar.');
            }
        });

        console.log('Sincronización de secuencias completada.');
    } catch (error) {
        console.error('Error sincronizando secuencias:', error);
    } finally {
        syncInProgress = false;
    }
};

export default sincronizarSecuencias;

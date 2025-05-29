import api from '../../api/axios';
import { database } from '../database/database';
import { Q } from '@nozbe/watermelondb';

const nombreTabla = 't_secuencias';
let syncInProgress = false;

const trimString = (v) => (v == null ? '' : String(v).trim());

const sincronizarSecuencias = async (vendedorParam, usuarioParam) => {
    if (syncInProgress) return;
    syncInProgress = true;

    const newItems = [];
    const updatedItems = [];

    try {
        const vendedor = vendedorParam ?? (() => {
            console.warn('No vino vendedor por parámetro, uso el primero de t_usuarios');
        })();

        const rutas = ['recibos', 'pedidos', 'devoluciones'];

        // Obtener secuencias remotas
        let remoteItems = [];
        for (const endpoint of rutas) {
            // ←────────── antes de la llamada, log de URL ──────────→
            console.log(`▶ Llamando a /secuencias/${endpoint}/${vendedor}`);
            const { data: raw } = await api.get(
                `/secuencias/${endpoint}/${encodeURIComponent(vendedor)}`
            );
            // ←────────── justo después, inspecciona raw ──────────→
            console.log(`▶ ${endpoint} raw:`, raw);
            if (!Array.isArray(raw)) {
                console.error(`Error: esperaba un array para ${endpoint} pero recibí`, raw);
                // saltar este endpoint sin romper todo
                continue;
            }
            if (!Array.isArray(raw)) continue;
            const items = raw.map(item => ({
                tipodoc: trimString(item.f_tipodoc),
                nodoc: parseInt(trimString(item.f_nodoc), 10),
                tabla: trimString(item.f_tabla),
                vendedor: trimString(item.f_vendedor),
                usuario: trimString(usuarioParam || item.f_usuario)

            }));
            remoteItems = remoteItems.concat(items);
        }
        const { data: raw } = await api.get(
            `/secuencias/recibos/${encodeURIComponent(vendedor)}`

        );
        console.log('▶ recibos raw:', raw);

        // Eliminar duplicados por tipodoc|tabla
        const seen = new Set();
        remoteItems = remoteItems.filter(s => {
            const key = `${s.usuario}_${s.tabla}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        // Leer registros locales del usuario
        const col = database.collections.get(nombreTabla);
        const locales = await col.query(
            Q.where('f_usuario', usuarioParam)
        ).fetch();

        const localMap = new Map(
            locales.map(r => {
                const key = `${r.f_usuario}_${r.f_tabla}`;
                return [key, r];
            })
        );


        // Preparar batch
        const batchActions = [];
        for (const s of remoteItems) {
           const key = `${s.usuario}_${s.tabla}`;
            const local = localMap.get(key);
            if (local) {
                if (local.f_nodoc !== s.nodoc) {
                    batchActions.push(
                        local.prepareUpdate(record => {
                            record.f_nodoc = s.nodoc;
                            record.f_tipodoc = s.tipodoc;
                            record.f_vendedor = s.vendedor;
                        })
                    );
                    updatedItems.push(s);
                }
            } else {
                batchActions.push(
                    col.prepareCreate(record => {
                        const newId = `${s.usuario}_${s.tabla}`;
                        record._raw.id = newId;
                        record.f_usuario = s.usuario;
                        record.f_tipodoc = s.tipodoc;
                        record.f_nodoc = s.nodoc;
                        record.f_tabla = s.tabla;
                    })
                );
                newItems.push(s);
                localMap.set(key, true);
            }
        }

        await database.write(async () => {
            if (batchActions.length > 0) {
                await database.batch(batchActions);
                console.log(`Batch ejecutado: ${batchActions.length} acciones.`);
            } else {
                console.log('No hay cambios de secuencias que aplicar.');
            }
        });

        console.log('Secuencias insertadas:', newItems);
        console.log('Secuencias actualizadas:', updatedItems);
        console.log('Sincronización de secuencias completada.');
    } catch (error) {
        console.error('Error sincronizando secuencias:', error);
    } finally {
        syncInProgress = false;
    }
};

export default sincronizarSecuencias;

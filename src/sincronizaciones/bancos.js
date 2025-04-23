import api from '../../api/axios';
import { database } from '../database/database';
import { Q } from '@nozbe/watermelondb';
import { syncHistory } from './syncHistory';

let syncInProgress = false;

const getLastSync = async (nombreTabla) => {
    try {
        const syncCollection = database.collections.get('t_sync');
        const registros = await syncCollection.query(
            Q.where('f_tabla', nombreTabla)
        ).fetch();
        if (registros.length > 0) {
            return parseInt(registros[0].f_fecha, 10);
        }
    } catch (error) {
        console.error(`Error obteniendo última sincronización para ${nombreTabla}:`, error);
    }
    return 0;
};

/**
 * Sincroniza tabla t_desc_x_pago_cliente con la API
 */
const sincronizarBancos = async () => {
    console.log('Sincronizando bancos...');
    console.log(Object.keys(database.collections.map));
    if (syncInProgress) return;
    const nombreTabla = 't_bancos';
    const intervalo = 172800000; // 48 horas en ms
    const lastSync = await getLastSync(nombreTabla);

    if (Date.now() - lastSync < intervalo) {
        console.log(`Sincronización de bancos omitida, faltan ${{
            ms: intervalo - (Date.now() - lastSync)
        }} ms`);
        return;
    }

    syncInProgress = true;
    try {
        const response = await api.get('/bancos');
        const remote = response.data;

        if (!Array.isArray(remote)) return;

        await database.write(async () => {
            const descCollection = database.collections.get(nombreTabla);

            for (const item of remote) {
                const f_idbanco = item.f_idbanco
                const f_nombre = item.f_nombre
                const f_cooperativa = item.f_cooperativa

                const existentes = await descCollection.query(
                    Q.where('f_idbanco', f_idbanco),
                    Q.where('f_nombre', f_nombre),
                    Q.where('f_cooperativa', f_cooperativa)
                ).fetch();

                if (existentes.length > 0) {
                    await existentes[0].update(record => {
                        record.f_nombre = f_nombre;
                        record.f_cooperativa = f_cooperativa;
                    });
                } else {
                    await descCollection.create(record => {
                        record.f_idbanco = f_idbanco;
                        record.f_nombre = f_nombre;
                        record.f_cooperativa = f_cooperativa;
                    });
                }
            }
        });

        await syncHistory(nombreTabla);
        console.log('Sincronización de bancos completada');
    } catch (error) {
        console.error('Error sincronizando bancos:', error);
    } finally {
        syncInProgress = false;
    }
};

export default sincronizarBancos;

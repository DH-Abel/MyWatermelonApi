import { Q } from "@nozbe/watermelondb";
import { database } from "../database/database";
import { Sync } from "../database/models";

export const syncHistory = async (nombreTabla) => {

    await database.write(async () => {
        const syncCollection = database.collections.get('t_sync');
        const exist = await syncCollection.query(Q.where('f_tabla', nombreTabla)).fetch();

        if (exist.length > 0) {
            await exist[0].update(record=>{
                record.f_fecha = new Date().toISOString();
            });
        }else{
            await syncCollection.create(record =>{
                record.f_tabla = nombreTabla;
                record.f_fecha = Date.now().toString();
            })
        }
})

}
/*esse arquivo que conecta com o banco.
pg é a biblioteca que faz o postgres funcionar com o node
pool deixa comunicação com o DB ter varias requisiçoes simultaneas
dotenv lê o .env 
*/
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});
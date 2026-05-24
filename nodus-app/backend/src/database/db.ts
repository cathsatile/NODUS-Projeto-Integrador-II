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

// Garante que a coluna horario existe na tabela sessao
// (o schema original não a incluía)
pool.query(`
    ALTER TABLE sessao
    ADD COLUMN IF NOT EXISTS horario VARCHAR(10);
`).catch(err => console.error('[db] Erro ao aplicar migration de horario:', err));

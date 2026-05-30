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

pool.query(`
    ALTER TABLE sessao
    ADD COLUMN IF NOT EXISTS humor INTEGER;
`).catch(err => console.error('[db] Erro ao aplicar migration de humor:', err));

// Converte colunas de paciente para TEXT para suportar dados criptografados (AES+base64)
pool.query(`
    ALTER TABLE paciente
        ALTER COLUMN nome TYPE TEXT,
        ALTER COLUMN email TYPE TEXT,
        ALTER COLUMN data_nascimento TYPE TEXT USING data_nascimento::TEXT;
`).catch(err => console.error('[db] Erro ao aplicar migration de colunas paciente:', err));

// senha do paciente passa a ser opcional (fluxo de cadastro via psicólogo não requer senha)
pool.query(`
    ALTER TABLE paciente ALTER COLUMN senha DROP NOT NULL;
`).catch(err => console.error('[db] Erro ao aplicar migration de senha nullable:', err));

// coluna status para registrar o resultado de cada sessão
pool.query(`
    ALTER TABLE sessao ADD COLUMN IF NOT EXISTS status VARCHAR(50);
`).catch(err => console.error('[db] Erro ao aplicar migration de status:', err));

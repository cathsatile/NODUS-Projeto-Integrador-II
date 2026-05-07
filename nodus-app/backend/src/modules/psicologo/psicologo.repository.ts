/*
codigo gerado pelo claude e (se deus quiser) corrigido por miguel
esse arquivo comunica com o banco usando SQL. Claude fez de maneira bem assíncrona (todas as const com async/await) porque se fosse linear ia ser muito lento. 

claude também omitiu a senha do SELECT pela segurança.
*/

import { pool } from '../../database/db';
import { Psicologo } from './psicologo.model';

export const findAll = async (): Promise<Psicologo[]> => {
  const result = await pool.query(
    'SELECT id_psicologo, nome, email, registro_profissional FROM psicologo'
  );
  return result.rows;
};

export const findById = async (id: number): Promise<Psicologo | null> => {
  const result = await pool.query(
    'SELECT id_psicologo, nome, email, registro_profissional FROM psicologo WHERE id_psicologo = $1',
    [id]
  );
  return result.rows[0] ?? null;
};

export const create = async (data: Psicologo): Promise<Psicologo> => {
  const result = await pool.query(
    `INSERT INTO psicologo (nome, email, senha, registro_profissional)
     VALUES ($1, $2, $3, $4)
     RETURNING id_psicologo, nome, email, registro_profissional`,
    [data.nome, data.email, data.senha, data.registro_profissional]
  );
  return result.rows[0];
};

export const update = async (id: number, data: Partial<Psicologo>): Promise<Psicologo | null> => {
  const result = await pool.query(
    `UPDATE psicologo
     SET nome = COALESCE($1, nome),
         email = COALESCE($2, email),
         registro_profissional = COALESCE($3, registro_profissional)
     WHERE id_psicologo = $4
     RETURNING id_psicologo, nome, email, registro_profissional`,
    [data.nome, data.email, data.registro_profissional, id]
  );
  return result.rows[0] ?? null;
};

export const remove = async (id: number): Promise<boolean> => {
  const result = await pool.query(
    'DELETE FROM psicologo WHERE id_psicologo = $1',
    [id]
  );
  return (result.rowCount ?? 0) > 0;
};
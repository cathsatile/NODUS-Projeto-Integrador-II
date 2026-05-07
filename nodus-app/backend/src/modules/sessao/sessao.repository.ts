import { pool } from '../../database/db';
import { Sessao } from './sessao.model';

export const findAll = async (): Promise<Sessao[]> => {
  const result = await pool.query(
    `SELECT id_sessao, data, observacoes, id_paciente, id_psicologo
     FROM sessao`
  );
  return result.rows;
};

export const findById = async (id: number): Promise<Sessao | null> => {
  const result = await pool.query(
    `SELECT id_sessao, data, observacoes, id_paciente, id_psicologo
     FROM sessao WHERE id_sessao = $1`,
    [id]
  );
  return result.rows[0] ?? null;
};

export const findByPaciente = async (id_paciente: number): Promise<Sessao[]> => { //essa func retorna sessões em ordem decrescente de data.
  const result = await pool.query(
    `SELECT id_sessao, data, observacoes, id_paciente, id_psicologo
     FROM sessao WHERE id_paciente = $1
     ORDER BY data DESC`,
    [id_paciente]
  );
  return result.rows;
};

export const findByPsicologo = async (id_psicologo: number): Promise<Sessao[]> => {
  const result = await pool.query(
    `SELECT id_sessao, data, observacoes, id_paciente, id_psicologo
     FROM sessao WHERE id_psicologo = $1
     ORDER BY data DESC`,
    [id_psicologo]
  );
  return result.rows;
};

export const create = async (data: Sessao): Promise<Sessao> => {
  const result = await pool.query(
    `INSERT INTO sessao (data, observacoes, id_paciente, id_psicologo)
     VALUES ($1, $2, $3, $4)
     RETURNING id_sessao, data, observacoes, id_paciente, id_psicologo`,
    [data.data, data.observacoes, data.id_paciente, data.id_psicologo]
  );
  return result.rows[0];
};

export const update = async (id: number, data: Partial<Sessao>): Promise<Sessao | null> => {
  const result = await pool.query(
    `UPDATE sessao
     SET data = COALESCE($1, data),
         observacoes = COALESCE($2, observacoes)
     WHERE id_sessao = $3
     RETURNING id_sessao, data, observacoes, id_paciente, id_psicologo`,
    [data.data, data.observacoes, id]
  );
  return result.rows[0] ?? null;
};

export const remove = async (id: number): Promise<boolean> => {
  const result = await pool.query(
    'DELETE FROM sessao WHERE id_sessao = $1',
    [id]
  );
  return (result.rowCount ?? 0) > 0;
};

export const removeByPaciente = async (id_paciente: number): Promise<void> => { 
  await pool.query(
    'DELETE FROM sessao WHERE id_paciente = $1',
    [id_paciente]
  );
};

export const hasSessoes = async (id_paciente: number): Promise<boolean> => {
  const result = await pool.query(
    'SELECT 1 FROM sessao WHERE id_paciente = $1 LIMIT 1',
    [id_paciente]
  );
  return (result.rowCount ?? 0) > 0;
};
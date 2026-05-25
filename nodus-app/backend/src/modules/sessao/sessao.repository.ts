import { pool } from '../../database/db';
import { Sessao } from './sessao.model';

const COLUNAS = `id_sessao, data, horario, observacoes, humor, id_paciente, id_psicologo`;

export const findAll = async (): Promise<Sessao[]> => {
  const result = await pool.query(`SELECT ${COLUNAS} FROM sessao`);
  return result.rows;
};

export const findById = async (id: number): Promise<Sessao | null> => {
  const result = await pool.query(
    `SELECT ${COLUNAS} FROM sessao WHERE id_sessao = $1`,
    [id]
  );
  return result.rows[0] ?? null;
};

export const findByPaciente = async (id_paciente: number): Promise<Sessao[]> => {
  const result = await pool.query(
    `SELECT ${COLUNAS} FROM sessao WHERE id_paciente = $1 ORDER BY data DESC, horario DESC`,
    [id_paciente]
  );
  return result.rows;
};

export const findByPsicologo = async (id_psicologo: number): Promise<Sessao[]> => {
  const result = await pool.query(
    `SELECT ${COLUNAS} FROM sessao WHERE id_psicologo = $1 ORDER BY data DESC, horario DESC`,
    [id_psicologo]
  );
  return result.rows;
};

export const create = async (data: Sessao): Promise<Sessao> => {
  const result = await pool.query(
    `INSERT INTO sessao (data, horario, observacoes, humor, id_paciente, id_psicologo)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${COLUNAS}`,
    [data.data, data.horario, data.observacoes ?? null, data.humor ?? null, data.id_paciente, data.id_psicologo]
  );
  return result.rows[0];
};

export const update = async (id: number, data: Partial<Sessao>): Promise<Sessao | null> => {
  const result = await pool.query(
    `UPDATE sessao
     SET data        = COALESCE($1, data),
         horario     = COALESCE($2, horario),
         observacoes = COALESCE($3, observacoes),
         humor       = COALESCE($4, humor)
     WHERE id_sessao = $5
     RETURNING ${COLUNAS}`,
    [data.data, data.horario, data.observacoes, data.humor, id]
  );
  return result.rows[0] ?? null;
};

export const remove = async (id: number): Promise<boolean> => {
  const result = await pool.query('DELETE FROM sessao WHERE id_sessao = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};

export const removeByPaciente = async (id_paciente: number): Promise<void> => {
  await pool.query('DELETE FROM sessao WHERE id_paciente = $1', [id_paciente]);
};

export const hasSessoes = async (id_paciente: number): Promise<boolean> => {
  const result = await pool.query(
    'SELECT 1 FROM sessao WHERE id_paciente = $1 LIMIT 1',
    [id_paciente]
  );
  return (result.rowCount ?? 0) > 0;
};

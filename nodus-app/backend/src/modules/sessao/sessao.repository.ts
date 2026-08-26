import { db } from '../../database/db';
import { Sessao } from './sessao.model';

const COLUNAS = 'id_sessao, data, horario, observacoes, humor, status, id_paciente, id_psicologo';

export const findAll = async (): Promise<Sessao[]> => {
  return db.prepare(`SELECT ${COLUNAS} FROM sessao`).all() as Sessao[];
};

export const findById = async (id: number): Promise<Sessao | null> => {
  return (db.prepare(`SELECT ${COLUNAS} FROM sessao WHERE id_sessao = ?`).get(id) as Sessao) ?? null;
};

export const findByPaciente = async (id_paciente: number): Promise<Sessao[]> => {
  return db.prepare(
    `SELECT ${COLUNAS} FROM sessao WHERE id_paciente = ? ORDER BY data DESC, horario DESC`,
  ).all(id_paciente) as Sessao[];
};

export const findByPsicologo = async (id_psicologo: number): Promise<Sessao[]> => {
  return db.prepare(
    `SELECT ${COLUNAS} FROM sessao WHERE id_psicologo = ? ORDER BY data DESC, horario DESC`,
  ).all(id_psicologo) as Sessao[];
};

export const create = async (data: Sessao): Promise<Sessao> => {
  return db.prepare(
    `INSERT INTO sessao (data, horario, observacoes, humor, id_paciente, id_psicologo)
     VALUES (?, ?, ?, ?, ?, ?)
     RETURNING ${COLUNAS}`,
  ).get(
    data.data, data.horario, data.observacoes ?? null, data.humor ?? null,
    data.id_paciente, data.id_psicologo,
  ) as Sessao;
};

export const update = async (id: number, data: Partial<Sessao>): Promise<Sessao | null> => {
  return (db.prepare(
    `UPDATE sessao
     SET data        = COALESCE(?, data),
         horario     = COALESCE(?, horario),
         observacoes = COALESCE(?, observacoes),
         humor       = COALESCE(?, humor),
         status      = COALESCE(?, status)
     WHERE id_sessao = ?
     RETURNING ${COLUNAS}`,
  ).get(
    data.data ?? null, data.horario ?? null, data.observacoes ?? null,
    data.humor ?? null, data.status ?? null, id,
  ) as Sessao) ?? null;
};

export const remove = async (id: number): Promise<boolean> => {
  const info = db.prepare('DELETE FROM sessao WHERE id_sessao = ?').run(id);
  return info.changes > 0;
};

export const removeByPaciente = async (id_paciente: number): Promise<void> => {
  db.prepare('DELETE FROM sessao WHERE id_paciente = ?').run(id_paciente);
};

export const hasSessoes = async (id_paciente: number): Promise<boolean> => {
  return !!db.prepare('SELECT 1 FROM sessao WHERE id_paciente = ? LIMIT 1').get(id_paciente);
};

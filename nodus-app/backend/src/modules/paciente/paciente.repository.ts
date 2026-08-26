import { db } from '../../database/db';
import { Paciente } from './paciente.model';

const COLUNAS = 'id_paciente, nome, email, data_nascimento, id_psicologo';

export const findAll = async (): Promise<Paciente[]> => {
  return db.prepare(`SELECT ${COLUNAS} FROM paciente`).all() as Paciente[];
};

export const findById = async (id: number): Promise<Paciente | null> => {
  return (db.prepare(`SELECT ${COLUNAS} FROM paciente WHERE id_paciente = ?`).get(id) as Paciente) ?? null;
};

export const findByPsicologo = async (id_psicologo: number): Promise<Paciente[]> => {
  return db.prepare(`SELECT ${COLUNAS} FROM paciente WHERE id_psicologo = ?`).all(id_psicologo) as Paciente[];
};

export const create = async (data: Paciente): Promise<Paciente> => {
  return db.prepare(
    `INSERT INTO paciente (nome, email, data_nascimento, id_psicologo)
     VALUES (?, ?, ?, ?)
     RETURNING ${COLUNAS}`,
  ).get(data.nome, data.email, data.data_nascimento, data.id_psicologo) as Paciente;
};

export const update = async (id: number, data: Partial<Paciente>): Promise<Paciente | null> => {
  return (db.prepare(
    `UPDATE paciente
     SET nome            = COALESCE(?, nome),
         email           = COALESCE(?, email),
         data_nascimento = COALESCE(?, data_nascimento),
         id_psicologo    = COALESCE(?, id_psicologo)
     WHERE id_paciente = ?
     RETURNING ${COLUNAS}`,
  ).get(data.nome ?? null, data.email ?? null, data.data_nascimento ?? null, data.id_psicologo ?? null, id) as Paciente) ?? null;
};

export const remove = async (id: number): Promise<boolean> => {
  const info = db.prepare('DELETE FROM paciente WHERE id_paciente = ?').run(id);
  return info.changes > 0;
};

export const hasPacientes = async (id_psicologo: number): Promise<boolean> => {
  return !!db.prepare('SELECT 1 FROM paciente WHERE id_psicologo = ? LIMIT 1').get(id_psicologo);
};

export const removeByPaciente = async (id_paciente: number): Promise<void> => {
  db.prepare('DELETE FROM sessao WHERE id_paciente = ?').run(id_paciente);
};

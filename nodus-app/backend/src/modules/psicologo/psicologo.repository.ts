import { db } from '../../database/db';
import { Psicologo } from './psicologo.model';

const COLUNAS_PUBLICAS = 'id_psicologo, nome, email, registro_profissional';

export const findAll = async (): Promise<Psicologo[]> => {
  return db.prepare(`SELECT ${COLUNAS_PUBLICAS} FROM psicologo`).all() as Psicologo[];
};

export const findById = async (id: number): Promise<Psicologo | null> => {
  return (db.prepare(
    `SELECT ${COLUNAS_PUBLICAS} FROM psicologo WHERE id_psicologo = ?`,
  ).get(id) as Psicologo) ?? null;
};

export const create = async (data: Psicologo): Promise<Psicologo> => {
  return db.prepare(
    `INSERT INTO psicologo (nome, email, senha, registro_profissional)
     VALUES (?, ?, ?, ?)
     RETURNING ${COLUNAS_PUBLICAS}`,
  ).get(data.nome, data.email, data.senha, data.registro_profissional) as Psicologo;
};

export const update = async (id: number, data: Partial<Psicologo>): Promise<Psicologo | null> => {
  return (db.prepare(
    `UPDATE psicologo
     SET nome                  = COALESCE(?, nome),
         email                 = COALESCE(?, email),
         registro_profissional = COALESCE(?, registro_profissional)
     WHERE id_psicologo = ?
     RETURNING ${COLUNAS_PUBLICAS}`,
  ).get(data.nome ?? null, data.email ?? null, data.registro_profissional ?? null, id) as Psicologo) ?? null;
};

export const remove = async (id: number): Promise<boolean> => {
  const info = db.prepare('DELETE FROM psicologo WHERE id_psicologo = ?').run(id);
  return info.changes > 0;
};

// inclui senha para comparação no fluxo de autenticação — não usar em outras queries
export const findByEmail = async (email: string): Promise<Psicologo | null> => {
  return (db.prepare(
    'SELECT id_psicologo, nome, email, senha, registro_profissional FROM psicologo WHERE email = ?',
  ).get(email) as Psicologo) ?? null;
};

import { pool } from '../../database/db';
import { Paciente } from './paciente.model';

export const findAll = async (): Promise<Paciente[]> => {
  const result = await pool.query(
    `SELECT id_paciente, nome, email, data_nascimento, id_psicologo
     FROM paciente`
  );
  return result.rows;
};

export const findById = async (id: number): Promise<Paciente | null> => {
  const result = await pool.query(
    `SELECT id_paciente, nome, email, data_nascimento, id_psicologo
     FROM paciente WHERE id_paciente = $1`,
    [id]
  );
  return result.rows[0] ?? null;
};

export const findByPsicologo = async (id_psicologo: number): Promise<Paciente[]> => { //essa função permite buscar TODOS os pacientes de um psicólogo específico
  const result = await pool.query(                                                    //útil pra relatório/dashboard
    `SELECT id_paciente, nome, email, data_nascimento, id_psicologo
     FROM paciente WHERE id_psicologo = $1`,
    [id_psicologo]
  );
  return result.rows;
};

export const create = async (data: Paciente): Promise<Paciente> => {
  const result = await pool.query(
    `INSERT INTO paciente (nome, email, senha, data_nascimento, id_psicologo)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id_paciente, nome, email, data_nascimento, id_psicologo`,
    [data.nome, data.email, data.senha, data.data_nascimento, data.id_psicologo]
  );
  return result.rows[0];
};

export const update = async (id: number, data: Partial<Paciente>): Promise<Paciente | null> => {
  const result = await pool.query(
    `UPDATE paciente
     SET nome = COALESCE($1, nome),
         email = COALESCE($2, email),
         data_nascimento = COALESCE($3, data_nascimento),
         id_psicologo = COALESCE($4, id_psicologo)
     WHERE id_paciente = $5
     RETURNING id_paciente, nome, email, data_nascimento, id_psicologo`,
    [data.nome, data.email, data.data_nascimento, data.id_psicologo, id]
  );
  return result.rows[0] ?? null;
};

export const remove = async (id: number): Promise<boolean> => {
  const result = await pool.query(
    'DELETE FROM paciente WHERE id_paciente = $1',
    [id]
  );
  return (result.rowCount ?? 0) > 0;
};

export const hasPacientes = async (id_psicologo: number): Promise<boolean> => {
  const result = await pool.query(
    'SELECT 1 FROM paciente WHERE id_psicologo = $1 LIMIT 1',
    [id_psicologo]
  );
  return (result.rowCount ?? 0) > 0;
};
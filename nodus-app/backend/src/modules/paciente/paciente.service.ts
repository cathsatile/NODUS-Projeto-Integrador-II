import bcrypt from 'bcryptjs';
import * as repo from './paciente.repository';
import { Paciente } from './paciente.model';

export const getAll = () => repo.findAll();

export const getById = (id: number) => repo.findById(id);

export const getByPsicologo = (id_psicologo: number) =>
  repo.findByPsicologo(id_psicologo);

export const create = async (data: Paciente) => {
  if (!data.email) throw new Error('Email é obrigatório');
  const senhaHash = await bcrypt.hash(data.senha, 10);
  return repo.create({ ...data, senha: senhaHash });
};

export const update = (id: number, data: Partial<Paciente>) =>
  repo.update(id, data);

export const remove = (id: number) => repo.remove(id);
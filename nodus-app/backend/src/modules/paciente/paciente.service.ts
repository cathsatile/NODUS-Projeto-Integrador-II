import * as repo from './paciente.repository';
import { removeByPaciente } from '../sessao/sessao.repository';
import { Paciente } from './paciente.model';

export const getAll = () => repo.findAll();

export const getById = (id: number) => repo.findById(id);

export const getByPsicologo = (id_psicologo: number) =>
  repo.findByPsicologo(id_psicologo);

export const create = async (data: Paciente) => {
  if (!data.email) throw new Error('Email é obrigatório');
  return repo.create(data);
};

export const update = (id: number, data: Partial<Paciente>) =>
  repo.update(id, data);

export const remove = async (id: number) => {
  await removeByPaciente(id);
  return repo.remove(id);
};
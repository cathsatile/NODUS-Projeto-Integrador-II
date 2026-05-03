import * as repo from './sessao.repository';
import { Sessao } from './sessao.model';
import { findById as findPacienteById } from '../paciente/paciente.repository';

export const getAll = () => repo.findAll();

export const getById = (id: number) => repo.findById(id);

export const getByPaciente = (id_paciente: number) =>
  repo.findByPaciente(id_paciente);

export const getByPsicologo = (id_psicologo: number) =>
  repo.findByPsicologo(id_psicologo);

export const create = async (data: Sessao) => {
  // Verifica se o paciente existe e pertence ao psicólogo
  const paciente = await findPacienteById(data.id_paciente);
  if (!paciente) {
    throw new Error('PACIENTE_NAO_ENCONTRADO');
  }
  if (paciente.id_psicologo !== data.id_psicologo) {
    throw new Error('PSICOLOGO_NAO_AUTORIZADO');
  }
  return repo.create(data);
};

export const update = (id: number, data: Partial<Sessao>) =>
  repo.update(id, data);

export const remove = (id: number) => repo.remove(id);
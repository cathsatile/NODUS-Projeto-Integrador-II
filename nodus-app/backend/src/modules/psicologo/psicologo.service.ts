/*
esse arquivo define as regras de negocio do psicologo.
bcrypt é uma funçao de hash pra senhas. Como hash é one-way, só precisa verificar se a senha digitada gera o mesmo hash.
o "...data" serve pra copiar tudo mas sobrescrever só a senha com o hash
a segurança da senha é garantida aqui porque o banco nunca vai recveber a senha como texto.
*/

import bcrypt from 'bcryptjs';
import * as repo from './psicologo.repository';
import { hasPacientes } from '../paciente/paciente.repository';
import { Psicologo } from './psicologo.model';

export const getAll = () => repo.findAll();

export const getById = (id: number) => repo.findById(id);

export const create = async (data: Psicologo) => {
  const senhaHash = await bcrypt.hash(data.senha, 10);
  return repo.create({ ...data, senha: senhaHash });
};

export const update = (id: number, data: Partial<Psicologo>) =>
  repo.update(id, data);

export const remove = async (id: number) => {
  const temPacientes = await hasPacientes(id);
  if (temPacientes) {
    throw new Error('PSICOLOGO_TEM_PACIENTES');
  }
  return repo.remove(id);
};
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from './db-helpers';
import * as psicologoRepo from '../src/modules/psicologo/psicologo.repository';
import * as psicologoService from '../src/modules/psicologo/psicologo.service';
import * as pacienteRepo from '../src/modules/paciente/paciente.repository';

beforeEach(resetDb);

describe('psicologo.repository', () => {
  it('cria e busca por id sem expor a senha em findAll', async () => {
    await psicologoRepo.create({
      nome: 'Ana', email: 'ana@nodus.com', senha: 'hash', registro_profissional: 'CRP-1',
    });

    const todos = await psicologoRepo.findAll();
    expect(todos).toHaveLength(1);
    expect(todos[0]).not.toHaveProperty('senha');
  });

  it('findByEmail retorna a senha (usada só no fluxo de login)', async () => {
    await psicologoRepo.create({
      nome: 'Ana', email: 'ana@nodus.com', senha: 'hash', registro_profissional: 'CRP-1',
    });

    const encontrado = await psicologoRepo.findByEmail('ana@nodus.com');
    expect(encontrado?.senha).toBe('hash');
  });

  it('findByEmail retorna null quando não existe', async () => {
    expect(await psicologoRepo.findByEmail('ninguem@nodus.com')).toBeNull();
  });
});

describe('psicologo.service', () => {
  it('create() faz hash da senha antes de persistir', async () => {
    const criado = await psicologoService.create({
      nome: 'Bia', email: 'bia@nodus.com', senha: 'senha123', registro_profissional: 'CRP-2',
    });

    const comSenha = await psicologoRepo.findByEmail('bia@nodus.com');
    expect(comSenha?.senha).not.toBe('senha123');
    expect(criado.id_psicologo).toBeDefined();
  });

  it('remove() bloqueia exclusão de psicólogo com pacientes vinculados', async () => {
    const psi = await psicologoRepo.create({
      nome: 'Caio', email: 'caio@nodus.com', senha: 'hash', registro_profissional: 'CRP-3',
    });
    await pacienteRepo.create({
      nome: 'Paciente X', email: 'px@nodus.com', data_nascimento: '2000-01-01',
      id_psicologo: psi.id_psicologo!,
    });

    await expect(psicologoService.remove(psi.id_psicologo!)).rejects.toThrow('PSICOLOGO_TEM_PACIENTES');
  });

  it('remove() permite exclusão de psicólogo sem pacientes', async () => {
    const psi = await psicologoRepo.create({
      nome: 'Duda', email: 'duda@nodus.com', senha: 'hash', registro_profissional: 'CRP-4',
    });

    await expect(psicologoService.remove(psi.id_psicologo!)).resolves.toBe(true);
  });
});

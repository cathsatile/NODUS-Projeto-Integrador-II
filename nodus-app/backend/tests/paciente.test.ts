import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from './db-helpers';
import * as psicologoRepo from '../src/modules/psicologo/psicologo.repository';
import * as pacienteRepo from '../src/modules/paciente/paciente.repository';
import * as pacienteService from '../src/modules/paciente/paciente.service';
import * as sessaoRepo from '../src/modules/sessao/sessao.repository';

beforeEach(resetDb);

const criarPsicologo = async () =>
  psicologoRepo.create({ nome: 'Ana', email: 'ana@nodus.com', senha: 'hash', registro_profissional: 'CRP-1' });

describe('paciente.repository', () => {
  it('findByPsicologo retorna só os pacientes daquele psicólogo', async () => {
    const psi1 = await criarPsicologo();
    const psi2 = await psicologoRepo.create({ nome: 'Bia', email: 'bia@nodus.com', senha: 'hash', registro_profissional: 'CRP-2' });
    await pacienteRepo.create({ nome: 'P1', email: 'p1@nodus.com', data_nascimento: '2000-01-01', id_psicologo: psi1.id_psicologo! });
    await pacienteRepo.create({ nome: 'P2', email: 'p2@nodus.com', data_nascimento: '2000-01-01', id_psicologo: psi2.id_psicologo! });

    const doPsi1 = await pacienteRepo.findByPsicologo(psi1.id_psicologo!);
    expect(doPsi1).toHaveLength(1);
    expect(doPsi1[0].nome).toBe('P1');
  });

  it('update() com campos parciais preserva os demais (COALESCE)', async () => {
    const psi = await criarPsicologo();
    const paciente = await pacienteRepo.create({
      nome: 'Original', email: 'orig@nodus.com', data_nascimento: '1990-05-05', id_psicologo: psi.id_psicologo!,
    });

    const atualizado = await pacienteRepo.update(paciente.id_paciente!, { nome: 'Novo Nome' });
    expect(atualizado?.nome).toBe('Novo Nome');
    expect(atualizado?.email).toBe('orig@nodus.com');
  });
});

describe('paciente.service', () => {
  it('create() rejeita paciente sem email', async () => {
    const psi = await criarPsicologo();
    await expect(
      pacienteService.create({ nome: 'Sem Email', email: '', data_nascimento: '2000-01-01', id_psicologo: psi.id_psicologo! }),
    ).rejects.toThrow('Email é obrigatório');
  });

  it('remove() apaga as sessões do paciente antes de apagar o paciente (cascata manual)', async () => {
    const psi = await criarPsicologo();
    const paciente = await pacienteRepo.create({
      nome: 'Com Sessao', email: 'cs@nodus.com', data_nascimento: '2000-01-01', id_psicologo: psi.id_psicologo!,
    });
    await sessaoRepo.create({
      data: '2026-01-01', horario: '10:00', id_paciente: paciente.id_paciente!, id_psicologo: psi.id_psicologo!,
    });

    await pacienteService.remove(paciente.id_paciente!);

    expect(await sessaoRepo.hasSessoes(paciente.id_paciente!)).toBe(false);
    expect(await pacienteRepo.findById(paciente.id_paciente!)).toBeNull();
  });
});

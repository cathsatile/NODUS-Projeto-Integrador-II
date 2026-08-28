import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from './db-helpers';
import * as psicologoRepo from '../src/modules/psicologo/psicologo.repository';
import * as pacienteRepo from '../src/modules/paciente/paciente.repository';
import * as sessaoService from '../src/modules/sessao/sessao.service';

beforeEach(resetDb);

describe('sessao.service.create — regras de posse', () => {
  it('rejeita sessão para paciente inexistente', async () => {
    await expect(
      sessaoService.create({ data: '2026-01-01', horario: '10:00', id_paciente: 999, id_psicologo: 1 }),
    ).rejects.toThrow('PACIENTE_NAO_ENCONTRADO');
  });

  it('rejeita sessão quando o paciente pertence a outro psicólogo', async () => {
    const dono = await psicologoRepo.create({ nome: 'Dono', email: 'dono@nodus.com', senha: 'hash', registro_profissional: 'CRP-1' });
    const outro = await psicologoRepo.create({ nome: 'Outro', email: 'outro@nodus.com', senha: 'hash', registro_profissional: 'CRP-2' });
    const paciente = await pacienteRepo.create({
      nome: 'Paciente', email: 'pac@nodus.com', data_nascimento: '2000-01-01', id_psicologo: dono.id_psicologo!,
    });

    await expect(
      sessaoService.create({
        data: '2026-01-01', horario: '10:00', id_paciente: paciente.id_paciente!, id_psicologo: outro.id_psicologo!,
      }),
    ).rejects.toThrow('PSICOLOGO_NAO_AUTORIZADO');
  });

  it('cria a sessão quando o paciente pertence ao psicólogo informado', async () => {
    const psi = await psicologoRepo.create({ nome: 'Ana', email: 'ana@nodus.com', senha: 'hash', registro_profissional: 'CRP-1' });
    const paciente = await pacienteRepo.create({
      nome: 'Paciente', email: 'pac@nodus.com', data_nascimento: '2000-01-01', id_psicologo: psi.id_psicologo!,
    });

    const sessao = await sessaoService.create({
      data: '2026-01-01', horario: '10:00', id_paciente: paciente.id_paciente!, id_psicologo: psi.id_psicologo!,
    });

    expect(sessao.id_sessao).toBeDefined();
  });
});

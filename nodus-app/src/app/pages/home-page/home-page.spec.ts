import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { HomePage } from './home-page';
import { AuthService } from '../../core/auth/auth.service';
import { SessaoService } from '../../core/services/sessao.service';
import { PacienteService } from '../../core/services/paciente.service';
import { Sessao } from '../../core/services/sessao.model';
import { environment } from '../../../environments/environment';

const PSICOLOGO_MOCK = {
  id_psicologo: 1,
  nome: 'Dr. Teste',
  email: 'teste@email.com',
  registro_profissional: 'CRP-01/12345',
};

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            psicologoAtual: signal(PSICOLOGO_MOCK),
            isAuthenticated: signal(true),
            chaveCripto: signal(null),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('deve ser criado', () => {
    expect(component).toBeTruthy();
  });

  describe('sessaoJaAconteceu', () => {
    it('retorna true para data/horário no passado', () => {
      expect(component.sessaoJaAconteceu('2020-01-01T00:00:00Z', '08:00')).toBe(true);
    });

    it('retorna false para data no futuro', () => {
      expect(component.sessaoJaAconteceu('2099-12-31T00:00:00Z', '23:00')).toBe(false);
    });

    it('usa 23:59 como horário padrão quando horario é null', () => {
      // Data passada sem horário → verdadeiro (mesmo com fallback 23:59)
      expect(component.sessaoJaAconteceu('2020-01-01T00:00:00Z', null)).toBe(true);
    });

    it('usa 23:59 como horário padrão quando horario é undefined', () => {
      expect(component.sessaoJaAconteceu('2020-01-01T00:00:00Z', undefined)).toBe(true);
    });
  });

  describe('sessaoHoje (computed)', () => {
    it('retorna "Nenhuma sessão hoje" quando não há sessões', () => {
      TestBed.inject(SessaoService).sessoes.set([]);
      expect(component.sessaoHoje()).toBe('Nenhuma sessão hoje');
    });

    it('retorna "1 sessão hoje" quando há exatamente uma', () => {
      const hoje = new Date().toISOString();
      TestBed.inject(SessaoService).sessoes.set([
        { id_sessao: 1, data: hoje, horario: '10:00', id_paciente: 1, id_psicologo: 1 },
      ]);
      expect(component.sessaoHoje()).toBe('1 sessão hoje');
    });

    it('retorna "N sessões hoje" para múltiplas sessões', () => {
      const hoje = new Date().toISOString();
      const s = (id: number): Sessao => ({ id_sessao: id, data: hoje, horario: '10:00', id_paciente: 1, id_psicologo: 1 });
      TestBed.inject(SessaoService).sessoes.set([s(1), s(2), s(3)]);
      expect(component.sessaoHoje()).toBe('3 sessões hoje');
    });
  });

  describe('top3Emocoes (computed)', () => {
    it('retorna array vazio sem sessões com humor', () => {
      TestBed.inject(SessaoService).sessoes.set([]);
      expect(component.top3Emocoes()).toEqual([]);
    });

    it('retorna até 3 emoções ordenadas por frequência', () => {
      const agora = new Date().toISOString();
      const sessoes: Sessao[] = [
        { id_sessao: 1, data: agora, horario: '10:00', humor: 1, id_paciente: 1, id_psicologo: 1 },
        { id_sessao: 2, data: agora, horario: '11:00', humor: 1, id_paciente: 1, id_psicologo: 1 },
        { id_sessao: 3, data: agora, horario: '12:00', humor: 2, id_paciente: 1, id_psicologo: 1 },
        { id_sessao: 4, data: agora, horario: '13:00', humor: 3, id_paciente: 1, id_psicologo: 1 },
        { id_sessao: 5, data: agora, horario: '14:00', humor: 4, id_paciente: 1, id_psicologo: 1 },
      ];
      TestBed.inject(SessaoService).sessoes.set(sessoes);
      const top3 = component.top3Emocoes();
      expect(top3.length).toBeLessThanOrEqual(3);
      expect(top3[0].valor).toBe(1); // humor 1 aparece 2x, deve ser o primeiro
    });
  });

  describe('numSessoesMes (computed)', () => {
    it('conta apenas sessões do mês corrente', () => {
      const agora = new Date();
      const mesAtual = new Date(agora.getFullYear(), agora.getMonth(), 15).toISOString();
      const mesPassado = new Date(agora.getFullYear(), agora.getMonth() - 1, 15).toISOString();
      const sessoes: Sessao[] = [
        { id_sessao: 1, data: mesAtual, horario: '10:00', id_paciente: 1, id_psicologo: 1 },
        { id_sessao: 2, data: mesAtual, horario: '11:00', id_paciente: 1, id_psicologo: 1 },
        { id_sessao: 3, data: mesPassado, horario: '10:00', id_paciente: 1, id_psicologo: 1 },
      ];
      TestBed.inject(SessaoService).sessoes.set(sessoes);
      expect(component.numSessoesMes()).toBe(2);
    });
  });

  describe('psiNome (computed)', () => {
    it('retorna o nome do psicólogo autenticado', () => {
      expect(component.psiNome()).toBe(PSICOLOGO_MOCK.nome);
    });
  });

  describe('sessoesHoje (computed) com pacientes', () => {
    it('enriquece sessão de hoje com nomePaciente do signal', () => {
      const agora = new Date();
      // Construir ISO string local para garantir que seja "hoje" sem confusão de fuso
      const dataHoje = `${agora.getFullYear()}-${String(agora.getMonth()+1).padStart(2,'0')}-${String(agora.getDate()).padStart(2,'0')}T12:00:00`;
      TestBed.inject(SessaoService).sessoes.set([
        { id_sessao: 1, data: dataHoje, horario: '12:00', id_paciente: 5, id_psicologo: 1 },
      ]);
      TestBed.inject(PacienteService).pacientes.set([
        { id_paciente: 5, nome: 'Carla Lima', email: 'c@c.com', data_nascimento: '1990-01-01', id_psicologo: 1 },
      ]);
      const sessoes = component.sessoesHoje();
      expect(sessoes[0].nomePaciente).toBe('Carla Lima');
    });
  });

  describe('marcarStatus', () => {
    it('chama sessaoService.update com id e status fornecidos', () => {
      const sessaoService = TestBed.inject(SessaoService);
      const spy = vi.spyOn(sessaoService, 'update').mockReturnValue(of({
        id_sessao: 10, data: '2026-01-01', horario: '10:00', id_paciente: 1, id_psicologo: 1, status: 'realizada',
      }));
      component.marcarStatus(10, 'realizada');
      expect(spy).toHaveBeenCalledWith(10, { status: 'realizada' });
    });
  });
});

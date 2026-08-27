import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { Sections } from './sections';
import { AuthService } from '../../core/auth/auth.service';
import { SessaoService } from '../../core/services/sessao.service';
import { PacienteService } from '../../core/services/paciente.service';
import { Sessao } from '../../core/services/sessao.model';

const PSICOLOGO_MOCK = {
  id_psicologo: 1,
  nome: 'Dr. Teste',
  email: 'teste@email.com',
  registro_profissional: 'CRP-01/12345',
};

const PASSADO = new Date(Date.now() - 86_400_000).toISOString(); // ontem
const FUTURO = new Date(Date.now() + 86_400_000).toISOString();  // amanhã

function sessao(overrides: Partial<Sessao> = {}): Sessao {
  return {
    id_sessao: 1,
    data: PASSADO,
    horario: '10:00',
    id_paciente: 1,
    id_psicologo: 1,
    ...overrides,
  };
}

describe('Sections', () => {
  let component: Sections;
  let fixture: ComponentFixture<Sections>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sections],
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

    fixture = TestBed.createComponent(Sections);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('deve ser criado', () => {
    expect(component).toBeTruthy();
  });

  describe('iniciaisDe', () => {
    it('retorna iniciais de nome completo', () => {
      expect(component.iniciaisDe('Maria Silva')).toBe('MS');
    });

    it('retorna inicial única para nome simples', () => {
      expect(component.iniciaisDe('Pedro')).toBe('P');
    });
  });

  describe('statusDe', () => {
    it('usa statusLabel quando sessão tem status', () => {
      const s = sessao({ status: 'realizada' });
      expect(component.statusDe(s)).toBe('Sessão realizada');
    });

    it('retorna "Agendada" para sessão futura sem status', () => {
      const s = sessao({ data: FUTURO, status: undefined });
      expect(component.statusDe(s)).toBe('Agendada');
    });

    it('retorna "Realizada" para sessão passada sem status', () => {
      const s = sessao({ data: PASSADO, status: undefined });
      expect(component.statusDe(s)).toBe('Realizada');
    });
  });

  describe('classStatus', () => {
    it('inclui o status no nome da classe quando definido', () => {
      const s = sessao({ status: 'cancelada_paciente' });
      expect(component.classStatus(s)).toBe('status status-cancelada_paciente');
    });

    it('retorna classe de agendada para sessão futura sem status', () => {
      const s = sessao({ data: FUTURO, status: undefined });
      expect(component.classStatus(s)).toBe('status status-agendada');
    });

    it('retorna classe genérica para sessão passada sem status', () => {
      const s = sessao({ data: PASSADO, status: undefined });
      expect(component.classStatus(s)).toBe('status');
    });
  });

  describe('verMais', () => {
    it('incrementa limiteAll em PAGE_SIZE', () => {
      const antes = component.limiteAll();
      component.verMais('all');
      expect(component.limiteAll()).toBe(antes + 10);
    });

    it('incrementa limiteDone', () => {
      const antes = component.limiteDone();
      component.verMais('done');
      expect(component.limiteDone()).toBe(antes + 10);
    });

    it('incrementa limiteScheduled', () => {
      const antes = component.limiteScheduled();
      component.verMais('scheduled');
      expect(component.limiteScheduled()).toBe(antes + 10);
    });

    it('incrementa limiteNaoRealizadas', () => {
      const antes = component.limiteNaoRealizadas();
      component.verMais('nao');
      expect(component.limiteNaoRealizadas()).toBe(antes + 10);
    });
  });

  describe('nomePaciente', () => {
    it('retorna o nome do paciente pelo id', () => {
      TestBed.inject(PacienteService).pacientes.set([
        { id_paciente: 42, nome: 'Fulano', email: 'f@f.com', data_nascimento: '1990-01-01', id_psicologo: 1 },
      ]);
      expect(component.nomePaciente(42)).toBe('Fulano');
    });

    it('retorna "Paciente" quando id não encontrado', () => {
      TestBed.inject(PacienteService).pacientes.set([]);
      expect(component.nomePaciente(99)).toBe('Paciente');
    });
  });

  describe('sessoesFiltradas com busca', () => {
    beforeEach(() => {
      TestBed.inject(PacienteService).pacientes.set([
        { id_paciente: 1, nome: 'Ana Lima', email: 'a@a.com', data_nascimento: '1990-01-01', id_psicologo: 1 },
        { id_paciente: 2, nome: 'Bruno Souza', email: 'b@b.com', data_nascimento: '1990-01-01', id_psicologo: 1 },
      ]);
      TestBed.inject(SessaoService).sessoes.set([
        sessao({ id_sessao: 1, id_paciente: 1 }),
        sessao({ id_sessao: 2, id_paciente: 2 }),
      ]);
    });

    it('exibe todas quando busca está vazia', () => {
      component.busca.set('');
      expect(component.totalTodas()).toBe(2);
    });

    it('filtra por nome de paciente', () => {
      component.busca.set('ana');
      expect(component.totalTodas()).toBe(1);
    });
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { Agenda } from './agenda';
import { AuthService } from '../../core/auth/auth.service';
import { SessaoService } from '../../core/services/sessao.service';
import { PacienteService } from '../../core/services/paciente.service';
import { Sessao } from '../../core/services/sessao.model';

const PSICOLOGO = {
  id_psicologo: 1,
  nome: 'Dr. Teste',
  email: 'teste@email.com',
  registro_profissional: 'CRP-01/12345',
};

describe('Agenda', () => {
  let component: Agenda;
  let fixture: ComponentFixture<Agenda>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Agenda],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            psicologoAtual: signal(PSICOLOGO),
            isAuthenticated: signal(true),
            chaveCripto: signal(null),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Agenda);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('deve ser criado', () => {
    expect(component).toBeTruthy();
  });

  describe('onDateSelected', () => {
    it('atualiza o signal selected com a data fornecida', () => {
      const date = new Date(2026, 7, 15); // 15 ago 2026
      component.onDateSelected(date);
      expect(component.selected()).toBe(date);
    });

    it('aceita null para limpar a seleção', () => {
      component.onDateSelected(new Date());
      component.onDateSelected(null);
      expect(component.selected()).toBeNull();
    });
  });

  describe('dataSelecionada (computed)', () => {
    it('retorna string vazia quando nenhuma data está selecionada', () => {
      expect(component.dataSelecionada()).toBe('');
    });

    it('retorna a data formatada em pt-BR quando selecionada', () => {
      component.onDateSelected(new Date(2026, 7, 15)); // sábado, 15/08/2026
      const resultado = component.dataSelecionada();
      expect(resultado).toContain('15/08/2026');
      expect(resultado).toContain('sábado');
    });
  });

  describe('diasComSessao (computed)', () => {
    it('retorna set vazio quando não há sessões', () => {
      TestBed.inject(SessaoService).sessoes.set([]);
      expect(component.diasComSessao().size).toBe(0);
    });

    it('retorna keys das datas das sessões existentes', () => {
      const sessoes: Sessao[] = [
        { id_sessao: 1, data: '2026-08-10T10:00:00Z', horario: '10:00', id_paciente: 1, id_psicologo: 1 },
        { id_sessao: 2, data: '2026-08-10T14:00:00Z', horario: '14:00', id_paciente: 1, id_psicologo: 1 },
        { id_sessao: 3, data: '2026-08-15T10:00:00Z', horario: '10:00', id_paciente: 2, id_psicologo: 1 },
      ];
      TestBed.inject(SessaoService).sessoes.set(sessoes);
      // Duas datas distintas (10 e 15 de agosto)
      expect(component.diasComSessao().size).toBe(2);
    });
  });

  describe('sessoesDia (computed)', () => {
    it('retorna lista vazia quando nenhuma data está selecionada', () => {
      expect(component.sessoesDia()).toEqual([]);
    });

    it('retorna as sessões do dia selecionado com nomePaciente', () => {
      const paciente = { id_paciente: 1, nome: 'Ana Lima', email: 'a@a.com', data_nascimento: '1990-01-01', id_psicologo: 1 };
      TestBed.inject(PacienteService).pacientes.set([paciente]);

      const data = new Date(2026, 7, 15); // 15 ago 2026 (local)
      const dataISO = `2026-08-15T10:00:00`;
      TestBed.inject(SessaoService).sessoes.set([
        { id_sessao: 1, data: dataISO, horario: '10:00', id_paciente: 1, id_psicologo: 1 },
      ]);

      component.onDateSelected(data);
      const sessoes = component.sessoesDia();
      expect(sessoes.length).toBe(1);
      expect(sessoes[0].nomePaciente).toBe('Ana Lima');
    });
  });

  describe('dateClass', () => {
    it('retorna "dia-com-sessao" para data com sessão', () => {
      TestBed.inject(SessaoService).sessoes.set([
        { id_sessao: 1, data: '2026-08-15T10:00:00', horario: '10:00', id_paciente: 1, id_psicologo: 1 },
      ]);
      const date = new Date(2026, 7, 15);
      expect(component.dateClass(date, 'month')).toBe('dia-com-sessao');
    });

    it('retorna string vazia para data sem sessão', () => {
      TestBed.inject(SessaoService).sessoes.set([]);
      const date = new Date(2026, 7, 15);
      expect(component.dateClass(date, 'month')).toBe('');
    });

    it('retorna string vazia para view diferente de month', () => {
      const date = new Date(2026, 7, 15);
      expect(component.dateClass(date, 'year')).toBe('');
    });
  });
});

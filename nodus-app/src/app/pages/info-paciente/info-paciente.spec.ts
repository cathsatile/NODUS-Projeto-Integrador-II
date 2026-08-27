import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { InfoPaciente } from './info-paciente';
import { AuthService } from '../../core/auth/auth.service';
import { PacienteService } from '../../core/services/paciente.service';
import { SessaoService } from '../../core/services/sessao.service';
import { Sessao } from '../../core/services/sessao.model';

const PSICOLOGO_MOCK = {
  id_psicologo: 1,
  nome: 'Dr. Teste',
  email: 'teste@email.com',
  registro_profissional: 'CRP-01/12345',
};

describe('InfoPaciente', () => {
  let component: InfoPaciente;
  let fixture: ComponentFixture<InfoPaciente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoPaciente],
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

    fixture = TestBed.createComponent(InfoPaciente);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('deve ser criado', () => {
    expect(component).toBeTruthy();
  });

  describe('humorLabel', () => {
    it('retorna emoji e label para humor válido', () => {
      const label = component.humorLabel(1);
      expect(label).toContain('😊');
      expect(label).toContain('Alegre');
    });

    it('retorna "—" para humor undefined', () => {
      expect(component.humorLabel(undefined)).toBe('—');
    });

    it('retorna emoji e label para humor 11', () => {
      const label = component.humorLabel(11);
      expect(label).toContain('😢');
      expect(label).toContain('Triste');
    });
  });

  describe('statusLabel', () => {
    it('retorna label legível para "realizada"', () => {
      expect(component.statusLabel('realizada')).toBe('Sessão realizada');
    });

    it('retorna string vazia para undefined', () => {
      expect(component.statusLabel(undefined)).toBe('');
    });

    it('retorna o próprio valor para status desconhecido', () => {
      expect(component.statusLabel('outro')).toBe('outro');
    });
  });

  describe('paciente (computed)', () => {
    it('retorna null quando pacienteId não está definido', () => {
      component.pacienteId.set(null);
      expect(component.paciente()).toBeNull();
    });

    it('retorna o paciente correto quando id está definido e paciente existe no signal', () => {
      const paciente = {
        id_paciente: 5,
        nome: 'Maria',
        email: 'm@m.com',
        data_nascimento: '1990-01-01',
        id_psicologo: 1,
      };
      TestBed.inject(PacienteService).pacientes.set([paciente]);
      component.pacienteId.set(5);
      expect(component.paciente()).toEqual(paciente);
    });
  });

  describe('sessoesPaciente (computed)', () => {
    it('retorna lista vazia quando pacienteId é null', () => {
      component.pacienteId.set(null);
      expect(component.sessoesPaciente()).toEqual([]);
    });

    it('filtra e ordena sessões por data decrescente', () => {
      component.pacienteId.set(3);
      const sessoes: Sessao[] = [
        { id_sessao: 1, data: '2026-01-01T10:00:00Z', horario: '10:00', id_paciente: 3, id_psicologo: 1 },
        { id_sessao: 2, data: '2026-06-15T10:00:00Z', horario: '10:00', id_paciente: 3, id_psicologo: 1 },
        { id_sessao: 3, data: '2026-03-01T10:00:00Z', horario: '10:00', id_paciente: 99, id_psicologo: 1 }, // outro paciente
      ];
      TestBed.inject(SessaoService).sessoes.set(sessoes);
      const resultado = component.sessoesPaciente();
      expect(resultado.length).toBe(2);
      expect(resultado[0].id_sessao).toBe(2); // mais recente primeiro
      expect(resultado[1].id_sessao).toBe(1);
    });
  });

  describe('voltar', () => {
    it('navega para /principal/pacientes', () => {
      const spy = vi.spyOn(TestBed.inject(Router), 'navigate');
      component.voltar();
      expect(spy).toHaveBeenCalledWith(['/principal/pacientes']);
    });
  });

  describe('iniciais (computed)', () => {
    it('retorna string vazia quando paciente é null', () => {
      component.pacienteId.set(null);
      expect(component.iniciais()).toBe('');
    });

    it('retorna iniciais do nome do paciente', () => {
      TestBed.inject(PacienteService).pacientes.set([{
        id_paciente: 7, nome: 'Carlos Mendes', email: 'c@c.com', data_nascimento: '1990-01-01', id_psicologo: 1,
      }]);
      component.pacienteId.set(7);
      expect(component.iniciais()).toBe('CM');
    });
  });
});

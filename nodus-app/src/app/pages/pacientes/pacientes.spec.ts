import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { Pacientes } from './pacientes';
import { AuthService } from '../../core/auth/auth.service';
import { PacienteService } from '../../core/services/paciente.service';
import { Paciente } from '../../core/services/paciente.model';

const PSICOLOGO_MOCK = {
  id_psicologo: 1,
  nome: 'Dr. Teste',
  email: 'teste@email.com',
  registro_profissional: 'CRP-01/12345',
};

describe('Pacientes', () => {
  let component: Pacientes;
  let fixture: ComponentFixture<Pacientes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Pacientes],
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

    fixture = TestBed.createComponent(Pacientes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('deve ser criado', () => {
    expect(component).toBeTruthy();
  });

  describe('iniciaisDe', () => {
    it('retorna iniciais de nome completo', () => {
      expect(component.iniciaisDe('João Silva')).toBe('JS');
    });

    it('retorna apenas uma inicial para nome simples', () => {
      expect(component.iniciaisDe('Ana')).toBe('A');
    });

    it('retorna duas iniciais mesmo para nomes com três palavras', () => {
      expect(component.iniciaisDe('Maria das Graças')).toBe('MD');
    });

    it('ignora espaços extras', () => {
      expect(component.iniciaisDe('  Pedro  Lima  ')).toBe('PL');
    });
  });

  describe('pacientesFiltrados (computed)', () => {
    const p = (id: number, nome: string): Paciente => ({
      id_paciente: id,
      nome,
      email: 'e@e.com',
      data_nascimento: '1990-01-01',
      id_psicologo: 1,
    });

    beforeEach(() => {
      TestBed.inject(PacienteService).pacientes.set([
        p(1, 'Ana Lima'),
        p(2, 'Bruno Souza'),
        p(3, 'Carlos Silva'),
      ]);
    });

    it('retorna todos os pacientes quando busca está vazia', () => {
      component.busca.set('');
      expect(component.pacientesFiltrados().length).toBe(3);
    });

    it('filtra por nome (case-insensitive)', () => {
      component.busca.set('ana');
      const resultado = component.pacientesFiltrados();
      expect(resultado.length).toBe(1);
      expect(resultado[0].nome).toBe('Ana Lima');
    });

    it('retorna lista vazia quando nenhum paciente corresponde', () => {
      component.busca.set('xyz');
      expect(component.pacientesFiltrados().length).toBe(0);
    });

    it('encontra por sobrenome', () => {
      component.busca.set('silva');
      expect(component.pacientesFiltrados()[0].nome).toBe('Carlos Silva');
    });
  });

  describe('verPaciente', () => {
    it('id undefined: não chama navigate', () => {
      const spy = vi.spyOn(TestBed.inject(Router), 'navigate');
      component.verPaciente(undefined);
      expect(spy).not.toHaveBeenCalled();
    });

    it('id válido: navega para /principal/info-paciente/:id', () => {
      const spy = vi.spyOn(TestBed.inject(Router), 'navigate');
      component.verPaciente(7);
      expect(spy).toHaveBeenCalledWith(['/principal/info-paciente', 7]);
    });
  });

  describe('numPacientes (computed)', () => {
    it('retorna a contagem correta de pacientes', () => {
      TestBed.inject(PacienteService).pacientes.set([
        { id_paciente: 1, nome: 'A', email: 'a@a.com', data_nascimento: '1990-01-01', id_psicologo: 1 },
        { id_paciente: 2, nome: 'B', email: 'b@b.com', data_nascimento: '1990-01-01', id_psicologo: 1 },
      ]);
      expect(component.numPacientes()).toBe(2);
    });
  });
});

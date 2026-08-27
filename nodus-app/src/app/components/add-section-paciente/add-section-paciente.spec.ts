import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { AddSectionPaciente } from './add-section-paciente';
import { AuthService } from '../../core/auth/auth.service';
import { CryptoService } from '../../core/services/crypto';
import { environment } from '../../../environments/environment';

const PSICOLOGO = {
  id_psicologo: 1,
  nome: 'Dr. Teste',
  email: 'teste@email.com',
  registro_profissional: 'CRP-01/12345',
};

const API_PACIENTES = `${environment.apiUrl}/pacientes`;
const API_SESSOES = `${environment.apiUrl}/sessoes`;
const API_INIT = `${API_PACIENTES}/psicologo/${PSICOLOGO.id_psicologo}`;

describe('AddSectionPaciente', () => {
  let component: AddSectionPaciente;
  let fixture: ComponentFixture<AddSectionPaciente>;
  let httpMock: HttpTestingController;
  const closeMock = vi.fn();

  function flushNgOnInit(): void {
    // ngOnInit calls getByPsicologo when psicologoAtual != null and pacientes is empty
    const req = httpMock.match(API_INIT);
    req.forEach(r => r.flush([]));
  }

  beforeEach(async () => {
    closeMock.mockReset();
    await TestBed.configureTestingModule({
      imports: [AddSectionPaciente],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: { close: closeMock } },
        { provide: MAT_DIALOG_DATA, useValue: { add: 'sessao' } },
        {
          provide: AuthService,
          useValue: {
            psicologoAtual: signal(PSICOLOGO),
            chaveCripto: signal<string | null>(null),
          },
        },
        {
          provide: CryptoService,
          useValue: { encrypt: (t: string) => t, decrypt: (t: string) => t },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AddSectionPaciente);
    component = fixture.componentInstance;
    fixture.detectChanges(); // aciona ngOnInit
    flushNgOnInit();
  });

  afterEach(() => httpMock.verify());

  it('deve ser criado', () => {
    expect(component).toBeTruthy();
  });

  describe('sessaoNoPassado (getter)', () => {
    it('retorna false quando data e horário estão vazios', () => {
      expect(component.sessaoNoPassado).toBe(false);
    });

    it('retorna false quando apenas data está preenchida (sem horário)', () => {
      component.sessaoForm.get('data')?.setValue('2099-12-31');
      expect(component.sessaoNoPassado).toBe(false);
    });

    it('retorna true para data e horário no passado', () => {
      component.sessaoForm.get('data')?.setValue('2020-01-01');
      component.sessaoForm.get('horario')?.setValue('08:00');
      expect(component.sessaoNoPassado).toBe(true);
    });

    it('retorna false para data e horário no futuro', () => {
      component.sessaoForm.get('data')?.setValue('2099-12-31');
      component.sessaoForm.get('horario')?.setValue('23:59');
      expect(component.sessaoNoPassado).toBe(false);
    });
  });

  describe('salvarPaciente', () => {
    it('com formulário inválido: não seta loading e não faz chamada HTTP', () => {
      component.salvarPaciente();
      expect(component.loading()).toBe(false);
      httpMock.expectNone(API_PACIENTES);
    });

    it('com formulário válido: chama API e fecha dialog no sucesso', () => {
      component.pacienteForm.setValue({
        nome: 'João Silva',
        email: 'joao@email.com',
        telefone: '',
        data_nascimento: '1990-01-01',
      });

      component.salvarPaciente();

      expect(component.loading()).toBe(true);
      const req = httpMock.expectOne(API_PACIENTES);
      expect(req.request.method).toBe('POST');
      req.flush({ id_paciente: 1, nome: 'João Silva', email: 'joao@email.com', data_nascimento: '1990-01-01', id_psicologo: 1 });

      expect(closeMock).toHaveBeenCalledWith(true);
    });

    it('com erro HTTP: seta mensagem de erro e limpa loading', () => {
      component.pacienteForm.setValue({
        nome: 'João Silva',
        email: 'joao@email.com',
        telefone: '',
        data_nascimento: '1990-01-01',
      });

      component.salvarPaciente();
      httpMock.expectOne(API_PACIENTES).flush(null, { status: 500, statusText: 'Error' });

      expect(component.erro()).toBe('Erro ao cadastrar paciente. Tente novamente.');
      expect(component.loading()).toBe(false);
    });
  });

  describe('salvarSessao', () => {
    it('com formulário inválido: não seta loading e não faz chamada HTTP', () => {
      component.salvarSessao();
      expect(component.loading()).toBe(false);
      httpMock.expectNone(API_SESSOES);
    });

    it('com formulário válido (sessão passada): chama API com humor e fecha dialog', () => {
      component.sessaoForm.setValue({
        id_paciente: 3,
        data: '2020-01-01',
        horario: '08:00',
        observacoes: 'Nota',
        humor: 1,
      });

      component.salvarSessao();

      expect(component.loading()).toBe(true);
      const req = httpMock.expectOne(API_SESSOES);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.humor).toBe(1);
      req.flush({ id_sessao: 10, data: '2020-01-01', horario: '08:00', id_paciente: 3, id_psicologo: 1 });

      expect(closeMock).toHaveBeenCalledWith(true);
    });

    it('sessão no futuro: humor não é incluído no body', () => {
      component.sessaoForm.setValue({
        id_paciente: 3,
        data: '2099-12-31',
        horario: '23:00',
        observacoes: '',
        humor: 5,
      });

      component.salvarSessao();
      const req = httpMock.expectOne(API_SESSOES);
      expect(req.request.body.humor).toBeUndefined();
      req.flush({ id_sessao: 11, data: '2099-12-31', horario: '23:00', id_paciente: 3, id_psicologo: 1 });
    });

    it('com erro HTTP: seta mensagem de erro e limpa loading', () => {
      component.sessaoForm.setValue({
        id_paciente: 3,
        data: '2020-01-01',
        horario: '08:00',
        observacoes: '',
        humor: null,
      });

      component.salvarSessao();
      httpMock.expectOne(API_SESSOES).flush(null, { status: 500, statusText: 'Error' });

      expect(component.erro()).toBe('Erro ao agendar sessão. Tente novamente.');
      expect(component.loading()).toBe(false);
    });
  });
});

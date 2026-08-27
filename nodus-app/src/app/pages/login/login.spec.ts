import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { vi } from 'vitest';
import { Login } from './login';
import { AuthService } from '../../core/auth/auth.service';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  const loginMock = vi.fn();
  const registerMock = vi.fn();

  beforeEach(async () => {
    loginMock.mockReset();
    registerMock.mockReset();
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            login: loginMock,
            register: registerMock,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('deve ser criado', () => {
    expect(component).toBeTruthy();
  });

  describe('irParaLogin', () => {
    it('seta tipoBotao para login e limpa erro', () => {
      component.erro.set('algum erro');
      component.irParaLogin();
      expect(component.tipoBotao).toBe('login');
      expect(component.erro()).toBe('');
    });
  });

  describe('irParaCadastro', () => {
    it('seta tipoBotao para cadastro e limpa erro', () => {
      component.erro.set('algum erro');
      component.irParaCadastro();
      expect(component.tipoBotao).toBe('cadastro');
      expect(component.erro()).toBe('');
    });
  });

  describe('voltarBotoes', () => {
    it('seta tipoBotao para vazio e limpa erro', () => {
      component.tipoBotao = 'login';
      component.erro.set('algum erro');
      component.voltarBotoes();
      expect(component.tipoBotao).toBe('');
      expect(component.erro()).toBe('');
    });
  });

  describe('fazerLogin', () => {
    it('formulário inválido: marca campos como tocados e não chama authService', () => {
      expect(component.loginForm.invalid).toBe(true);
      component.fazerLogin();
      expect(component.loginForm.touched).toBe(true);
      expect(loginMock).not.toHaveBeenCalled();
    });

    it('formulário válido + sucesso: navega para home', () => {
      loginMock.mockReturnValue(of(undefined));
      const router = TestBed.inject(Router);
      const spy = vi.spyOn(router, 'navigate');

      component.loginForm.setValue({ email: 'a@a.com', senha: 'senha123' });
      component.fazerLogin();

      expect(loginMock).toHaveBeenCalledWith('a@a.com', 'senha123');
      expect(spy).toHaveBeenCalledWith(['/principal/home']);
    });

    it('formulário válido + erro 401: exibe mensagem de credenciais incorretas', () => {
      loginMock.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));

      component.loginForm.setValue({ email: 'a@a.com', senha: 'errada' });
      component.fazerLogin();

      expect(component.erro()).toBe('Email ou senha incorretos.');
      expect(component.loading()).toBe(false);
    });

    it('formulário válido + erro genérico: exibe mensagem genérica', () => {
      loginMock.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

      component.loginForm.setValue({ email: 'a@a.com', senha: 'senha123' });
      component.fazerLogin();

      expect(component.erro()).toBe('Erro ao fazer login. Tente novamente.');
      expect(component.loading()).toBe(false);
    });
  });

  describe('fazerCadastro', () => {
    it('formulário inválido: marca campos como tocados e não chama authService', () => {
      expect(component.cadastroForm.invalid).toBe(true);
      component.fazerCadastro();
      expect(component.cadastroForm.touched).toBe(true);
      expect(registerMock).not.toHaveBeenCalled();
    });

    it('validator de senhas: null quando iguais', () => {
      component.cadastroForm.get('senha')?.setValue('abc123');
      component.cadastroForm.get('confirmar_senha')?.setValue('abc123');
      expect(component.cadastroForm.hasError('senhaDiferente')).toBe(false);
    });

    it('validator de senhas: erro quando diferentes', () => {
      component.cadastroForm.get('senha')?.setValue('abc123');
      component.cadastroForm.get('confirmar_senha')?.setValue('outra');
      expect(component.cadastroForm.hasError('senhaDiferente')).toBe(true);
    });

    it('formulário válido + sucesso: navega para home', () => {
      registerMock.mockReturnValue(of(undefined));
      const router = TestBed.inject(Router);
      const spy = vi.spyOn(router, 'navigate');

      component.cadastroForm.setValue({
        nome: 'Dr. Silva',
        email: 'silva@crp.com',
        registro_profissional: 'CRP-01/9999',
        telefone: '',
        senha: 'senha123',
        confirmar_senha: 'senha123',
      });
      component.fazerCadastro();

      expect(registerMock).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith(['/principal/home']);
    });

    it('formulário válido + erro 409: exibe mensagem de email duplicado', () => {
      registerMock.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));

      component.cadastroForm.setValue({
        nome: 'Dr. Silva',
        email: 'silva@crp.com',
        registro_profissional: 'CRP-01/9999',
        telefone: '',
        senha: 'senha123',
        confirmar_senha: 'senha123',
      });
      component.fazerCadastro();

      expect(component.erro()).toBe('Este email já está cadastrado.');
      expect(component.loading()).toBe(false);
    });

    it('formulário válido + erro genérico: exibe mensagem genérica de cadastro', () => {
      registerMock.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

      component.cadastroForm.setValue({
        nome: 'Dr. Silva',
        email: 'silva@crp.com',
        registro_profissional: 'CRP-01/9999',
        telefone: '',
        senha: 'senha123',
        confirmar_senha: 'senha123',
      });
      component.fazerCadastro();

      expect(component.erro()).toBe('Erro ao criar conta. Tente novamente.');
      expect(component.loading()).toBe(false);
    });
  });
});

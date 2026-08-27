import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService, PsicologoPublico } from './auth.service';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'nodus_auth_token';
const API = `${environment.apiUrl}/auth`;

const PSICOLOGO: PsicologoPublico = {
  id_psicologo: 42,
  nome: 'Dra. Ana',
  email: 'ana@clinica.com',
  registro_profissional: 'CRP-08/99999',
};

function makeJwt(
  payload: { sub: number; nome: string; email: string; registro_profissional: string },
  offsetSec = 3600
): string {
  const now = Math.floor(Date.now() / 1000);
  const full = { ...payload, iat: now, exp: now + offsetSec };
  return `header.${btoa(JSON.stringify(full))}.sig`;
}

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return {
    service: TestBed.inject(AuthService),
    httpMock: TestBed.inject(HttpTestingController),
  };
}

describe('AuthService', () => {
  afterEach(() => {
    localStorage.removeItem(TOKEN_KEY);
  });

  describe('inicializarSessao (constructor)', () => {
    it('sem token: psicologoAtual null e isAuthenticated false', () => {
      const { service } = setup();
      expect(service.psicologoAtual()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
    });

    it('token válido: carrega psicologoAtual mas chaveCripto permanece null', () => {
      localStorage.setItem(TOKEN_KEY, makeJwt({
        sub: PSICOLOGO.id_psicologo,
        nome: PSICOLOGO.nome,
        email: PSICOLOGO.email,
        registro_profissional: PSICOLOGO.registro_profissional,
      }));
      const { service } = setup();
      expect(service.psicologoAtual()).toEqual(PSICOLOGO);
      expect(service.chaveCripto()).toBeNull();
      // isAuthenticated exige ambos: identidade E chave de criptografia
      expect(service.isAuthenticated()).toBe(false);
    });

    it('token expirado: remove do localStorage e psicologoAtual null', () => {
      localStorage.setItem(TOKEN_KEY, makeJwt({
        sub: 1, nome: 'X', email: 'x@x.com', registro_profissional: 'CRP',
      }, -3600));
      const { service } = setup();
      expect(service.psicologoAtual()).toBeNull();
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });

    it('token malformado (sem pontos): remove do localStorage e psicologoAtual null', () => {
      localStorage.setItem(TOKEN_KEY, 'invalido');
      const { service } = setup();
      expect(service.psicologoAtual()).toBeNull();
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });

    it('token malformado (partes demais): remove do localStorage', () => {
      localStorage.setItem(TOKEN_KEY, 'a.b.c.d');
      const { service } = setup();
      expect(service.psicologoAtual()).toBeNull();
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });
  });

  describe('getToken', () => {
    it('retorna null quando não há token no localStorage', () => {
      const { service } = setup();
      expect(service.getToken()).toBeNull();
    });

    it('retorna o token armazenado', () => {
      const token = makeJwt({ sub: 1, nome: 'X', email: 'x@x.com', registro_profissional: 'CRP' });
      localStorage.setItem(TOKEN_KEY, token);
      const { service } = setup();
      expect(service.getToken()).toBe(token);
    });
  });

  describe('logout', () => {
    it('limpa localStorage, psicologoAtual e chaveCripto', () => {
      localStorage.setItem(TOKEN_KEY, 'algum-token');
      const { service } = setup();
      service.logout();
      expect(service.psicologoAtual()).toBeNull();
      expect(service.chaveCripto()).toBeNull();
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('login', () => {
    it('sucesso: armazena token, seta psicologoAtual e deriva chaveCripto', async () => {
      const { service, httpMock } = setup();
      const token = makeJwt({
        sub: PSICOLOGO.id_psicologo,
        nome: PSICOLOGO.nome,
        email: PSICOLOGO.email,
        registro_profissional: PSICOLOGO.registro_profissional,
      });

      const done = new Promise<void>((res, rej) =>
        service.login('ana@clinica.com', 'senhaSegura').subscribe({ next: res, error: rej })
      );

      httpMock.expectOne(`${API}/login`).flush({ token, psicologo: PSICOLOGO });
      httpMock.verify();
      await done;

      expect(service.psicologoAtual()).toEqual(PSICOLOGO);
      expect(localStorage.getItem(TOKEN_KEY)).toBe(token);
      expect(service.chaveCripto()).toBeTruthy();
      expect(service.isAuthenticated()).toBe(true);
    }, 15_000); // PBKDF2 (100k iterações) pode levar alguns segundos
  });

  describe('register', () => {
    it('sucesso: armazena token, seta psicologoAtual e deriva chaveCripto', async () => {
      const { service, httpMock } = setup();
      const token = makeJwt({
        sub: PSICOLOGO.id_psicologo,
        nome: PSICOLOGO.nome,
        email: PSICOLOGO.email,
        registro_profissional: PSICOLOGO.registro_profissional,
      });

      const done = new Promise<void>((res, rej) =>
        service.register({
          nome: PSICOLOGO.nome,
          email: PSICOLOGO.email,
          senha: 'senhaSegura',
          registro_profissional: PSICOLOGO.registro_profissional,
        }).subscribe({ next: res, error: rej })
      );

      httpMock.expectOne(`${API}/register`).flush({ token, psicologo: PSICOLOGO });
      httpMock.verify();
      await done;

      expect(service.psicologoAtual()).toEqual(PSICOLOGO);
      expect(service.chaveCripto()).toBeTruthy();
      expect(service.isAuthenticated()).toBe(true);
    }, 15_000);
  });

  describe('isAuthenticated', () => {
    it('false quando apenas psicologoAtual está definido (sessão restaurada sem re-login)', () => {
      localStorage.setItem(TOKEN_KEY, makeJwt({
        sub: PSICOLOGO.id_psicologo,
        nome: PSICOLOGO.nome,
        email: PSICOLOGO.email,
        registro_profissional: PSICOLOGO.registro_profissional,
      }));
      const { service } = setup();
      // Token restaura psicologoAtual, mas não restaura chaveCripto (nunca persiste em storage)
      expect(service.psicologoAtual()).not.toBeNull();
      expect(service.chaveCripto()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
    });
  });
});

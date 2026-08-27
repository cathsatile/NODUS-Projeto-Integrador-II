import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { Header } from './header';
import { AuthService } from '../../core/auth/auth.service';
import { PsicologoPublico } from '../../core/auth/auth.service';

const PSICOLOGO: PsicologoPublico = {
  id_psicologo: 1,
  nome: 'João Silva',
  email: 'joao@email.com',
  registro_profissional: 'CRP-01/12345',
};

describe('Header', () => {
  let component: Header;
  let fixture: ComponentFixture<Header>;
  const logoutMock = vi.fn();
  const psicologoSignal = signal<PsicologoPublico | null>(PSICOLOGO);

  beforeEach(async () => {
    logoutMock.mockReset();
    psicologoSignal.set(PSICOLOGO);
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            psicologoAtual: psicologoSignal,
            logout: logoutMock,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('deve ser criado', () => {
    expect(component).toBeTruthy();
  });

  describe('iniciaisPsicologo (computed)', () => {
    it('retorna as duas primeiras iniciais do nome do psicólogo', () => {
      expect(component.iniciaisPsicologo()).toBe('JS');
    });

    it('retorna string vazia quando psicologoAtual é null', () => {
      psicologoSignal.set(null);
      expect(component.iniciaisPsicologo()).toBe('');
    });
  });

  describe('irParaPerfil', () => {
    it('navega para /principal/psicologo-profile', () => {
      const router = TestBed.inject(Router);
      const spy = vi.spyOn(router, 'navigate');
      component.irParaPerfil();
      expect(spy).toHaveBeenCalledWith(['/principal/psicologo-profile']);
    });
  });

  describe('logout', () => {
    it('chama authService.logout() e navega para /login', () => {
      const router = TestBed.inject(Router);
      const spy = vi.spyOn(router, 'navigate');
      component.logout();
      expect(logoutMock).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith(['/login']);
    });
  });
});

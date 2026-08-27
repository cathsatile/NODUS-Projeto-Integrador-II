import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { PsicologoProfile } from './psicologo-profile';
import { AuthService } from '../../core/auth/auth.service';

const PSICOLOGO = {
  id_psicologo: 1,
  nome: 'Maria Souza',
  email: 'maria@email.com',
  registro_profissional: 'CRP-08/12345',
};

describe('PsicologoProfile', () => {
  let component: PsicologoProfile;
  let fixture: ComponentFixture<PsicologoProfile>;
  const logoutMock = vi.fn();
  const psicologoSignal = signal<typeof PSICOLOGO | null>(PSICOLOGO);

  beforeEach(async () => {
    logoutMock.mockReset();
    psicologoSignal.set(PSICOLOGO);
    await TestBed.configureTestingModule({
      imports: [PsicologoProfile],
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

    fixture = TestBed.createComponent(PsicologoProfile);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('deve ser criado', () => {
    expect(component).toBeTruthy();
  });

  describe('iniciais (computed)', () => {
    it('retorna as iniciais do psicólogo autenticado', () => {
      expect(component.iniciais()).toBe('MS');
    });

    it('retorna string vazia quando psicologo é null', () => {
      psicologoSignal.set(null);
      expect(component.iniciais()).toBe('');
    });
  });

  describe('psicologo (signal)', () => {
    it('expõe os dados do psicólogo autenticado', () => {
      expect(component.psicologo()).toEqual(PSICOLOGO);
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

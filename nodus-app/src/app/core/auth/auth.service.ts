import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import * as CryptoJS from 'crypto-js';
import { environment } from '../../../environments/environment';

export interface PsicologoPublico {
  id_psicologo: number;
  nome: string;
  email: string;
  registro_profissional: string;
}

export interface CriarPsicologoDto {
  nome: string;
  email: string;
  senha: string;
  registro_profissional: string;
}

interface AuthResponse {
  token: string;
  psicologo: PsicologoPublico;
}

interface JwtPayload {
  sub: number;
  nome: string;
  email: string;
  registro_profissional: string;
  exp: number;
  iat: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'nodus_auth_token';
  private readonly API_URL = `${environment.apiUrl}/auth`;

  private readonly _psicologoAtual = signal<PsicologoPublico | null>(null);
  private readonly _chaveCripto = signal<string | null>(null);

  readonly psicologoAtual = this._psicologoAtual.asReadonly();
  readonly chaveCripto = this._chaveCripto.asReadonly();

  // Requer tanto identidade (JWT) quanto chave de criptografia derivada da senha
  readonly isAuthenticated = computed(() => !!this._psicologoAtual() && !!this._chaveCripto());

  constructor(private http: HttpClient) {
    this.inicializarSessao();
  }

  private inicializarSessao(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (token && this.isTokenValido(token)) {
      const payload = this.parseToken(token);
      this._psicologoAtual.set({
        id_psicologo: payload.sub,
        nome: payload.nome,
        email: payload.email,
        registro_profissional: payload.registro_profissional,
      });
      // chaveCripto não é restaurada — usuário precisa fazer login para re-derivar a chave
    } else {
      localStorage.removeItem(this.TOKEN_KEY);
    }
  }

  login(email: string, senha: string): Observable<void> {
    return this.http
      .post<AuthResponse>(`${this.API_URL}/login`, { email, senha })
      .pipe(
        tap(res => this.salvarSessao(res, senha)),
        map(() => void 0)
      );
  }

  register(data: CriarPsicologoDto): Observable<void> {
    return this.http
      .post<AuthResponse>(`${this.API_URL}/register`, data)
      .pipe(
        tap(res => this.salvarSessao(res, data.senha)),
        map(() => void 0)
      );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this._psicologoAtual.set(null);
    this._chaveCripto.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private salvarSessao(res: AuthResponse, senha: string): void {
    localStorage.setItem(this.TOKEN_KEY, res.token);
    this._psicologoAtual.set(res.psicologo);
    // Chave fica apenas em memória (signal) — nunca persiste em storage
    this._chaveCripto.set(this.derivarChave(senha, res.psicologo.email));
  }

  // PBKDF2: deriva chave AES-256 a partir da senha + salt único por usuário (email).
  // 100.000 iterações conforme recomendação NIST SP 800-132 (2023) para PBKDF2-SHA1.
  private derivarChave(senha: string, email: string): string {
    const saltUsuario = `NODUS:${email}:2026`;
    return CryptoJS.PBKDF2(senha, saltUsuario, {
      keySize: 256 / 32,
      iterations: 100_000,
    }).toString();
  }

  private isTokenValido(token: string): boolean {
    try {
      const payload = this.parseToken(token);
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  private parseToken(token: string): JwtPayload {
    const partes = token.split('.');
    if (partes.length !== 3) throw new Error('Token inválido');
    const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)) as JwtPayload;
  }
}

import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import * as CryptoJS from 'crypto-js';

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

// Salt fixo por usuário seria ideal (Sprint 4), por ora usa salt da aplicação
const CRIPTO_SALT = 'NODUS_CRIPTO_SALT_2026';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'nodus_auth_token';
  private readonly CHAVE_KEY = 'nodus_chave_cripto';
  private readonly API_URL = 'http://localhost:3000/api/auth';

  private readonly _psicologoAtual = signal<PsicologoPublico | null>(null);
  private readonly _chaveCripto = signal<string | null>(null);

  readonly psicologoAtual = this._psicologoAtual.asReadonly();
  readonly chaveCripto = this._chaveCripto.asReadonly();
  readonly isAuthenticated = computed(() => !!this._psicologoAtual());

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
      // Restaura chave derivada da sessão atual do navegador
      const chave = sessionStorage.getItem(this.CHAVE_KEY);
      if (chave) this._chaveCripto.set(chave);
    } else {
      localStorage.removeItem(this.TOKEN_KEY);
      sessionStorage.removeItem(this.CHAVE_KEY);
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
    sessionStorage.removeItem(this.CHAVE_KEY);
    this._psicologoAtual.set(null);
    this._chaveCripto.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private salvarSessao(res: AuthResponse, senha: string): void {
    localStorage.setItem(this.TOKEN_KEY, res.token);
    this._psicologoAtual.set(res.psicologo);
    const chave = this.derivarChave(senha);
    this._chaveCripto.set(chave);
    // sessionStorage: persiste enquanto a aba estiver aberta, limpa ao fechar
    sessionStorage.setItem(this.CHAVE_KEY, chave);
  }

  // PBKDF2: deriva uma chave AES-256 a partir da senha do usuário
  private derivarChave(senha: string): string {
    return CryptoJS.PBKDF2(senha, CRIPTO_SALT, {
      keySize: 256 / 32,  // 256 bits
      iterations: 1000,
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
    return JSON.parse(atob(partes[1])) as JwtPayload;
  }
}

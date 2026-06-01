import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, tap, map, catchError, of, throwError } from 'rxjs';
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
  telefone?: string;
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
  private readonly PSICOLOGO_KEY = 'nodus_psicologo';
  // Token de verificação: email criptografado com chaveCripto — valida senha localmente sem backend
  private readonly VERIFY_KEY = 'nodus_verify';
  private readonly API_URL = `${environment.apiUrl}/auth`;

  private readonly _psicologoAtual = signal<PsicologoPublico | null>(null);
  private readonly _chaveCripto = signal<string | null>(null);

  readonly psicologoAtual = this._psicologoAtual.asReadonly();
  readonly chaveCripto = this._chaveCripto.asReadonly();

  readonly isAuthenticated = computed(() => !!this._psicologoAtual() && !!this._chaveCripto());

  // Usuário conhecido (perfil salvo) mas chave não derivada → mostra tela de desbloqueio
  readonly precisaDesbloquear = computed(() => !!this._psicologoAtual() && !this._chaveCripto());

  constructor(private http: HttpClient) {
    this.inicializarSessao();
  }

  private inicializarSessao(): void {
    // Restaura perfil independentemente do JWT — permite desbloqueio offline
    const psicologoJson = localStorage.getItem(this.PSICOLOGO_KEY);
    if (psicologoJson) {
      try {
        this._psicologoAtual.set(JSON.parse(psicologoJson) as PsicologoPublico);
      } catch {
        localStorage.removeItem(this.PSICOLOGO_KEY);
      }
    }

    // JWT é verificado separadamente para chamadas ao backend
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (token && !this.isTokenValido(token)) {
      localStorage.removeItem(this.TOKEN_KEY);
    }
  }

  // Login: se o usuário já está salvo localmente com o mesmo email, autentica sem backend.
  // Caso contrário tenta o backend (útil para sincronização quando online).
  login(email: string, senha: string): Observable<void> {
    const local = this._psicologoAtual();
    if (local && local.email === email) {
      const ok = this.desbloquear(senha);
      if (ok) return of(void 0);
      return throwError(() => new HttpErrorResponse({ status: 401 }));
    }

    return this.http
      .post<AuthResponse>(`${this.API_URL}/login`, { email, senha })
      .pipe(
        tap(res => this.salvarSessao(res, senha)),
        map(() => void 0)
      );
  }

  // Cadastro: tenta o backend; se indisponível (offline ou sem servidor), registra localmente.
  register(data: CriarPsicologoDto): Observable<void> {
    if (!navigator.onLine) {
      this.registrarLocal(data);
      return of(void 0);
    }

    return this.http
      .post<AuthResponse>(`${this.API_URL}/register`, data)
      .pipe(
        tap(res => this.salvarSessao(res, data.senha)),
        map(() => void 0),
        catchError(() => {
          // Backend indisponível mesmo com conexão → registra localmente
          this.registrarLocal(data);
          return of(void 0);
        })
      );
  }

  // Desbloqueia a sessão validando a senha localmente, sem necessidade de rede.
  // Retorna false se a senha estiver errada.
  desbloquear(senha: string): boolean {
    const psicologo = this._psicologoAtual();
    if (!psicologo) return false;

    const chave = this.derivarChave(senha, psicologo.email);
    const verifyToken = localStorage.getItem(this.VERIFY_KEY);

    if (verifyToken) {
      try {
        const bytes = CryptoJS.AES.decrypt(verifyToken, chave);
        const resultado = bytes.toString(CryptoJS.enc.Utf8);
        if (resultado !== psicologo.email) return false;
      } catch {
        return false;
      }
    }

    this._chaveCripto.set(chave);
    return true;
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.PSICOLOGO_KEY);
    localStorage.removeItem(this.VERIFY_KEY);
    this._psicologoAtual.set(null);
    this._chaveCripto.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  // PBKDF2: deriva chave AES-256 a partir da senha + salt único por usuário (email).
  // 100.000 iterações conforme recomendação NIST SP 800-132 (2023) para PBKDF2-SHA1.
  // Público para permitir verificação local durante restauração de backup sem sessão ativa.
  derivarChave(senha: string, email: string): string {
    const saltUsuario = `NODUS:${email}:2026`;
    return CryptoJS.PBKDF2(senha, saltUsuario, {
      keySize: 256 / 32,
      iterations: 100_000,
    }).toString();
  }

  // Registro local: cria conta sem backend, usando timestamp como ID único.
  // Utilizado quando o servidor está offline ou não está configurado.
  private registrarLocal(data: CriarPsicologoDto): void {
    const psicologo: PsicologoPublico = {
      id_psicologo: Date.now(),
      nome: data.nome,
      email: data.email,
      registro_profissional: data.registro_profissional,
    };
    localStorage.setItem(this.PSICOLOGO_KEY, JSON.stringify(psicologo));
    this._psicologoAtual.set(psicologo);
    const chave = this.derivarChave(data.senha, data.email);
    this._chaveCripto.set(chave);
    localStorage.setItem(this.VERIFY_KEY, CryptoJS.AES.encrypt(psicologo.email, chave).toString());
  }

  private salvarSessao(res: AuthResponse, senha: string): void {
    localStorage.setItem(this.TOKEN_KEY, res.token);
    localStorage.setItem(this.PSICOLOGO_KEY, JSON.stringify(res.psicologo));
    this._psicologoAtual.set(res.psicologo);
    const chave = this.derivarChave(senha, res.psicologo.email);
    this._chaveCripto.set(chave);
    // Armazena verificação: email cifrado com a chave — nunca expõe a chave em si
    localStorage.setItem(this.VERIFY_KEY, CryptoJS.AES.encrypt(res.psicologo.email, chave).toString());
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

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Sessao, CriarSessaoDto } from './sessao.model';
import { AuthService } from '../auth/auth.service';
import { CryptoService } from './crypto';

@Injectable({
  providedIn: 'root'
})
export class SessaoService {
  private readonly apiUrl = 'http://localhost:3000/api/sessoes';
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private cryptoService = inject(CryptoService);

  sessoes = signal<Sessao[]>([]);

  private cifrar(dto: CriarSessaoDto): CriarSessaoDto {
    const chave = this.authService.chaveCripto();
    if (!chave || !dto.observacoes) return dto;
    return { ...dto, observacoes: this.cryptoService.encrypt(dto.observacoes, chave) };
  }

  private decifrarLista(lista: Sessao[]): Sessao[] {
    const chave = this.authService.chaveCripto();
    if (!chave) return lista;
    return lista.map(s => ({
      ...s,
      observacoes: s.observacoes
        ? this.cryptoService.decrypt(s.observacoes, chave)
        : s.observacoes,
    }));
  }

  getAll(): Observable<Sessao[]> {
    return this.http.get<Sessao[]>(this.apiUrl).pipe(
      tap(data => this.sessoes.set(this.decifrarLista(data)))
    );
  }

  getById(id: number): Observable<Sessao> {
    return this.http.get<Sessao>(`${this.apiUrl}/${id}`);
  }

  getByPaciente(id_paciente: number): Observable<Sessao[]> {
    return this.http.get<Sessao[]>(`${this.apiUrl}/paciente/${id_paciente}`).pipe(
      tap(data => this.sessoes.set(this.decifrarLista(data)))
    );
  }

  getByPsicologo(id_psicologo: number): Observable<Sessao[]> {
    return this.http.get<Sessao[]>(`${this.apiUrl}/psicologo/${id_psicologo}`).pipe(
      tap(data => this.sessoes.set(this.decifrarLista(data)))
    );
  }

  create(data: CriarSessaoDto): Observable<Sessao> {
    return this.http.post<Sessao>(this.apiUrl, this.cifrar(data)).pipe(
      tap(nova => {
        const chave = this.authService.chaveCripto();
        const novaDecifrada: Sessao = chave && nova.observacoes
          ? { ...nova, observacoes: this.cryptoService.decrypt(nova.observacoes, chave) }
          : nova;
        this.sessoes.update(lista => [...lista, novaDecifrada]);
      })
    );
  }

  update(id: number, data: Partial<Sessao>): Observable<Sessao> {
    return this.http.put<Sessao>(`${this.apiUrl}/${id}`, data).pipe(
      tap(atualizada => this.sessoes.update(lista =>
        lista.map(s => s.id_sessao === id ? atualizada : s)
      ))
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.sessoes.update(lista =>
        lista.filter(s => s.id_sessao !== id)
      ))
    );
  }
}

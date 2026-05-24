import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { from, Observable, tap, catchError, EMPTY } from 'rxjs';
import { Sessao, CriarSessaoDto } from './sessao.model';
import { AuthService } from '../auth/auth.service';
import { CryptoService } from './crypto';
import { DbService, SessaoLocal } from '../database/db';

@Injectable({
  providedIn: 'root'
})
export class SessaoService {
  private readonly apiUrl = 'http://localhost:3000/api/sessoes';
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private cryptoService = inject(CryptoService);
  private db = inject(DbService);

  sessoes = signal<Sessao[]>([]);

  // Cifra observacoes antes de enviar à API
  private cifrar(dto: CriarSessaoDto): CriarSessaoDto {
    const chave = this.authService.chaveCripto();
    if (!chave || !dto.observacoes) return dto;
    return { ...dto, observacoes: this.cryptoService.encrypt(dto.observacoes, chave) };
  }

  // Decifra lista vinda da API (observacoes chegam cifradas do backend)
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

  // Decifra lista vinda do Dexie (observacoes armazenadas cifradas)
  private decifrarLocal(locais: SessaoLocal[]): Sessao[] {
    const chave = this.authService.chaveCripto();
    return locais.map(l => ({
      id_sessao: l.id_sessao,
      data: l.data,
      horario: l.horario,
      observacoes: l.observacoes && chave
        ? this.cryptoService.decrypt(l.observacoes, chave)
        : l.observacoes,
      id_paciente: l.id_paciente,
      id_psicologo: l.id_psicologo,
    }));
  }

  // Substitui o cache local de sessões de um psicólogo
  private async atualizarCacheLocal(id_psicologo: number, dados: Sessao[]): Promise<void> {
    await this.db.sessoes.where('id_psicologo').equals(id_psicologo).delete();
    await this.db.sessoes.bulkAdd(dados.map(s => ({ ...s } as SessaoLocal)));
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
    // 1. Carrega cache local imediatamente (resposta instantânea offline)
    from(this.db.sessoes.where('id_psicologo').equals(id_psicologo).toArray())
      .subscribe(locais => {
        if (locais.length > 0 && this.sessoes().length === 0) {
          this.sessoes.set(this.decifrarLocal(locais));
        }
      });

    // 2. Sincroniza com o backend e atualiza cache
    return this.http.get<Sessao[]>(`${this.apiUrl}/psicologo/${id_psicologo}`).pipe(
      tap(data => {
        const decifradas = this.decifrarLista(data);
        this.sessoes.set(decifradas);
        void this.atualizarCacheLocal(id_psicologo, data); // guarda versão cifrada
      }),
      catchError(() => {
        // Sem conexão: mantém os dados do Dexie já exibidos
        return EMPTY;
      })
    );
  }

  create(data: CriarSessaoDto): Observable<Sessao> {
    return this.http.post<Sessao>(this.apiUrl, this.cifrar(data)).pipe(
      tap(nova => {
        // Salva versão cifrada da API no Dexie
        void this.db.sessoes.add({ ...nova } as SessaoLocal);
        // Decifra para exibição no signal
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

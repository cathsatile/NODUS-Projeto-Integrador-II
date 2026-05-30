import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, EMPTY } from 'rxjs';
import { Sessao, CriarSessaoDto } from './sessao.model';
import { AuthService } from '../auth/auth.service';
import { CryptoService } from './crypto';
import { DbService, SessaoLocal } from '../database/db';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SessaoService {
  private readonly apiUrl = `${environment.apiUrl}/sessoes`;
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private cryptoService = inject(CryptoService);
  private db = inject(DbService);

  sessoes = signal<Sessao[]>([]);

  private cifrar(dto: CriarSessaoDto): CriarSessaoDto {
    const chave = this.authService.chaveCripto();
    if (!chave || !dto.observacoes) return dto;
    return { ...dto, observacoes: this.cryptoService.encrypt(dto.observacoes, chave) };
  }

  private decifrarObservacoes(texto: string | undefined, chave: string): string | undefined {
    if (!texto) return texto;
    try {
      return this.cryptoService.decrypt(texto, chave);
    } catch {
      return '[não foi possível decifrar]';
    }
  }

  private decifrarLista(lista: Sessao[]): Sessao[] {
    const chave = this.authService.chaveCripto();
    if (!chave) return lista;
    return lista.map(s => ({
      ...s,
      observacoes: this.decifrarObservacoes(s.observacoes, chave),
    }));
  }

  private decifrarLocal(locais: SessaoLocal[]): Sessao[] {
    const chave = this.authService.chaveCripto();
    return locais.map(l => ({
      id_sessao: l.id_sessao,
      data: l.data,
      horario: l.horario,
      observacoes: chave ? this.decifrarObservacoes(l.observacoes, chave) : l.observacoes,
      humor: l.humor,
      id_paciente: l.id_paciente,
      id_psicologo: l.id_psicologo,
    }));
  }

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
    // Carrega cache local via Promise diretamente — sem criar subscription persistente
    void this.db.sessoes.where('id_psicologo').equals(id_psicologo).toArray().then(locais => {
      if (locais.length > 0 && this.sessoes().length === 0) {
        this.sessoes.set(this.decifrarLocal(locais));
      }
    });

    return this.http.get<Sessao[]>(`${this.apiUrl}/psicologo/${id_psicologo}`).pipe(
      tap(data => {
        this.sessoes.set(this.decifrarLista(data));
        void this.atualizarCacheLocal(id_psicologo, data);
      }),
      catchError(() => EMPTY)
    );
  }

  create(data: CriarSessaoDto): Observable<Sessao> {
    return this.http.post<Sessao>(this.apiUrl, this.cifrar(data)).pipe(
      tap(nova => {
        void this.db.sessoes.add({ ...nova } as SessaoLocal);
        const chave = this.authService.chaveCripto();
        const novaDecifrada: Sessao = {
          ...nova,
          observacoes: chave ? this.decifrarObservacoes(nova.observacoes, chave) : nova.observacoes,
        };
        this.sessoes.update(lista => [...lista, novaDecifrada]);
      })
    );
  }

  update(id: number, data: Partial<Sessao>): Observable<Sessao> {
    const chave = this.authService.chaveCripto();
    const cifrado: Partial<Sessao> = { ...data };
    if (chave && cifrado.observacoes) {
      cifrado.observacoes = this.cryptoService.encrypt(cifrado.observacoes, chave);
    }

    return this.http.put<Sessao>(`${this.apiUrl}/${id}`, cifrado).pipe(
      tap(atualizada => {
        const decifrada: Sessao = {
          ...atualizada,
          observacoes: chave ? this.decifrarObservacoes(atualizada.observacoes, chave) : atualizada.observacoes,
        };
        void this.db.sessoes.where('id_sessao').equals(id).modify({
          status: atualizada.status,
          humor: atualizada.humor,
          observacoes: atualizada.observacoes,
        });
        this.sessoes.update(lista =>
          lista.map(s => s.id_sessao === id ? decifrada : s)
        );
      })
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

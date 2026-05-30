import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, EMPTY } from 'rxjs';
import { Paciente, CriarPacienteDto } from './paciente.model';
import { AuthService } from '../auth/auth.service';
import { CryptoService } from './crypto';
import { DbService, PacienteLocal } from '../database/db';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PacienteService {
  private readonly apiUrl = `${environment.apiUrl}/pacientes`;

  pacientes = signal<Paciente[]>([]);

  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private cryptoService = inject(CryptoService);
  private db = inject(DbService);

  private cifrar<T extends { nome?: string; email?: string; data_nascimento?: string }>(data: T): T {
    const chave = this.authService.chaveCripto();
    if (!chave) return data;
    const c = { ...data };
    if (c.nome)            c.nome            = this.cryptoService.encrypt(c.nome, chave);
    if (c.email)           c.email           = this.cryptoService.encrypt(c.email, chave);
    if (c.data_nascimento) c.data_nascimento = this.cryptoService.encrypt(c.data_nascimento, chave);
    return c;
  }

  private decifrar(p: Paciente): Paciente {
    const chave = this.authService.chaveCripto();
    if (!chave) return p;
    try {
      return {
        ...p,
        nome:            this.cryptoService.decrypt(p.nome, chave),
        email:           this.cryptoService.decrypt(p.email, chave),
        data_nascimento: this.cryptoService.decrypt(p.data_nascimento, chave),
      };
    } catch {
      return { ...p, nome: '[erro ao decifrar]', email: '[erro ao decifrar]', data_nascimento: '[erro ao decifrar]' };
    }
  }

  private decifrarLista(lista: Paciente[]): Paciente[] {
    return lista.map(p => this.decifrar(p));
  }

  private decifrarLocal(locais: PacienteLocal[]): Paciente[] {
    return locais.map(l => this.decifrar({
      id_paciente:     l.id_paciente,
      nome:            l.nome,
      email:           l.email,
      data_nascimento: l.data_nascimento,
      id_psicologo:    l.id_psicologo,
    }));
  }

  private async atualizarCacheLocal(id_psicologo: number, dados: Paciente[]): Promise<void> {
    await this.db.pacientes.where('id_psicologo').equals(id_psicologo).delete();
    await this.db.pacientes.bulkAdd(dados.map(p => ({
      id_paciente:     p.id_paciente,
      nome:            p.nome,
      email:           p.email,
      data_nascimento: p.data_nascimento,
      id_psicologo:    p.id_psicologo,
    } as PacienteLocal)));
  }

  getAll(): Observable<Paciente[]> {
    return this.http.get<Paciente[]>(this.apiUrl).pipe(
      tap(data => this.pacientes.set(this.decifrarLista(data)))
    );
  }

  getById(id: number): Observable<Paciente> {
    return this.http.get<Paciente>(`${this.apiUrl}/${id}`);
  }

  getByPsicologo(id_psicologo: number): Observable<Paciente[]> {
    // Carrega cache local primeiro — app funciona offline imediatamente
    void this.db.pacientes.where('id_psicologo').equals(id_psicologo).toArray().then(locais => {
      if (locais.length > 0 && this.pacientes().length === 0) {
        this.pacientes.set(this.decifrarLocal(locais));
      }
    });

    return this.http.get<Paciente[]>(`${this.apiUrl}/psicologo/${id_psicologo}`).pipe(
      tap(data => {
        this.pacientes.set(this.decifrarLista(data));
        void this.atualizarCacheLocal(id_psicologo, data);
      }),
      catchError(() => EMPTY)
    );
  }

  create(data: CriarPacienteDto): Observable<Paciente> {
    return this.http.post<Paciente>(this.apiUrl, this.cifrar(data)).pipe(
      tap(novo => {
        void this.db.pacientes.add({
          id_paciente:     novo.id_paciente,
          nome:            novo.nome,
          email:           novo.email,
          data_nascimento: novo.data_nascimento,
          id_psicologo:    novo.id_psicologo,
        } as PacienteLocal);
        this.pacientes.update(lista => [...lista, this.decifrar(novo)]);
      })
    );
  }

  update(id: number, data: Partial<Paciente>): Observable<Paciente> {
    return this.http.put<Paciente>(`${this.apiUrl}/${id}`, this.cifrar(data)).pipe(
      tap(atualizado => {
        void this.db.pacientes.where('id_paciente').equals(id).modify({
          nome:            atualizado.nome,
          email:           atualizado.email,
          data_nascimento: atualizado.data_nascimento,
        });
        this.pacientes.update(lista =>
          lista.map(p => p.id_paciente === id ? this.decifrar(atualizado) : p)
        );
      })
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        void this.db.pacientes.where('id_paciente').equals(id).delete();
        this.pacientes.update(lista => lista.filter(p => p.id_paciente !== id));
      })
    );
  }
}

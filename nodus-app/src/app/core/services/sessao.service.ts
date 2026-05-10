import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Sessao, CriarSessaoDto } from './sessao.model';

@Injectable({
  providedIn: 'root'
})
export class SessaoService {
  private readonly apiUrl = 'http://localhost:3000/api/sessoes';

  sessoes = signal<Sessao[]>([]);

  constructor(private http: HttpClient) {}

  getAll(): Observable<Sessao[]> {
    return this.http.get<Sessao[]>(this.apiUrl).pipe(
      tap(data => this.sessoes.set(data))
    );
  }

  getById(id: number): Observable<Sessao> {
    return this.http.get<Sessao>(`${this.apiUrl}/${id}`);
  }

  getByPaciente(id_paciente: number): Observable<Sessao[]> {
    return this.http.get<Sessao[]>(`${this.apiUrl}/paciente/${id_paciente}`).pipe(
      tap(data => this.sessoes.set(data))
    );
  }

  getByPsicologo(id_psicologo: number): Observable<Sessao[]> {
    return this.http.get<Sessao[]>(`${this.apiUrl}/psicologo/${id_psicologo}`).pipe(
      tap(data => this.sessoes.set(data))
    );
  }

  create(data: CriarSessaoDto): Observable<Sessao> {
    return this.http.post<Sessao>(this.apiUrl, data).pipe(
      tap(nova => this.sessoes.update(lista => [...lista, nova]))
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
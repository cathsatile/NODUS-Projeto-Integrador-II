import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Psicologo, CriarPsicologoDto } from './psicologo.model';

@Injectable({
  providedIn: 'root'
})
export class PsicologoService {
  private readonly apiUrl = 'http://localhost:3000/api/psicologos';

  /*signal com lista de psicologos */
  psicologos = signal<Psicologo[]>([]);

  constructor(private http: HttpClient) {}

  getAll(): Observable<Psicologo[]> {
    return this.http.get<Psicologo[]>(this.apiUrl).pipe(
      tap(data => this.psicologos.set(data))
    );
  }

  getById(id: number): Observable<Psicologo> {
    return this.http.get<Psicologo>(`${this.apiUrl}/${id}`);
  }

  create(data: CriarPsicologoDto): Observable<Psicologo> {
    return this.http.post<Psicologo>(this.apiUrl, data).pipe(
      tap(novo => this.psicologos.update(lista => [...lista, novo]))
    );
  }

  update(id: number, data: Partial<Psicologo>): Observable<Psicologo> {
    return this.http.put<Psicologo>(`${this.apiUrl}/${id}`, data).pipe(
      tap(atualizado => this.psicologos.update(lista =>
        lista.map(p => p.id_psicologo === id ? atualizado : p)
      ))
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.psicologos.update(lista =>
        lista.filter(p => p.id_psicologo !== id)
      ))
    );
  }
}
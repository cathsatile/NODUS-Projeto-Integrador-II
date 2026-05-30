import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Paciente, CriarPacienteDto } from './paciente.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PacienteService {
  private readonly apiUrl = `${environment.apiUrl}/pacientes`;

  pacientes = signal<Paciente[]>([]);

  constructor(private http: HttpClient) {}

  getAll(): Observable<Paciente[]> {
    return this.http.get<Paciente[]>(this.apiUrl).pipe(
      tap(data => this.pacientes.set(data))
    );
  }

  getById(id: number): Observable<Paciente> {
    return this.http.get<Paciente>(`${this.apiUrl}/${id}`);
  }

  getByPsicologo(id_psicologo: number): Observable<Paciente[]> {
    return this.http.get<Paciente[]>(`${this.apiUrl}/psicologo/${id_psicologo}`).pipe(
      tap(data => this.pacientes.set(data))
    );
  }

  create(data: CriarPacienteDto): Observable<Paciente> {
    return this.http.post<Paciente>(this.apiUrl, data).pipe(
      tap(novo => this.pacientes.update(lista => [...lista, novo]))
    );
  }

  update(id: number, data: Partial<Paciente>): Observable<Paciente> {
    return this.http.put<Paciente>(`${this.apiUrl}/${id}`, data).pipe(
      tap(atualizado => this.pacientes.update(lista =>
        lista.map(p => p.id_paciente === id ? atualizado : p)
      ))
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.pacientes.update(lista =>
        lista.filter(p => p.id_paciente !== id)
      ))
    );
  }
}
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Paciente, CriarPacienteDto } from './paciente.model';
import { AuthService } from '../auth/auth.service';
import { CryptoService } from './crypto';
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

  // Cifra nome, email e data_nascimento antes de enviar ao backend
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

  getAll(): Observable<Paciente[]> {
    return this.http.get<Paciente[]>(this.apiUrl).pipe(
      tap(data => this.pacientes.set(this.decifrarLista(data)))
    );
  }

  getById(id: number): Observable<Paciente> {
    return this.http.get<Paciente>(`${this.apiUrl}/${id}`);
  }

  getByPsicologo(id_psicologo: number): Observable<Paciente[]> {
    return this.http.get<Paciente[]>(`${this.apiUrl}/psicologo/${id_psicologo}`).pipe(
      tap(data => this.pacientes.set(this.decifrarLista(data)))
    );
  }

  create(data: CriarPacienteDto): Observable<Paciente> {
    return this.http.post<Paciente>(this.apiUrl, this.cifrar(data)).pipe(
      tap(novo => this.pacientes.update(lista => [...lista, this.decifrar(novo)]))
    );
  }

  update(id: number, data: Partial<Paciente>): Observable<Paciente> {
    return this.http.put<Paciente>(`${this.apiUrl}/${id}`, this.cifrar(data)).pipe(
      tap(atualizado => this.pacientes.update(lista =>
        lista.map(p => p.id_paciente === id ? this.decifrar(atualizado) : p)
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

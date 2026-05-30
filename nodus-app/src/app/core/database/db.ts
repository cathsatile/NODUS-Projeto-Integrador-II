import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';

export interface PacienteLocal {
  id?: number;
  id_paciente?: number;
  nome: string;
  email: string;
  data_nascimento: string;
  id_psicologo: number;
}

export interface SessaoLocal {
  id?: number;
  id_sessao?: number;
  data: string;
  horario: string;
  observacoes?: string; // sempre armazenado criptografado
  humor?: number;
  status?: string;
  id_paciente: number;
  id_psicologo: number;
}

export interface HumorLocal {
  id?: number;
  data: string;
  nivel: number;       // 1–5
  observacoes?: string;
  id_paciente: number;
  id_psicologo: number;
}

@Injectable({ providedIn: 'root' })
export class DbService extends Dexie {
  pacientes!: Table<PacienteLocal>;
  sessoes!: Table<SessaoLocal>;
  humor!: Table<HumorLocal>;

  constructor() {
    super('NodusDB');

    this.version(1).stores({
      pacientes: '++id, nome, email',
      sessoes: '++id, data, id_paciente',
      humor: '++id, data, id_paciente',
    });

    // v2: adiciona id_psicologo nos índices para queries offline por psicólogo
    this.version(2).stores({
      pacientes: '++id, id_psicologo, email',
      sessoes: '++id, id_psicologo, id_paciente, data',
      humor: '++id, id_psicologo, id_paciente, data',
    });

    // v3: adiciona id_sessao e id_paciente como índices para updates pontuais
    this.version(3).stores({
      pacientes: '++id, id_psicologo, id_paciente, email',
      sessoes: '++id, id_sessao, id_psicologo, id_paciente, data',
      humor: '++id, id_psicologo, id_paciente, data',
    });
  }
}

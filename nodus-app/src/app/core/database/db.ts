import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';

// Interfaces baseadas no Modelo Conceitual [cite: 17, 18]
export interface PacienteLocal {
  id?: number;
  nome: string;
  email: string;
  data_nascimento: string;
}

@Injectable({
  providedIn: 'root'
})
export class DbService extends Dexie {
  pacientes!: Table<PacienteLocal>;

  constructor() {
    super('NodusDB');
    // Define as tabelas conforme os Requisitos Funcionais [cite: 14]
    this.version(1).stores({
      pacientes: '++id, nome, email', 
      sessoes: '++id, data, id_paciente',
      humor: '++id, data, id_paciente'
    });
  }
}
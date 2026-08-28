import Database from 'better-sqlite3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Banco embarcado — arquivo único local, sem servidor externo (ver PLANO-CONVERSAO-DESKTOP.md).
// DB_PATH é opcional; por padrão o arquivo fica dentro de backend/, ao lado do código.
const dbPath = process.env.DB_PATH ?? path.join(__dirname, '../../nodus.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Schema completo criado na primeira execução — não há mais migrations incrementais
// (ALTER TABLE) porque não existe um banco de produção anterior a preservar: cada
// instalação do app começa com o arquivo SQLite já no formato final.
db.exec(`
  CREATE TABLE IF NOT EXISTS psicologo (
    id_psicologo          INTEGER PRIMARY KEY AUTOINCREMENT,
    nome                  TEXT NOT NULL,
    email                 TEXT NOT NULL UNIQUE,
    senha                 TEXT NOT NULL,
    registro_profissional TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS paciente (
    id_paciente     INTEGER PRIMARY KEY AUTOINCREMENT,
    nome            TEXT NOT NULL,
    email           TEXT NOT NULL,
    senha           TEXT,
    data_nascimento TEXT NOT NULL,
    id_psicologo    INTEGER NOT NULL REFERENCES psicologo(id_psicologo)
  );

  CREATE TABLE IF NOT EXISTS sessao (
    id_sessao    INTEGER PRIMARY KEY AUTOINCREMENT,
    data         TEXT NOT NULL,
    horario      TEXT,
    observacoes  TEXT,
    humor        INTEGER,
    status       TEXT,
    id_paciente  INTEGER NOT NULL REFERENCES paciente(id_paciente),
    id_psicologo INTEGER NOT NULL REFERENCES psicologo(id_psicologo)
  );
`);


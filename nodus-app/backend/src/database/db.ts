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

  CREATE TABLE IF NOT EXISTS modelo_sessao (
    id_modelo    INTEGER PRIMARY KEY AUTOINCREMENT,
    nome         TEXT    NOT NULL,
    abordagem    TEXT,
    versao       INTEGER NOT NULL DEFAULT 1,
    ativo        INTEGER NOT NULL DEFAULT 1,
    padrao       INTEGER NOT NULL DEFAULT 0,
    id_psicologo INTEGER NOT NULL REFERENCES psicologo(id_psicologo)
  );

  CREATE TABLE IF NOT EXISTS paciente (
    id_paciente     INTEGER PRIMARY KEY AUTOINCREMENT,
    nome            TEXT    NOT NULL,
    email           TEXT    NOT NULL,
    senha           TEXT,
    data_nascimento TEXT    NOT NULL,
    codigo_publico  TEXT    NOT NULL DEFAULT (lower(hex(randomblob(8)))),
    id_psicologo    INTEGER NOT NULL REFERENCES psicologo(id_psicologo)
  );

  CREATE TABLE IF NOT EXISTS sessao (
    id_sessao     INTEGER PRIMARY KEY AUTOINCREMENT,
    data          TEXT    NOT NULL,
    horario       TEXT,
    observacoes   TEXT,
    humor         INTEGER,
    status        TEXT,
    id_modelo     INTEGER REFERENCES modelo_sessao(id_modelo),
    versao_modelo INTEGER,
    id_paciente   INTEGER NOT NULL REFERENCES paciente(id_paciente),
    id_psicologo  INTEGER NOT NULL REFERENCES psicologo(id_psicologo)
  );

  CREATE TABLE IF NOT EXISTS campo_modelo (
    id_campo    INTEGER PRIMARY KEY AUTOINCREMENT,
    id_modelo   INTEGER NOT NULL REFERENCES modelo_sessao(id_modelo),
    rotulo      TEXT    NOT NULL,
    tipo        TEXT    NOT NULL,
    ordem       INTEGER NOT NULL DEFAULT 0,
    obrigatorio INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS valor_campo (
    id_valor  INTEGER PRIMARY KEY AUTOINCREMENT,
    id_sessao INTEGER NOT NULL REFERENCES sessao(id_sessao),
    id_campo  INTEGER NOT NULL REFERENCES campo_modelo(id_campo),
    valor     TEXT
  );

  CREATE TABLE IF NOT EXISTS consentimento (
    id_consentimento INTEGER PRIMARY KEY AUTOINCREMENT,
    id_paciente      INTEGER NOT NULL REFERENCES paciente(id_paciente),
    tipo             TEXT    NOT NULL,
    texto_cifrado    TEXT    NOT NULL,
    aceito_em        TEXT    NOT NULL,
    revogado_em      TEXT
  );

  CREATE TABLE IF NOT EXISTS documento (
    id_documento     INTEGER PRIMARY KEY AUTOINCREMENT,
    id_paciente      INTEGER NOT NULL REFERENCES paciente(id_paciente),
    id_psicologo     INTEGER NOT NULL REFERENCES psicologo(id_psicologo),
    tipo             TEXT    NOT NULL,
    titulo           TEXT    NOT NULL,
    conteudo_cifrado TEXT    NOT NULL,
    emitido_em       TEXT    NOT NULL,
    validade         TEXT
  );

  CREATE TABLE IF NOT EXISTS anexo (
    id_anexo        INTEGER PRIMARY KEY AUTOINCREMENT,
    id_paciente     INTEGER NOT NULL REFERENCES paciente(id_paciente),
    nome_original   TEXT    NOT NULL,
    caminho_cifrado TEXT    NOT NULL,
    mime_type       TEXT,
    tamanho_bytes   INTEGER,
    adicionado_em   TEXT    NOT NULL
  );
`);
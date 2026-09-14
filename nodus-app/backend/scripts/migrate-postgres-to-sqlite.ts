// backend/scripts/migrate-postgres-to-sqlite.ts
// Uso: npx ts-node scripts/migrate-postgres-to-sqlite.ts
//
// Pré-condições:
//   1. Postgres local rodando com o banco "NODUS" do protótipo
//   2. SQLite target ainda NÃO existindo (ou apagado): backend/nodus-migrado.db
//   3. Variáveis de ambiente do Postgres configuradas no .env

import { Pool } from 'pg';
import Database from 'better-sqlite3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// ——— Conexão com Postgres (fonte) ———
const pgPool = new Pool({
  host:     process.env.DB_HOST     ?? 'localhost',
  port:     Number(process.env.DB_PORT ?? 5432),
  user:     process.env.DB_USER     ?? 'postgres',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME     ?? 'NODUS',
});

// ——— Banco SQLite novo (destino) ———
const sqlitePath = path.join(__dirname, '../nodus-migrado.db');
const sqlite = new Database(sqlitePath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// ——— Schema no destino ———
sqlite.exec(`
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

async function migrate() {
  console.log('Iniciando migração Postgres → SQLite...\n');

  // ——— 1. Psicólogos ———
  const { rows: psicologos } = await pgPool.query(
    'SELECT id_psicologo, nome, email, senha, registro_profissional FROM psicologo'
  );
  console.log(`Psicólogos encontrados: ${psicologos.length}`);

  const insertPsicologo = sqlite.prepare(
    `INSERT INTO psicologo (id_psicologo, nome, email, senha, registro_profissional)
     VALUES (?, ?, ?, ?, ?)`
  );

  // Criar modelo padrão para cada psicólogo (para sessões antigas sem id_modelo)
  const insertModelo = sqlite.prepare(
    `INSERT INTO modelo_sessao (nome, abordagem, versao, ativo, padrao, id_psicologo)
     VALUES ('Sessão padrão', 'Geral', 1, 1, 1, ?)`
  );

  // Mapa: id_psicologo_postgres → id_modelo_padrao_sqlite
  const modeloPadraoPorPsicologo = new Map<number, number>();

  const migrarPsicologos = sqlite.transaction(() => {
    for (const p of psicologos) {
      insertPsicologo.run(p.id_psicologo, p.nome, p.email, p.senha, p.registro_profissional);
      const resultado = insertModelo.run(p.id_psicologo);
      modeloPadraoPorPsicologo.set(p.id_psicologo, Number(resultado.lastInsertRowid));
    }
  });
  migrarPsicologos();
  console.log('  ✓ Psicólogos migrados');
  console.log('  ✓ Modelos padrão criados');

  // ——— 2. Pacientes ———
  const { rows: pacientes } = await pgPool.query(
    'SELECT id_paciente, nome, email, data_nascimento, id_psicologo FROM paciente'
  );
  console.log(`\nPacientes encontrados: ${pacientes.length}`);

  const insertPaciente = sqlite.prepare(
    `INSERT INTO paciente (id_paciente, nome, email, senha, data_nascimento, id_psicologo)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const migrarPacientes = sqlite.transaction(() => {
    for (const p of pacientes) {
      insertPaciente.run(
        p.id_paciente, p.nome, p.email, null,
        p.data_nascimento, p.id_psicologo
      );
    }
  });
  migrarPacientes();
  console.log('  ✓ Pacientes migrados (valores cifrados preservados)');

  // ——— 3. Sessões ———
  const { rows: sessoes } = await pgPool.query(
    `SELECT id_sessao, data, horario, observacoes, humor, status,
            id_paciente, id_psicologo
     FROM sessao`
  );
  console.log(`\nSessões encontradas: ${sessoes.length}`);

  const insertSessao = sqlite.prepare(
    `INSERT INTO sessao
       (id_sessao, data, horario, observacoes, humor, status,
        id_modelo, versao_modelo, id_paciente, id_psicologo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const migrarSessoes = sqlite.transaction(() => {
    for (const s of sessoes) {
      const idModelo = modeloPadraoPorPsicologo.get(s.id_psicologo);
      insertSessao.run(
        s.id_sessao,
        new Date(s.data).toISOString(),
        s.horario ?? null,
        s.observacoes ?? null,
        s.humor ?? null,
        s.status ?? null,
        idModelo ?? null,
        1,
        s.id_paciente,
        s.id_psicologo,
      );
    }
  });
  migrarSessoes();
  console.log('  ✓ Sessões migradas (ligadas ao modelo padrão retroativo)');

  // ——— 4. Verificação final ———
  console.log('\n--- Verificação final ---');
  console.log(`Psicólogos no SQLite:  ${(sqlite.prepare('SELECT COUNT(*) as n FROM psicologo').get() as { n: number }).n}`);
  console.log(`Pacientes no SQLite:   ${(sqlite.prepare('SELECT COUNT(*) as n FROM paciente').get() as { n: number }).n}`);
  console.log(`Sessões no SQLite:     ${(sqlite.prepare('SELECT COUNT(*) as n FROM sessao').get() as { n: number }).n}`);
  console.log(`Modelos no SQLite:     ${(sqlite.prepare('SELECT COUNT(*) as n FROM modelo_sessao').get() as { n: number }).n}`);

  await pgPool.end();
  sqlite.close();
  console.log(`\nArquivo gerado: ${sqlitePath}`);
  console.log('Migração concluída.');
}

migrate().catch((err) => {
  console.error('Erro durante a migração:', err);
  process.exit(1);
});
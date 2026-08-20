# NODUS — Sistema de Gestão Clínica Desktop

## Visão Geral
NODUS é um **aplicativo desktop instalável** para psicólogos. Roda em **Electron** com um backend Express local e banco **SQLite embarcado** — tudo na máquina do profissional, sem servidor remoto, sem internet obrigatória. Dados clínicos são cifrados em AES-256 antes de qualquer gravação (LGPD).

> Contexto histórico: até Sprint 8 o app era mobile-first com Capacitor + Android + PostgreSQL. A partir do Sprint 1 do PI-III o pivô foi para desktop. A trilha Android está congelada (branch `feat/sprint-5c-capacitor`), não apagada.

---

## Pilares Técnicos (NÃO negociáveis)

1. **Angular Moderno**: Use EXCLUSIVAMENTE Standalone Components e Signals (`signal()`, `computed()`, `effect()`). Evite RxJS Subjects desnecessários.
2. **Criptografia Estrita (LGPD)**: Dados clínicos (notas de sessão, prontuários, humor) são cifrados com **CryptoJS AES-256** ANTES de gravar no SQLite ou trafegar via HTTP. Nunca salve texto plano de dados clínicos.
3. **HTTP Loopback**: Front e back comunicam via `HttpClient` → `http://127.0.0.1:3000/api`. Não usar IPC do Electron agora — decisão revisável após entrega funcional (ver PLANO-CONVERSAO-DESKTOP.md § 3.1).
4. **Modularização**: Lógica de banco, criptografia e HTTP ficam em Services. Componentes são "burros" (presentational). `pages/` e `components/` importam de `core/`. Nunca o inverso.

---

## Arquitetura

```
Máquina do profissional — processo Electron
┌─────────────────────────────────────────────────────┐
│  Renderer (Angular 21)                               │
│  Standalone Components · Signals · HttpClient        │
├─────────────────────────────────────────────────────┤
│  Main Process (electron-src/main.ts)                 │
│  → inicia o backend Express na porta 3000            │
│  → carrega o Angular de dist/ ou localhost:4200      │
├─────────────────────────────────────────────────────┤
│  Backend (backend/src/server.ts)                     │
│  Express · JWT · bcrypt · better-sqlite3             │
├─────────────────────────────────────────────────────┤
│  SQLite (nodus.db) — app.getPath('userData')         │
│  Dados cifrados; chave AES derivada da senha (PBKDF2)│
└─────────────────────────────────────────────────────┘
```

---

## Estrutura de Pastas

```
nodus-app/
├── electron-src/
│   └── main.ts            # Processo principal do Electron (TypeScript)
├── electron/
│   └── main.js            # Compilado de electron-src/main.ts — NÃO editar
├── src/app/
│   ├── core/
│   │   ├── auth/          # AuthService — sessão + JWT + chave AES em memória
│   │   ├── guards/        # authGuard (CanActivateFn)
│   │   ├── interceptors/  # authInterceptor (Bearer token + logout em 401)
│   │   ├── database/      # db.ts — Dexie.js (LEGADO — não usar em código novo)
│   │   └── services/      # CryptoService, PacienteService, SessaoService,
│   │                      # PsicologoService, emocoes.ts, NetworkStatusService
│   ├── pages/             # Login, Principal, HomePage, Pacientes, Agenda,
│   │                      # Sections, InfoPaciente, PsicologoProfile
│   └── components/        # Header, Navbar, AddSectionPaciente, SessoesDia
├── backend/
│   ├── src/
│   │   ├── database/db.ts        # better-sqlite3 + adaptador pool.query()
│   │   ├── middleware/           # authMiddleware (JWT)
│   │   └── modules/             # auth, psicologo, paciente, sessao
│   │       └── */repository.ts  # SQL direto via pool.query()
│   └── dist/              # Compilado pelo `npm run backend:dev` ou build
├── src/environments/
│   ├── environment.ts           # Dev: localhost:3000
│   ├── environment.prod.ts      # Legado Android (não usar)
│   └── environment.electron.ts  # Prod Electron: 127.0.0.1:3000
├── tsconfig.electron.json  # Compila electron-src/ → electron/
└── package.json            # Raiz: Angular + Electron + backend runtime deps
```

---

## Como Rodar (Desenvolvimento)

### Pré-requisitos
- Node.js 22.x
- `npm install` na raiz (`nodus-app/`)
- `npm install` em `backend/` (instala ts-node-dev e @types)
- `npx electron-builder install-app-deps` (recompila `better-sqlite3` para Electron)

### Três terminais — modo desenvolvimento

```bash
# Terminal 1 — Angular dev server (hot-reload)
npm start                     # → http://localhost:4200

# Terminal 2 — Backend Express com watch
npm run backend:dev           # → http://localhost:3000

# Terminal 3 — Electron (carrega Angular do :4200)
npm run electron:dev          # NODE_ENV=development
```

### Preview completo (sem Angular dev server)

```bash
npm run electron:preview
# Sequência: ng build --configuration=electron → backend build → tsc → electron .
```

### Gerar instalador Windows

```bash
npm run electron:build
# Saída: dist-electron/NODUS Setup *.exe
```

> **Atenção — `better-sqlite3`:** O binário nativo precisa ser compilado para o ABI do Electron. Após qualquer `npm install` na raiz, rode `npx electron-builder install-app-deps`. O `postinstall` faz isso automaticamente na primeira instalação.

---

## Banco de Dados

### Schema SQLite (`backend/src/database/db.ts`)

```sql
CREATE TABLE IF NOT EXISTS psicologo (
  id_psicologo          INTEGER PRIMARY KEY AUTOINCREMENT,
  nome                  TEXT NOT NULL,
  email                 TEXT NOT NULL UNIQUE,
  senha                 TEXT NOT NULL,           -- bcrypt hash
  registro_profissional TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS paciente (
  id_paciente     INTEGER PRIMARY KEY AUTOINCREMENT,
  nome            TEXT NOT NULL,                 -- AES-256 base64
  email           TEXT NOT NULL,                 -- AES-256 base64
  data_nascimento TEXT NOT NULL,                 -- AES-256 base64
  id_psicologo    INTEGER NOT NULL REFERENCES psicologo(id_psicologo)
);

CREATE TABLE IF NOT EXISTS sessao (
  id_sessao    INTEGER PRIMARY KEY AUTOINCREMENT,
  data         TEXT NOT NULL,
  horario      TEXT,
  observacoes  TEXT,                             -- AES-256 base64
  humor        INTEGER,                          -- 1-11 (ver emocoes.ts)
  status       TEXT,
  id_paciente  INTEGER NOT NULL REFERENCES paciente(id_paciente),
  id_psicologo INTEGER NOT NULL REFERENCES psicologo(id_psicologo)
);
```

O schema é criado na primeira execução via `db.exec(CREATE TABLE IF NOT EXISTS ...)`. Não há migrations incrementais — instalação nova = arquivo SQLite vazio no formato final.

### Caminho do banco
- **Dev**: `backend/nodus.db` (relativo ao `backend/dist/database/db.js`)
- **Prod (Electron)**: `%APPDATA%\NODUS\nodus.db` (`app.getPath('userData')` configurado em `electron-src/main.ts`)
- Pode ser sobrescrito via `DB_PATH` em `.env`

### Adaptador `pool.query()`
O `backend/src/database/db.ts` exporta `pool` com interface compatível com `pg.Pool`. Isso permite que os repositories usem a mesma sintaxe `$1, $2` do PostgreSQL sem reescrita imediata. É provisório — migrar para a API nativa do better-sqlite3 é o próximo passo de refatoração.

---

## Variáveis de Ambiente (backend)

Copie `.env.example` para `.env` em `backend/`:

```env
# DB_PATH=/caminho/opcional/para/nodus.db
JWT_SECRET=troque_por_algo_longo_e_aleatorio
PORT=3000
FRONTEND_ORIGIN=http://localhost:4200
```

Em produção o Electron injeta `DB_PATH`, `PORT`, `FRONTEND_ORIGIN` e `JWT_SECRET` via `process.env` antes de importar o servidor — o `.env` em prod é ignorado.

---

## Rotas da API

| Método | Rota | Auth? | Descrição |
|--------|------|-------|-----------|
| POST | `/api/auth/login` | Não | Login — retorna JWT + perfil |
| POST | `/api/auth/register` | Não | Cadastro |
| GET | `/api/psicologos/me` | Sim | Perfil do psicólogo logado |
| PUT | `/api/psicologos/:id` | Sim | Atualizar perfil (só o próprio) |
| GET | `/api/pacientes` | Sim | Listar pacientes do psicólogo |
| POST | `/api/pacientes` | Sim | Criar paciente |
| PUT | `/api/pacientes/:id` | Sim | Atualizar paciente |
| DELETE | `/api/pacientes/:id` | Sim | Remover paciente |
| GET | `/api/sessoes` | Sim | Listar sessões do psicólogo |
| POST | `/api/sessoes` | Sim | Criar sessão |
| PUT | `/api/sessoes/:id` | Sim | Atualizar sessão |
| DELETE | `/api/sessoes/:id` | Sim | Remover sessão |

---

## Estado Atual — Implementado

### Autenticação (frontend)
- `POST /api/auth/login` e `/register` com JWT de 8h e bcrypt
- Guard `authGuard` protege `/principal`; interceptor injeta Bearer token
- PBKDF2 (100.000 iterações) deriva a chave AES-256 da senha no login
- Chave AES existe apenas em memória (signal `_chaveCripto`); nunca em localStorage

### Emoções Clínicas (`core/services/emocoes.ts`)
11 emoções clínicas e 5 status de sessão. **Não duplicar esta lógica em componentes.**

```
Emoções (campo humor: number 1-11):
  1-Alegre  2-Confiante  3-Esperançoso  4-Tranquilo  5-Ansioso
  6-Confuso  7-Existencialista  8-Frustrado  9-Nervoso  10-Sobrecarregado  11-Triste

Status de sessão (campo status: string):
  realizada | cancelada_paciente | cancelada_psicologo | nao_compareceu | remarcada
```

### Telas implementadas
- **Login / Cadastro**: fluxo completo com JWT e derivação de chave
- **Home**: boas-vindas, atalhos, emoções do mês, sessões de hoje com botões de status
- **Pacientes**: lista paginada com busca
- **Agenda**: calendário com marcadores, sessões inline ao clicar no dia
- **Sessões** (`sections`): abas Todas/Realizadas/Agendadas/Não realizadas, busca, paginação
- **Info Paciente**: histórico de sessões ordenado por data
- **Nova Sessão** (`AddSectionPaciente`): formulário, campo de emoção aparece só após o horário passar
- **Perfil do psicólogo**

---

## Código Legado (não usar em código novo)

| Arquivo | Status | Motivo |
|---------|--------|--------|
| `core/database/db.ts` (Dexie.js) | Legado | Sem função no modelo desktop |
| `core/services/network-status.service.ts` | Legado | Sem estado online/offline a monitorar |
| `capacitor.config.ts`, `android/` | Congelado | Android fora do escopo desta fase |

---

## Regras de Código

### Signals
- `signal()` para estado local do componente.
- `computed()` para derivar dados — listas filtradas, totais, formatações.
- `effect()` apenas para side effects explícitos.

### Serviços
- `CryptoService`: cifra/decifra AES-256. Nunca acessa banco diretamente.
- `AuthService`: gerencia sessão e chave AES em memória. Nunca expõe a chave em texto plano.
- `emocoes.ts`: fonte única de verdade para emoções e status. Nunca duplicar.

### Componentes
- Componentes NÃO fazem chamadas diretas ao banco.
- Formulários usam Reactive Forms + Signals para loading/erro.
- Não use `DatePipe` com locale `'pt-BR'` — locale não registrado. Formate datas manualmente.

### Convenções
- Código em **inglês** (variáveis, métodos, classes). Comentários e commits em **português**.
- Nunca use `any` no TypeScript.
- Nunca faça `console.log` de dados clínicos descriptografados.
- Comparação de datas de sessão: use `getFullYear/Month/Date` para evitar bugs de fuso horário.

# NODUS — Sistema de Gestão Clínica e Monitoramento Terapêutico

## Visão Geral do Projeto
NODUS é um aplicativo **desktop de uso individual** para gestão clínica de psicólogos: front-end Angular + back-end Node/Express local, ambos empacotados (via Electron, ver "Empacotamento Desktop" abaixo) num único executável, sem servidor remoto e sem múltiplos usuários por instalação. Prioridade absoluta: dados clínicos sempre cifrados em disco (LGPD) e funcionamento 100% offline — não há mais "modo offline" a tratar, porque não existe mais servidor remoto do qual desconectar.

> O projeto está em pivô de arquitetura (mobile/Capacitor/PostgreSQL → desktop/Electron/SQLite). Este arquivo descreve o **estado atual do código**, não o alvo final. Para o racional completo do pivô, decisões em aberto e o que ainda falta, ver [`docs/PLANO-CONVERSAO-DESKTOP.md`](../docs/PLANO-CONVERSAO-DESKTOP.md) (na raiz do repositório, um nível acima de `nodus-app/`).

---

## Pilares Técnicos (NÃO negociáveis)

1. **Angular Moderno**: Use EXCLUSIVAMENTE Standalone Components e Signals (`signal()`, `computed()`, `effect()`). Evite RxJS Subjects desnecessários.
2. **Local-first de verdade**: Não há mais cache/IndexedDB no front (Dexie foi removido) — o front fala diretamente com o back-end local via `HttpClient`, que é a única fonte de verdade. O "banco" é um arquivo SQLite (`better-sqlite3`) na máquina do profissional, sem sincronização com nada.
3. **Segurança Estrita (LGPD)**: Dados clínicos (notas de sessão, prontuários, humor) são ultra-sensíveis. Criptografe SEMPRE com **Crypto-JS (AES-256)** ANTES de enviar para a API. Nunca salve texto plano de dados clínicos.
4. **Modularização**: Lógica de banco, criptografia e HTTP ficam em Services. Componentes devem ser majoritariamente "burros" (presentational).

---

## Estrutura de Pastas

```
src/app/
  ├── core/
  │   ├── auth/          # AuthService (sessão + JWT + sinal psicologoAtual + chave AES em memória)
  │   ├── guards/        # authGuard (CanActivateFn)
  │   ├── interceptors/  # authInterceptor (Bearer token + logout em 401)
  │   └── services/      # CryptoService, PacienteService, SessaoService, PsicologoService, emocoes.ts
  ├── pages/             # Login, Principal, HomePage, Pacientes, Agenda, Sections,
  │                      # InfoPaciente, PsicologoProfile
  ├── components/        # Header, Navbar, AddSectionPaciente, SessoesDia
  └── environments/      # environment.ts (dev), environment.prod.ts (prod)
```

`core/database/` (Dexie/IndexedDB) e `core/services/network-status.service.ts` **não existem mais** — foram removidos junto com a lógica offline-first, que perdeu sentido sem servidor remoto.

**Regra de dependência**: `pages/` e `components/` importam de `core/`. Nunca o inverso.

---

## Ambiente de Desenvolvimento

### Backend
- **Runtime**: Node.js + Express + TypeScript (`ts-node-dev`)
- **Banco**: SQLite embarcado via `better-sqlite3` — arquivo único, sem servidor de banco (ver seção seguinte)
- **Porta**: 3000 (loopback — front e back rodam na mesma máquina)
- **Arquivo de configuração**: `backend/.env` (não commitar; ver `backend/.env.example`)
- **Rodar**: `cd backend && npm run dev`

```env
# DB_PATH é opcional — por padrão o arquivo fica em backend/nodus.db.
# Fora do dev, o Electron deve apontar isso para app.getPath('userData').
DB_PATH=/caminho/opcional/para/nodus.db
JWT_SECRET=troque_por_um_secret_longo_e_aleatorio
PORT=3000
```

> CORS foi simplificado para o modelo loopback: só aceita origem `http://localhost:4200` (dev do Angular) ou requisições sem origem (Electron via `file://`). Não há mais `FRONTEND_ORIGIN` multi-origem — isso era necessário só para o WebView do Capacitor, que está congelado (ver seção "Trilha mobile" abaixo).

### Frontend
- **Framework**: Angular 21, Standalone Components, Signals
- **Porta**: 4200
- **Rodar**: `npm start` na raiz de `nodus-app/`
- **Build**: `npm run build`

### Empacotamento Desktop (Electron) — planejado, ainda não implementado neste diretório
O alvo (RF01/RF02/RF05 do relatório) é um processo principal Electron que abre a janela, sobe este mesmo backend Express em loopback e grava o SQLite em `app.getPath('userData')`. **Hoje isso ainda não existe em `nodus-app/`** — nem `electron`/`electron-builder` nas dependências, nem `electron/main.ts`. A prova de conceito que validou `electron-builder` + `better-sqlite3` (nativo, compilado por plataforma) vive isolada em `electron-spike/` na raiz do repositório e só foi testada em Linux; a validação em Windows (plataforma-alvo do instalador) ainda está pendente. Detalhes e o backlog completo (E1–E7) estão em `docs/PLANO-CONVERSAO-DESKTOP.md`, seção 5.

### Banco de Dados (schema atual — SQLite, `backend/src/database/db.ts`)

```sql
CREATE TABLE IF NOT EXISTS psicologo (
  id_psicologo          INTEGER PRIMARY KEY AUTOINCREMENT,
  nome                  TEXT NOT NULL,
  email                 TEXT NOT NULL UNIQUE,
  senha                 TEXT NOT NULL,              -- bcrypt hash
  registro_profissional TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS paciente (
  id_paciente     INTEGER PRIMARY KEY AUTOINCREMENT,
  nome            TEXT NOT NULL,                    -- AES-256 base64
  email           TEXT NOT NULL,                    -- AES-256 base64
  senha           TEXT,                             -- nullable: pacientes não fazem login
  data_nascimento TEXT NOT NULL,                    -- AES-256 base64
  codigo_publico  TEXT NOT NULL DEFAULT (lower(hex(randomblob(8)))),
  id_psicologo    INTEGER NOT NULL REFERENCES psicologo(id_psicologo)
);

CREATE TABLE IF NOT EXISTS sessao (
  id_sessao     INTEGER PRIMARY KEY AUTOINCREMENT,
  data          TEXT NOT NULL,
  horario       TEXT,                               -- formato HH:MM
  observacoes   TEXT,                                -- AES-256 base64
  humor         INTEGER,                             -- 1-11 (ver emocoes.ts)
  status        TEXT,                                -- realizada | cancelada_paciente |
                                                       -- cancelada_psicologo | nao_compareceu | remarcada
  id_modelo     INTEGER REFERENCES modelo_sessao(id_modelo),
  versao_modelo INTEGER,
  id_paciente   INTEGER NOT NULL REFERENCES paciente(id_paciente),
  id_psicologo  INTEGER NOT NULL REFERENCES psicologo(id_psicologo)
);

-- modelo_sessao, campo_modelo, valor_campo, consentimento, documento e anexo
-- também já existem no schema (modelos de sessão configuráveis, consentimentos,
-- documentos e anexos cifrados — ver ERD em docs/NODUS-Relatorio-PI3-Documento-Software-V1.pdf,
-- seção 7). Ainda SEM repository/service/controller — schema pronto, funcionalidade das
-- Sprints 3+ (US08 em diante). Não usar essas tabelas até essa camada existir.
```

> Não há mais migrations incrementais (`ALTER TABLE`). O schema inteiro é criado com `CREATE TABLE IF NOT EXISTS` na primeira execução (`backend/src/database/db.ts`) — cada instalação começa com o banco já no formato final. Para importar dados do protótipo antigo em PostgreSQL, existe `backend/scripts/migrate-postgres-to-sqlite.ts` (operação única, não roda no startup).

---

## Estado Atual — o que já funciona

### Autenticação (hoje ainda JWT — mudança de modelo já decidida, não implementada)
- `POST /api/auth/login` e `POST /api/auth/register` com JWT de 8h e bcrypt
- Guard `authGuard` protege `/principal`; interceptor injeta Bearer token
- PBKDF2 com 100.000 iterações deriva a chave AES-256 da senha no login
- Chave AES existe apenas em memória (signal `_chaveCripto`); nunca em localStorage
- **Pendente**: o time já decidiu (ver `docs/PLANO-CONVERSAO-DESKTOP.md`, seção 6, item 1) substituir JWT/Bearer por uma sessão simples em memória, já que não há mais fronteira de rede real a proteger — RF04 só exige senha + derivação de chave, não exige JWT. Essa troca ainda não foi implementada; `auth.service.ts`, `auth.middleware.ts` e `auth.interceptor.ts` continuam com o fluxo JWT descrito acima até essa migração acontecer.

### Segurança (Backend)
- `authMiddleware` JWT aplicado em todas as rotas protegidas
- Controllers verificam posse: psicólogo só acessa seus próprios pacientes/sessões (retorna `403 Acesso negado` — ver `sessao.controller.ts`/`paciente.controller.ts`). Esses checks continuam mesmo após a troca de auth planejada, porque `id_psicologo` permanece no schema mesmo sendo o app de um único profissional por instalação (decisão registrada no plano, seção 6, item 2).
- CORS restrito a loopback (`http://localhost:4200` ou sem origem) — ver `backend/src/server.ts`

### Emoções Clínicas (`core/services/emocoes.ts`)
Arquivo central com 11 emoções clínicas e 5 status de sessão. **Não duplicar esta lógica em componentes.**

```
Emoções (campo humor: number 1-11):
  1-Alegre  2-Confiante  3-Esperançoso  4-Tranquilo  5-Ansioso
  6-Confuso  7-Existencialista  8-Frustrado  9-Nervoso  10-Sobrecarregado  11-Triste

Status de sessão (campo status: string):
  realizada | cancelada_paciente | cancelada_psicologo | nao_compareceu | remarcada
```

Funções exportadas: `emocaoLabel(valor)`, `emocaoEmoji(valor)`, `statusLabel(valor)`, constante `EMOCOES`, constante `STATUS_SESSAO`.

### Home Page
- Boas-vindas com nome do psicólogo e contagem de sessões do dia
- Grid de atalhos: nova sessão, novo paciente, total de pacientes, sessões do mês
- Seção "Emoções do último mês": top 3 com barras de progresso e percentual
- Seção "Sessões de hoje": lista ordenada por horário
  - Botões "Realizada / Não ocorreu" aparecem **somente após o horário da sessão ter passado**
  - Antes do horário: badge "Agendada"
  - Após marcar: badge colorido com o status

### Agenda
- Calendário `MatCalendar` com marcadores visuais via `::ng-deep`:
  - **Hoje**: borda quadrada vermelha
  - **Selecionado**: sublinhado (sem fundo preenchido)
  - **Dias com sessão**: ponto laranja abaixo do número
- Ao clicar em um dia, as sessões aparecem **inline abaixo do calendário** (não modal):
  - Exibe horário, nome do paciente, emoção e badge de status
  - "Nenhuma sessão neste dia" se o dia estiver vazio
- Botão "Nova sessão" abre `AddSectionPaciente`

### Formulário de Nova Sessão (`AddSectionPaciente`)
- Formulário único sem stepper
- Campo de emoção aparece somente quando `new Date('${data}T${horario}:00') <= new Date()`
  (exige data **e** horário preenchidos e já passados)
- Cadastro de paciente sem campo senha

### Tela de Sessões (`sections`)
- Campo de busca por nome de paciente (filtra todas as abas)
- Abas: Todas · Realizadas · Agendadas · **Não realizadas**
  - "Não realizadas" = sessões com status definido e diferente de 'realizada'
- Paginação independente por aba (PAGE_SIZE = 10)
- Badge de status colorido para cada tipo

### Tela de Informações do Paciente (`InfoPaciente`)
- Lista todas as sessões do paciente, ordenadas por data decrescente
- Exibe emoção (emoji + label) e status usando `emocoes.ts`

### Ainda não implementado no código (existe no schema e/ou no backlog, não na aplicação)
- Bloqueio automático por inatividade (RF05, US05)
- Modelos de sessão configuráveis, campos customizados, linha do tempo (RF08–RF13, US08–US12)
- Consentimentos, documentos em PDF, anexos cifrados (RF14–RF18, US13–US16)
- Empacotamento Electron (ver seção acima)

---

## Regras de Código

### Signals
- Use `signal()` para estado local do componente.
- Use `computed()` para derivar dados — listas filtradas, totais, formatações.
- Use `effect()` apenas para side effects explícitos.

### Serviços
- `CryptoService`: cifra/decifra strings AES-256.
- `AuthService`: gerencia sessão e chave AES em memória. Nunca expõe a chave em texto plano.
- `PacienteService` / `SessaoService`: falam diretamente com o backend local via `HttpClient` — não há mais camada de cache/sincronização a manter.
- `emocoes.ts`: fonte única de verdade para emoções e status. Nunca duplicar listas de emoções em componentes.

### Componentes
- Componentes NÃO fazem chamadas diretas a `CryptoService` nem `HttpClient` — sempre via os services de `core/`.
- Formulários usam Reactive Forms + Signals para loading/erro.
- Não use `DatePipe` com locale `'pt-BR'` — o locale não está registrado no `app.config.ts`. Formate datas manualmente ou use `slice(0,10)`.

### UX
- Inputs com espaçamento generoso para toque (herdado do desenho mobile-first original; mantido por ora no desktop).
- Feedback visual imediato em todas as ações (loading, sucesso, erro).
- Modais usam `position: { bottom: '0' }` e `panelClass: 'bottom-modal'` para sheet behavior.

### Performance
- Listas de sessões/pacientes usam paginação (PAGE_SIZE = 10 com "Ver mais").
- `sessoesFiltradas` em sections.ts é um `computed()` que reage ao signal `busca` — não filtrar no template.

---

## Trilha mobile (Capacitor) — congelada, não removida

O app era originalmente mobile-first via Capacitor/Android. Essa trilha foi **congelada, não descartada**: `android/` e `capacitor.config.ts` foram movidos para a branch `frozen/mobile-capacitor` (detalhes em `docs/mobile-congelado.md`). `@capacitor/android`, `@capacitor/cli` e `@capacitor/core` ainda aparecem em `package.json` como dependências órfãs — não quebram o build do Angular, mas devem ser removidas quando o time confirmar que a trilha mobile não volta no curto prazo. Não reintroduzir código Capacitor sem consultar esse documento primeiro.

---

## Convenções Gerais

- Idioma do código: **inglês** (variáveis, métodos, classes).
- Comentários e commits: **português**.
- Nunca use `any` no TypeScript — sempre tipar explicitamente.
- Nunca faça `console.log` de dados clínicos descriptografados.
- Comparação de datas de sessão: use `toDateKey(new Date(s.data))` (getFullYear/Month/Date) para evitar bugs de fuso horário. Não use `new Date(s.data).toLocaleDateString()` nem `s.data.slice(0,10)` para comparar com datas locais do calendário.

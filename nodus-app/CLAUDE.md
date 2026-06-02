# NODUS — Sistema de Gestão Clínica e Monitoramento Terapêutico

## Visão Geral do Projeto
NODUS é um app Mobile-First para gestão clínica de psicólogos. Roda em WebView via **Capacitor** no Android. Prioridade absoluta: segurança dos dados clínicos (LGPD) e funcionamento offline.

---

## Pilares Técnicos (NÃO negociáveis)

1. **Angular Moderno**: Use EXCLUSIVAMENTE Standalone Components e Signals (`signal()`, `computed()`, `effect()`). Evite RxJS Subjects desnecessários.
2. **Offline-First**: Toda persistência inicial ocorre localmente no IndexedDB via **Dexie.js**. Sincronização com PostgreSQL (back-end) é secundária.
3. **Segurança Estrita (LGPD)**: Dados clínicos (notas de sessão, prontuários, humor) são ultra-sensíveis. Criptografe SEMPRE com **Crypto-JS (AES-256)** ANTES de salvar no Dexie.js ou enviar para a API. Nunca salve texto plano de dados clínicos.
4. **Modularização**: Lógica de banco, criptografia e HTTP ficam em Services. Componentes devem ser majoritariamente "burros" (presentational), focados em UX mobile.

---

## Estrutura de Pastas

```
src/app/
  ├── core/
  │   ├── auth/          # AuthService (sessão + JWT + sinal psicologoAtual + chave AES em memória)
  │   ├── guards/        # authGuard (CanActivateFn)
  │   ├── interceptors/  # authInterceptor (Bearer token + logout em 401)
  │   ├── database/      # DbService — Dexie.js (offline IndexedDB, schema v3)
  │   └── services/      # CryptoService, PacienteService, SessaoService, PsicologoService,
  │                      # NetworkStatusService, emocoes.ts
  ├── pages/             # Login, Principal, HomePage, Pacientes, Agenda, Sections,
  │                      # InfoPaciente, PsicologoProfile
  ├── components/        # Header, Navbar, AddSectionPaciente, SessoesDia
  └── environments/      # environment.ts (dev), environment.prod.ts (prod)
```

**Regra de dependência**: `pages/` e `components/` importam de `core/`. Nunca o inverso.

---

## Ambiente de Desenvolvimento

### Backend
- **Runtime**: Node.js + Express + TypeScript (`ts-node-dev`)
- **Banco**: PostgreSQL 18, banco `nodus`, usuário `postgres`
- **Porta**: 3000
- **Arquivo de configuração**: `backend/.env` (não commitar)
- **Rodar**: `cd backend && npm run dev`

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=<senha_local>
DB_NAME=nodus
JWT_SECRET=nodus_local_secret_2026
PORT=3000
FRONTEND_ORIGIN=http://localhost:4200,https://localhost,capacitor://localhost
```

> `FRONTEND_ORIGIN` aceita múltiplas origens separadas por vírgula. Necessário para o Capacitor WebView (`https://localhost`) e o browser de dev (`http://localhost:4200`).

### Frontend
- **Framework**: Angular 21, Standalone Components, Signals
- **Porta**: 4200
- **Rodar**: `npm start` na raiz de `nodus-app/`
- **Build**: `npm run build`
- **Sync Android**: `npx cap sync android`

### Banco de Dados (schema atual — com migrations aplicadas)

```sql
CREATE TABLE psicologo (
  id_psicologo          SERIAL PRIMARY KEY,
  nome                  VARCHAR(150) NOT NULL,
  email                 VARCHAR(150) NOT NULL UNIQUE,
  senha                 TEXT NOT NULL,           -- bcrypt hash
  registro_profissional VARCHAR(50)  NOT NULL
);

CREATE TABLE paciente (
  id_paciente     SERIAL PRIMARY KEY,
  nome            TEXT NOT NULL,                 -- AES-256 base64
  email           TEXT NOT NULL,                 -- AES-256 base64
  senha           TEXT,                          -- nullable: pacientes não fazem login
  data_nascimento TEXT NOT NULL,                 -- AES-256 base64
  id_psicologo    INTEGER NOT NULL REFERENCES psicologo(id_psicologo)
);

CREATE TABLE sessao (
  id_sessao    SERIAL PRIMARY KEY,
  data         TIMESTAMP NOT NULL,
  horario      VARCHAR(5),                       -- formato HH:MM
  observacoes  TEXT,                             -- AES-256 base64
  humor        INTEGER,                          -- 1-11 (ver emocoes.ts)
  status       VARCHAR(50),                      -- realizada | cancelada_paciente |
                                                 -- cancelada_psicologo | nao_compareceu | remarcada
  id_paciente  INTEGER NOT NULL REFERENCES paciente(id_paciente),
  id_psicologo INTEGER NOT NULL REFERENCES psicologo(id_psicologo)
);
```

> As migrations são aplicadas automaticamente no startup do backend (`backend/src/database/db.ts`). Não é necessário rodar SQL manualmente.

---

## Estado Atual — Tudo Implementado

### Autenticação
- `POST /api/auth/login` e `POST /api/auth/register` com JWT de 8h e bcrypt
- Guard `authGuard` protege `/principal`; interceptor injeta Bearer token
- PBKDF2 assíncrono via **Web Crypto API** (`crypto.subtle`, 100.000 iterações, SHA-256) deriva a chave AES-256 — não bloqueia o thread de UI
- Chave AES existe apenas em memória (signal `_chaveCripto`); nunca em localStorage
- `login()` verifica `localStorage` antes de ir ao backend (re-auth após logout suave); timeout de 5s nas chamadas HTTP — cadastro cai para conta local automaticamente se backend não responder
- `logout()` mantém perfil e `nodus_verify` no localStorage para re-autenticação offline; `limparConta()` apaga tudo — chamado por "Usar outra conta"

### Segurança (Backend)
- `authMiddleware` JWT aplicado em todas as rotas protegidas
- Controllers verificam posse: psicólogo só acessa seus próprios pacientes/sessões
- CORS multi-origem via `FRONTEND_ORIGIN` no `.env`
- `capacitor.config.ts`: `allowMixedContent: true` para WebView Android

### Offline-First (Dexie.js — schema v3)
- `PacienteService` e `SessaoService`: mutations (`create`/`update`/`delete`) gravam no Dexie imediatamente e retornam `of(valor)` — HTTP é fire-and-forget com `catchError(() => EMPTY)`
- Leituras usam cache Dexie primeiro; HTTP atualiza o cache em background sem bloquear a UI
- `NetworkStatusService`: signal `isOnline` reativo a eventos `online`/`offline`
- Header exibe banner "Sem conexão..." automaticamente quando offline

### Backup (`BackupService`)
- Exporta/importa todos os dados do Dexie como arquivo `.nodus` (JSON criptografado AES-256 com a chave derivada da senha do usuário)
- No Android, backups salvos em `Directory.External` → `Android/data/com.nodus.app/files/backups/` — visível no gerenciador de arquivos sem permissão extra
- Na tela de restauração (nativo), a UI lista os arquivos `.nodus` dessa pasta diretamente — sem file picker genérico
- Fluxo: seleciona arquivo → confirma senha NODUS (decripta offline) → faz login → importa para Dexie
- No web: file picker `<input type="file">` para selecionar o `.nodus`

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

---

## Regras de Código

### Signals
- Use `signal()` para estado local do componente.
- Use `computed()` para derivar dados — listas filtradas, totais, formatações.
- Use `effect()` apenas para side effects explícitos.

### Serviços
- `CryptoService`: cifra/decifra strings AES-256. Nunca acessa o Dexie diretamente.
- `DbService`: lê/escreve no Dexie.js. Nunca cifra por conta própria.
- `AuthService`: gerencia sessão e chave AES em memória. Nunca expõe a chave em texto plano.
- `emocoes.ts`: fonte única de verdade para emoções e status. Nunca duplicar listas de emoções em componentes.

### Componentes
- Componentes NÃO fazem chamadas diretas ao DbService ou CryptoService.
- Formulários usam Reactive Forms + Signals para loading/erro.
- Não use `DatePipe` com locale `'pt-BR'` — o locale não está registrado no `app.config.ts`. Formate datas manualmente ou use `slice(0,10)`.

### UX Mobile
- Inputs com espaçamento generoso para toque.
- Feedback visual imediato em todas as ações (loading, sucesso, erro).
- Modais usam `position: { bottom: '0' }` e `panelClass: 'bottom-modal'` para sheet behavior.

### Performance
- Listas de sessões/pacientes usam paginação (PAGE_SIZE = 10 com "Ver mais").
- `sessoesFiltradas` em sections.ts é um `computed()` que reage ao signal `busca` — não filtrar no template.
- PBKDF2 é assíncrono (Web Crypto API); nunca usar `CryptoJS.PBKDF2` — bloqueia o thread por 5-15s no mobile.
- Mutations de serviço são Dexie-first com HTTP em background; nunca esperar resposta HTTP para atualizar a UI.

---

## Integrações Nativas (Capacitor)

- App configurado para Android: `capacitor.config.ts` com `allowMixedContent: true`
- Backend acessível pelo celular via IP da máquina (configurado em `environment.ts`)
- **Camera**: planejada para digitalizar documentos — não implementada ainda

### Fluxo de deploy para o celular
```bash
npm run build          # gera dist/
npx cap sync android   # copia assets para o projeto Android
npx cap open android   # abre no Android Studio para rodar
```

---

## Convenções Gerais

- Idioma do código: **inglês** (variáveis, métodos, classes).
- Comentários e commits: **português**.
- Nunca use `any` no TypeScript — sempre tipar explicitamente.
- Nunca faça `console.log` de dados clínicos descriptografados.
- Comparação de datas de sessão: use `toDateKey(new Date(s.data))` (getFullYear/Month/Date) para evitar bugs de fuso horário. Não use `new Date(s.data).toLocaleDateString()` nem `s.data.slice(0,10)` para comparar com datas locais do calendário.

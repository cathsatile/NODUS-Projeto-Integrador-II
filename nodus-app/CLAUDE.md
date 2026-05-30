# NODUS — Sistema de Gestão Clínica e Monitoramento Terapêutico

## Visão Geral do Projeto
NODUS é um app Mobile-First para gestão clínica de psicólogos. Roda em WebView via **Capacitor**. Prioridade absoluta: segurança dos dados clínicos (LGPD) e funcionamento offline.

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
  │   ├── auth/          # AuthService (sessão + JWT + sinal psicologoAtual)
  │   ├── guards/        # authGuard (CanActivateFn)
  │   ├── interceptors/  # authInterceptor (Bearer token + logout em 401)
  │   ├── databse/       # DbService — Dexie.js (offline IndexedDB)
  │   └── services/      # CryptoService, PacienteService, SessaoService, PsicologoService
  ├── pages/             # Login, Principal, HomePage, Pacientes, Agenda, Sections, InfoPaciente, PsicologoProfile
  ├── components/        # Header, Navbar, AddSectionPaciente, SectionResume
  └── services/          # Re-exports de core/auth (manter para compatibilidade)
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
```

### Frontend
- **Framework**: Angular 21, Standalone Components, Signals
- **Porta**: 4200
- **Rodar**: `npm start` na raiz de `nodus-app/`

### Banco de Dados (schema atual)
```sql
CREATE TABLE psicologo (
  id_psicologo          SERIAL PRIMARY KEY,
  nome                  VARCHAR(150) NOT NULL,
  email                 VARCHAR(150) NOT NULL UNIQUE,
  senha                 TEXT NOT NULL,          -- bcrypt hash
  registro_profissional VARCHAR(50)  NOT NULL
);

CREATE TABLE paciente (
  id_paciente     SERIAL PRIMARY KEY,
  nome            VARCHAR(150) NOT NULL,
  email           VARCHAR(150) NOT NULL,
  senha           TEXT NOT NULL,
  data_nascimento DATE NOT NULL,
  id_psicologo    INTEGER NOT NULL REFERENCES psicologo(id_psicologo)
);

CREATE TABLE sessao (
  id_sessao    SERIAL PRIMARY KEY,
  data         TIMESTAMP NOT NULL,
  observacoes  TEXT,
  id_paciente  INTEGER NOT NULL REFERENCES paciente(id_paciente),
  id_psicologo INTEGER NOT NULL REFERENCES psicologo(id_psicologo)
);
```

---

## O que já foi implementado (estado atual)

### Sprint 0 — Alicerce (concluído)
- `DbService` com Dexie.js (instalado, estrutura criada — integração pendente)
- `CryptoService` com AES-256 (instalado, estrutura criada — integração pendente)

### Sprint 1 — Autenticação de ponta a ponta (concluído)
- **Backend — módulo `auth`**:
  - `POST /api/auth/login` — valida credenciais com bcrypt, retorna JWT de 8h
  - `POST /api/auth/register` — cria psicólogo com hash de senha, retorna JWT
  - `psicologo.repository.ts` — adicionado `findByEmail` (inclui hash para comparação)
- **Frontend — `core/auth/auth.service.ts`**:
  - Signals `psicologoAtual` (readonly) e `isAuthenticated` (computed)
  - `login()`, `register()`, `logout()` — gerenciam JWT no localStorage
  - `inicializarSessao()` no construtor — restaura sessão validando expiração do JWT
- **Frontend — `core/guards/auth.guard.ts`**:
  - `CanActivateFn` protege `/principal` — redireciona para `/login` se não autenticado
- **Frontend — `core/interceptors/auth.interceptor.ts`**:
  - Injeta `Authorization: Bearer <token>` em todas as requisições
  - Em 401 fora de rotas `/api/auth`, faz logout automático e redireciona
- **Frontend — `pages/login/login.ts`**:
  - `FormBuilder` inicializa `loginForm` e `cadastroForm` com `Validators`
  - Signals `loading` e `erro` para feedback visual
  - `fazerLogin()` e `fazerCadastro()` chamam `AuthService` e navegam para `/principal/home`
  - Validator customizado `senhasIguaisValidator`
- **`app.routes.ts`** — guard aplicado em `/principal`, redirect padrão `**` → `/login`
- **`app.config.ts`** — `provideHttpClient(withInterceptors([authInterceptor]))`
- **`principal.routes.ts`** — migrado de `@NgModule` para array standalone `principalRoutes`

---

## Modelos de Dados (Tabelas Dexie.js — integração pendente)

As tabelas do banco local são: `psicologo`, `paciente`, `sessao`, `humor`.

- Campos clínicos sensíveis (notas, diagnósticos, humor) devem ser armazenados como string AES-256 cifrada.
- Campos de identificação (nome, CPF, contato) também são sensíveis — criptografar antes de persistir.
- IDs são gerados localmente (UUID) para suportar operações offline.

---

## Regras de Código

### Signals
- Use `signal()` para estado local do componente.
- Use `computed()` para derivar dados descriptografados ou transformados — especialmente ao alimentar gráficos no Dashboard.
- Use `effect()` apenas para side effects explícitos (ex: persistência após mudança de estado).

### Serviços
- `CryptoService`: única responsabilidade é cifrar/decifrar strings com AES-256. Nunca acessa o Dexie diretamente.
- `DbService`: única responsabilidade é ler/escrever no Dexie.js. Nunca cifra por conta própria — recebe dados já cifrados.
- `AuthService` (`core/auth/`): gerencia sessão do psicólogo logado. Expõe a chave de criptografia derivada da senha (nunca a salva em texto plano).

### Componentes
- Componentes NÃO fazem chamadas diretas ao DbService ou CryptoService — usam um Service de feature intermediário (ex: `PacienteService`, `SessaoService`).
- Formulários usam Reactive Forms com Signals para controle de estado de UI (loading, etapa atual do stepper, erros).
- Re-exports de tipo em `isolatedModules: true` exigem `export type { ... }` — não misturar com `export { ... }`.

### UX Mobile
- Formulários longos devem usar **Stepper** (etapas) para não sobrecarregar o usuário.
- Inputs devem ser limpos, com espaçamento generoso para toque.
- Feedback visual imediato em todas as ações (loading state, sucesso, erro).

### Performance
- Descriptografar grandes listas no fio principal pode congelar a tela. Use **paginação** ao listar histórico de sessões/humor.
- Se o volume de registros for massivo, use **Web Workers** para descriptografar fora do fio principal.

---

## Integrações Nativas (Capacitor)

- **Camera**: usado para digitalizar documentos físicos. O texto extraído é anexado diretamente às notas da sessão como campo criptografado.
- Sempre verificar permissões nativas antes de acionar plugins Capacitor.
- Tratar erros de plugins nativos explicitamente (usuário negou permissão, hardware indisponível).

---

## Roadmap até simulação no celular

### Sprint 5-A: Hardening de Segurança (concluído — branch feat/sprint-5a-security)
- [x] `authMiddleware` JWT criado em `backend/src/middleware/auth.middleware.ts`
- [x] Middleware aplicado em `/api/psicologos`, `/api/pacientes`, `/api/sessoes` no `server.ts`
- [x] `paciente.controller.ts` — `id_psicologo` extraído do token; checks de posse em GET/PUT/DELETE
- [x] `sessao.controller.ts` — `id_psicologo` extraído do token; checks de posse em GET/PUT/DELETE
- [x] `psicologo.controller.ts` — rotas restritas ao próprio psicólogo autenticado
- [x] CORS restrito: aceita apenas `FRONTEND_ORIGIN` (`.env`) em vez de qualquer origin
- [x] PBKDF2: iterações elevadas de 1.000 → 100.000 (NIST SP 800-132)
- [x] Salt único por usuário: `NODUS:<email>:2026` em vez de salt global fixo
- [x] Chave AES removida do `sessionStorage` — existe apenas em memória (signal `_chaveCripto`)
- [x] `isAuthenticated` requer JWT **e** chave de criptografia (login sempre re-deriva a chave)
- [x] `environments/environment.ts` e `environment.prod.ts` criados; `angular.json` configurado com `fileReplacements`
- [x] Todas as URLs hardcoded `localhost:3000` substituídas por `environment.apiUrl`

### Próximo — Sprint 5-B: Qualidade
- [ ] Criptografar dados no `PacienteService` (cifrar nome/email/data antes de enviar)
- [ ] CORS — adicionar `FRONTEND_ORIGIN` ao `.env` do backend
- [ ] `CryptoService.decrypt` deve lançar erro em vez de retornar ciphertext silenciosamente
- [ ] Corrigir memory leak em `SessaoService.getByPsicologo` (subscription interna sem cleanup)
- [ ] Criptografar `observacoes` no `SessaoService.update`

### Sprint 5-C: Build Capacitor e simulação no celular
> Somente após Sprint 5-B concluída.

### ~~Próximo — Sprint 2: Conectar UI aos dados reais~~
- [ ] Remover dados hardcoded de `home-page`, `header` e `pacientes` — injetar `AuthService` e `PacienteService`
- [ ] `home-page`: exibir nome do psicólogo logado via `authService.psicologoAtual().nome`
- [ ] `header`: exibir iniciais reais do psicólogo via `computed()`
- [ ] Tela de pacientes: listar pacientes reais do psicólogo logado (`PacienteService.getByPsicologo()`)
- [ ] Formulário de cadastro de paciente com Stepper (Sprint 2 do roadmap original)
- [ ] Botão de logout no perfil do psicólogo

### Sprint 3: Criptografia + Offline-First
- [ ] Integrar `CryptoService` no `PacienteService` e `SessaoService` — cifrar antes de salvar
- [ ] Derivar chave AES-256 da senha do usuário via PBKDF2 no `AuthService` (remover chave hardcoded do `CryptoService`)
- [ ] Integrar `DbService` (Dexie.js): salvar dados criptografados localmente antes de tentar sync com backend
- [ ] Registro de sessões com campos: data, horário, observações (criptografado), humor
- [ ] Paginação na listagem de sessões

### Sprint 4: Dashboard
- [ ] Tela de dashboard com gráficos de humor ao longo do tempo
- [ ] Usar `computed()` para descriptografar dados reativamente antes de alimentar gráficos
- [ ] Integração com Camera (Capacitor) para digitalizar documentos

### Sprint 5: Build Capacitor e simulação no celular
1. **Instalar Capacitor**: `npm install @capacitor/core @capacitor/cli`
2. **Inicializar**: `npx cap init` (define nome do app e bundle ID)
3. **Adicionar plataforma Android**: `npm install @capacitor/android && npx cap add android`
4. **Build do Angular**: `npm run build` (gera `dist/`)
5. **Sync para Capacitor**: `npx cap sync android`
6. **Abrir no Android Studio**: `npx cap open android`
7. **Rodar no emulador ou celular físico**: dentro do Android Studio → Run
   - Para celular físico: habilitar **Modo Desenvolvedor** + **Depuração USB** no Android, conectar via USB
   - Backend precisa estar acessível na rede local: trocar `localhost:3000` pela IP da máquina (ex: `192.168.1.x:3000`)

> **Atenção para o Capacitor**: a URL da API em `core/auth/auth.service.ts` e demais services usa `http://localhost:3000`. No celular físico/emulador, `localhost` aponta para o próprio dispositivo. Criar um `environment.ts` com a URL correta para cada ambiente (dev browser vs. Capacitor).

---

## Convenções Gerais

- Idioma do código: **inglês** (nomes de variáveis, métodos, classes).
- Comentários e commits: **português**.
- Nunca use `any` no TypeScript — sempre tipar explicitamente.
- Nunca faça `console.log` de dados clínicos descriptografados.
- Ao concluir uma tarefa, sinalize claramente o que foi feito e o próximo passo sugerido dentro do roadmap.

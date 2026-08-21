# NODUS — Plano de Conversão para Desktop

**Documento de planejamento técnico** — ponte entre o estado atual do código (`nodus-app/CLAUDE.md`) e o escopo aprovado no `NODUS-Relatorio-PI3-Documento-Software-V1.pdf` (Documento de Software V1, entregue 20/08/2026).

Data de referência: 2026-08-20. Sprint 1 (segundo o cronograma do relatório) começa em 24/08 — **faltam 4 dias**.

---

## 1. O que está mudando (resumo executivo)

O relatório não é um incremento do protótipo atual — é um **pivô de arquitetura**. O produto deixa de ser um app mobile com backend remoto multiusuário e passa a ser um **executável desktop de uso individual**, sem servidor, sem internet, com todo o dado clínico cifrado no disco do próprio profissional.

| Dimensão | Estado atual (CLAUDE.md) | Estado alvo (Relatório V1) |
|---|---|---|
| Plataforma | Mobile-first, WebView via Capacitor (Android) | Desktop instalável (Electron), sem alvo mobile nesta fase |
| Backend | Express remoto, porta 3000, acessado por IP na rede | Processo local, mesma máquina, sem tráfego de rede |
| Banco de dados | PostgreSQL 18 (servidor externo) | SQLite embarcado (arquivo único na pasta da aplicação) |
| Persistência local no front | Dexie.js (IndexedDB) como cache offline-first | Deixa de existir — não há mais "offline" a resolver, tudo já é local |
| Sincronização | `NetworkStatusService`, banner "sem conexão", cache-first + sync | Sem sentido no novo modelo — a rede deixa de ser um estado do sistema |
| Autenticação | JWT (8h), múltiplos psicólogos, interceptor Bearer, guard de rota | Login local deriva a chave AES da senha; app é de um único profissional por instalação |
| Modelo de sessão | Campos fixos (`observacoes`, `humor` 1-11, `status`) | Modelos de sessão **configuráveis pelo profissional**, versionados, com campos customizados |
| Documentos | Não existe | Geração de PDF conforme Resolução CFP 06/2019, com modelo de campos selecionáveis |
| Anexos | Não existe | Cofre de arquivos cifrados em disco, metadados no banco |
| Consentimento | Não existe | Entidade própria vinculada ao paciente |
| Distribuição | `npx cap sync android` → Android Studio | Instalador desktop (via Electron), `npm install && npm start` para rodar do código |

**Implicação central**: boa parte do trabalho dos últimos sprints (offline-first com Dexie, banner de rede, integração Capacitor/Android) resolve um problema — "o que fazer quando não há internet" — que **deixa de existir** no novo modelo, porque não há mais servidor remoto para se desconectar. Isso não foi tempo perdido (a lógica de criptografia e os services de domínio são reaproveitáveis), mas o encanamento de sincronização deve ser removido, não adaptado.

---

## 2. Inventário do código atual — aproveitar, adaptar, descartar

### 2.1 Aproveitar quase sem alteração
- `core/services/crypto.ts` — cifra/decifra AES-256, princípio de "nunca salvar texto plano" continua idêntico e é o pilar de RNF01/RNF02.
- `core/services/emocoes.ts` — fonte única das 11 emoções e 5 status; nenhuma mudança de escopo a afeta.
- Componentes de UI (`pages/home-page`, `pages/agenda`, `pages/sections`, `pages/info-paciente`, `components/header`, `components/navbar`) — a camada de apresentação em Angular é explicitamente reaproveitada pelo relatório (Seção 8: "Aproveitamento integral das telas e serviços já desenvolvidos no protótipo").
- Padrão de Signals/Standalone Components e a regra de dependência `pages/`, `components/` → `core/` — mantida.

### 2.2 Adaptar (mudança de implementação, não de conceito)
- `backend/src/modules/*/repository.ts` (paciente, sessao, psicologo) — hoje usam `pg` com placeholders `$1, $2...` e `SERIAL`. Precisam migrar para `better-sqlite3` (**já está no `backend/package.json`, não usado ainda**) com placeholders `?` e `INTEGER PRIMARY KEY AUTOINCREMENT`. É reescrita mecânica, não redesenho.
- `core/auth/auth.service.ts` + `auth.interceptor.ts` + `auth.guard.ts` — o conceito de "logar e derivar a chave AES da senha" permanece (RF04), mas o JWT com expiração de 8h e Bearer token perde sentido quando front e "back" rodam no mesmo processo local, sem fronteira de rede real. Recomendação na Seção 6.
- `paciente.service.ts` / `sessao.service.ts` (frontend) — hoje fazem cache-first com Dexie + fallback de rede. Toda a lógica de "sincronizar quando voltar a conexão" deve sair; o service passa a falar diretamente com o backend local (via HTTP em loopback ou IPC — decisão em aberto, Seção 6.1), que por sua vez já é a fonte única de verdade.

### 2.3 Descartar
- `core/database/db.ts` (Dexie/IndexedDB) e `db.spec.ts` — sem função no novo modelo; o SQLite local já é a única fonte de dados, não há cache de navegador a manter.
- `core/services/network-status.service.ts` e o banner "Sem conexão..." no header — não há mais estado online/offline a refletir.
- Integração Capacitor/Android (`capacitor.config.ts`, pasta `android/`) — fora do escopo desta fase (RF01 define "aplicativo desktop instalável"). Recomenda-se **congelar, não apagar**: manter em uma branch ou deixar parado no repositório, já que pode voltar a ser um canal futuro, mas remover do fluxo de build padrão para não gerar confusão durante os sprints.
- `chart.js` no `package.json` raiz — já foi removido do Home Page ("Removido: gráfico Chart.js de humor" no `grande update.txt`), mas a dependência ainda está listada; é lixo a limpar.
- `src/app/services/sql.service.ts` e `src/app/services/ldap.service.ts` — arquivos-esqueleto vazios (sem uso, sem lógica), provavelmente sobras de experimentação. Não aparecem em nenhuma rota ou import fora de si mesmos. Remover para não confundir quem entrar no código agora.

---

## 3. Arquitetura alvo (conforme Seção 8 do relatório)

```
Máquina do profissional — aplicativo desktop empacotado (Electron)
┌─────────────────────────────────────────────────────────┐
│ Front-end (Angular) — telas, Signals, formulários         │
├─────────────────────────────────────────────────────────┤
│ Back-end local (Node.js/TS) — Auth, Crypto(AES-256),       │
│ Paciente, Sessao, Modelo, Documento, Consentimento, Anexo  │
├──────────────────────────┬──────────────────────────────┤
│ SQLite embarcado (dados)  │ Cofre de anexos (arquivos)    │
└──────────────────────────┴──────────────────────────────┘
        ↓ apenas por ação explícita do usuário
   PDF / Exportação de dados / Cópia de segurança
```

Ponto central da justificativa do relatório: como a chave de criptografia nunca sai da máquina do usuário, um servidor remoto **nunca conseguiria** decifrar o conteúdo clínico para montar relatórios — daí a decisão de colocar tudo no mesmo processo.

### 3.1 Decisão em aberto que o relatório não resolve: front↔back é HTTP local ou IPC?

O diagrama da Seção 8 mostra "eventos da interface" entre as camadas sem especificar o mecanismo. Há duas opções, com trade-off direto no cronograma do Sprint 1:

- **Opção A — manter Express, mas em loopback (`127.0.0.1`), iniciado pelo processo principal do Electron.** O front continua usando `HttpClient` e o `auth.interceptor.ts` quase como está hoje; só troca a porta e o host fixo, e remove CORS multi-origem (não é mais necessário, é o mesmo processo). **Menor esforço de refatoração**, reaproveita ~90% do código de services do frontend.
- **Opção B — IPC nativo do Electron** (`contextBridge` + `ipcMain`/`ipcRenderer`), eliminando o servidor HTTP por completo. Mais "correto" do ponto de vista de Electron (sem stack de rede desnecessária), mas exige reescrever todos os services Angular que hoje chamam `HttpClient`.

**Recomendação**: seguir com a **Opção A** no Sprint 1, dado o prazo de duas semanas e o objetivo explícito da equipe de "reduzir a curva de aprendizado reaproveitando a camada de serviços existente" (justificativa da própria Seção 8.1 para escolher Node.js no back-end). IPC pode ser revisitado depois da entrega funcional, se sobrar tempo — não é bloqueador de nenhuma US do backlog.

---

## 4. Modelo de dados — o que muda

O ERD da Seção 7 introduz três entidades novas que não existem hoje e mudam a superfície da tabela `sessao`:

| Entidade | Está no schema atual? | O que precisa ser criado |
|---|---|---|
| `PROFISSIONAL` | Sim (`psicologo`) | Renomear ou manter alias; sem mudança estrutural relevante |
| `PACIENTE` | Sim | Adicionar `codigo_publico` (identificador não identificável para uso em relatórios/PDF) |
| `SESSAO` | Sim | Adicionar FK para `id_modelo` + `versao` (qual modelo de sessão foi usado) |
| `MODELO_SESSAO` | **Não existe** | Nova tabela — nome, abordagem, versão, ativo, dono (`id_profissional`) |
| `CAMPO_MODELO` | **Não existe** | Nova tabela — campos configuráveis de um modelo (rótulo, tipo, ordem, obrigatório) |
| `VALOR_CAMPO` | **Não existe** | Nova tabela — valor preenchido por sessão para cada campo do modelo (é o dado que alimenta a linha do tempo e o painel) |
| `CONSENTIMENTO` | **Não existe** | Nova tabela — tipo, texto cifrado, aceito_em, revogado_em |
| `DOCUMENTO` | **Não existe** | Nova tabela — tipo, título, conteúdo cifrado, validade, emitido_em |
| `ANEXO` | **Não existe** | Nova tabela — nome + caminho cifrado; conteúdo do arquivo fica no disco, só o metadado no banco |

Nota importante do relatório (Seção 7.2, observação de projeto): os campos configuráveis foram modelados como tabelas (`CAMPO_MODELO`/`VALOR_CAMPO`), **não como uma coluna de texto livre/JSON**, exatamente para permitir consultar a evolução de um mesmo instrumento entre sessões (US11, RF12). Isso é uma decisão de design que vale preservar ao implementar — não simplificar para um blob JSON "para ir mais rápido", porque quebraria a linha do tempo que é um objetivo específico (US11/RF12/RF13).

### 4.1 Migração de dados do protótipo (US02 / RF03)

O protótipo atual grava em PostgreSQL com campos já cifrados em AES-256 (nome, email, data_nascimento do paciente; observações da sessão). Como o esquema de criptografia não muda, a migração é majoritariamente estrutural:

1. Exportar as tabelas atuais (`psicologo`, `paciente`, `sessao`) do Postgres local de desenvolvimento.
2. Popular o novo SQLite mantendo os valores cifrados como estão (não decifrar/recifrar, a menos que a derivação de chave mude — ver Seção 6.2).
3. Sessões existentes não têm `id_modelo` (o conceito não existia) — precisam de um "modelo padrão" retroativo (campo `observacoes` + `humor` + `status`) marcado como `padrao: true` em `MODELO_SESSAO`, para que dados antigos continuem consultáveis pela nova estrutura sem perda.

Isso deve virar um script único (`backend/scripts/migrate-postgres-to-sqlite.ts` ou similar), não uma migration "automática no startup" como as atuais — é uma operação de uma vez, não recorrente.

---

## 5. Sprint 1 (24/08 – 04/09): as primeiras mudanças para o projeto voltar a andar

O backlog (Seção 4.1) define três itens de Alta prioridade para o Sprint 1 — é aqui que a conversão realmente começa:

### US01 — Empacotar a aplicação como programa desktop instalável, com banco embarcado
- [ ] Adicionar `electron`, `electron-builder` como devDependencies (hoje **não estão instalados** — só há uma menção incidental em `package-lock.json`).
- [ ] Criar processo principal (`electron/main.ts`): abre a janela, sobe o backend local em loopback, define caminho do arquivo SQLite dentro da pasta de dados do usuário (`app.getPath('userData')`), implementa o bloqueio automático por inatividade (RF05).
- [ ] Reescrever `backend/src/database/db.ts` para `better-sqlite3` no lugar de `pg` — já está no `package.json` do backend, só falta ser usado.
- [ ] Reescrever `paciente.repository.ts`, `sessao.repository.ts`, `psicologo.repository.ts` trocando dialeto SQL (`$1` → `?`, `SERIAL` → `INTEGER PRIMARY KEY AUTOINCREMENT`).
- [ ] Remover `pg` do `backend/package.json` assim que a troca estiver validada (evita manter duas dependências de banco concorrentes).
- [ ] Ajustar CORS: como front e back passam a rodar na mesma máquina/processo, simplificar `FRONTEND_ORIGIN` (ou remover CORS por completo se migrar para loopback puro sem necessidade de múltiplas origens de dev).

### US02 — Migrar os dados existentes do protótipo para a nova estrutura de banco
- [ ] Script de exportação/importação descrito na Seção 4.1 acima.
- [ ] Definir o "modelo de sessão padrão" retroativo para não perder o histórico já cadastrado durante os testes com a psicóloga atendida.

### US03 — Configurar automação de build, geração de instalador e execução de testes a cada alteração
- [ ] **Não existe CI hoje** (nenhum workflow em `.github/`). Criar pipeline mínimo (GitHub Actions) que rode `npm test` no frontend e nos testes do backend a cada push/PR.
- [ ] Configurar `electron-builder` para gerar o instalador (Windows, já que o time desenvolve/testa em Windows segundo o `grande update.txt`).
- [ ] Cobertura de testes automatizados nos services de domínio — RNF10 exige mínimo de 70% nos serviços de domínio, verificado a cada alteração. Hoje há `.spec.ts` para vários componentes/páginas mas cobertura real não foi medida; vale rodar `ng test --code-coverage` como baseline antes de prometer o número na banca.

---

## 6. Decisões e simplificações recomendadas (para alinhar com o time antes de codar)

1. **Simplificar autenticação**: trocar JWT+Bearer por um modelo mais simples de "sessão desbloqueada em memória" (a chave AES já vive em memória via signal, segundo o `CLAUDE.md`; o JWT de 8h e o interceptor HTTP passam a ser redundantes já que não há mais fronteira de rede real a proteger). Isso reduz complexidade sem violar nenhum RF/RNF do relatório — RF04 só pede autenticação por senha + derivação de chave, não pede JWT.
2. **Confirmar com o time se o app continua "multiusuário por instalação"**: o `CLAUDE.md` atual modela múltiplos psicólogos com `id_psicologo` como FK em tudo. O relatório (Seção 1.1) é explícito: **"O NODUS é uma ferramenta de uso individual... não há perfis de múltiplos usuários"**. Isso simplifica bastante o modelo (posse de dados deixa de precisar de verificação por request), mas é uma decisão de escopo que vale confirmar antes de remover código de multiusuário — pode ser mantido "por baixo" sem UI de troca de usuário, para não fechar a porta a uma versão futura multiperfil.
3. **Congelar, não apagar, a trilha mobile/Capacitor** — reversível e barato de manter parado; caro de refazer do zero se decidirem retomar.
4. **Preparar a base de demonstração com dados fictícios já na Sprint 2**, conforme a própria recomendação do relatório (Seção 10) — evita expor dados reais da paciente atendida durante a banca.

---

## 7. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| `better-sqlite3` é nativo (compilado por plataforma) — pode dar problema ao empacotar com Electron em máquinas diferentes das do time | Alto — quebra o instalador | Validar `electron-builder` + `better-sqlite3` juntos **logo no início do Sprint 1**, não deixar para o Sprint 6 |
| Prazo apertado: Sprint 1 cobre fundação desktop inteira (empacotamento + migração + CI) em 2 semanas, com equipe de 3 pessoas em dedicação parcial | Alto | Critério de dimensionamento do próprio relatório já prevê reserva (RS01-RS12) fora do escopo — não adicionar nada além do backlog planejado |
| Migração de dados pode expor incompatibilidade se a derivação de chave AES mudar junto com o modelo de auth (item 6.1 acima) | Médio — dados antigos ilegíveis | Decidir e testar a derivação de chave **antes** de escrever o script de migração, não em paralelo |
| Cobertura de testes (RNF10, 70%) é um requisito não funcional cobrado formalmente — hoje não há número medido | Médio | Rodar baseline de cobertura já no Sprint 1, para saber a distância real até 70% |

---

## 8. Checklist imediato (antes de 24/08)

- [ ] Alinhar com o time as duas decisões em aberto da Seção 3.1 (HTTP loopback vs IPC) e Seção 6 (modelo de autenticação single-user) — são decisões que mudam a forma de várias tasks do Sprint 1, melhor travar antes do sprint começar.
- [ ] Rodar `ng test --code-coverage` para ter o número real de cobertura hoje.
- [ ] Validar num spike rápido (algumas horas) que `electron-builder` empacota `better-sqlite3` sem dor em Windows — é o maior risco técnico da Sprint 1 e o mais barato de descobrir cedo.
- [ ] Preencher os campos `[PREENCHER]` do relatório (semestre da equipe, link do instalador, credenciais de demonstração) antes da próxima entrega.
- [ ] Depois que o Sprint 1 estabilizar a nova arquitetura, reescrever `nodus-app/CLAUDE.md` para refletir o modelo desktop (hoje ele ainda descreve o modelo mobile/Capacitor/Postgres) — não fazer isso agora, mas não esquecer, porque é a fonte de verdade que orienta qualquer trabalho futuro no repositório.

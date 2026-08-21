# nodus-app — guia de desenvolvimento

Aplicação NODUS: front-end Angular (Signals, standalone components) + backend Node/Express local. Para o pitch do produto e a documentação formal, veja o [README da raiz](../README.md) e a pasta [`docs/`](../docs).

## Pré-requisitos

- Node.js LTS
- Angular CLI (`npm install -g @angular/cli`)

## Instalação

Front-end e backend têm dependências separadas:

```bash
npm install              # a partir de nodus-app/
cd backend && npm install
```

Configure o backend copiando `backend/.env.example` para `backend/.env` (nunca commitar o `.env`).

> `backend/.env.example` ainda reflete o modelo atual (PostgreSQL). Ele será atualizado durante a migração para SQLite embarcado prevista no Sprint 1 — ver [`docs/PLANO-CONVERSAO-DESKTOP.md`](../docs/PLANO-CONVERSAO-DESKTOP.md).

## Rodando em desenvolvimento

```bash
# terminal 1 — backend (porta 3000)
cd backend && npm run dev

# terminal 2 — frontend (porta 4200)
npm start
```

Acesse http://localhost:4200.

## Build

```bash
npm run build       # frontend — gera dist/
cd backend && npm run build   # backend — compila para dist/
```

## Testes

```bash
npm test    # frontend (ng test)
```

O backend ainda não tem uma suíte de testes automatizados unificada — hoje há apenas scripts pontuais (`backend/test-security.js`, `backend/test-sprint5b.js`, rodáveis via `npm run test:security` / `npm run test:sprint5b`). Configurar CI e cobertura de testes é item do backlog do Sprint 1 (US03, ver o plano de conversão).

## Convenções de código

Ver [`CLAUDE.md`](CLAUDE.md) para as regras técnicas do projeto (Signals, estrutura de pastas, regras de criptografia etc.) — em atualização para refletir o modelo desktop.

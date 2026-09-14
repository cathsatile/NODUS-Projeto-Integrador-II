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
npm test              # frontend (ng test)
cd backend && npm test  # backend — vitest (21 testes: auth, middleware, paciente, psicologo, sessao)
cd backend && npm run test:coverage  # backend com relatório de cobertura
```

## Convenções de código

Ver [`CLAUDE.md`](CLAUDE.md) para as regras técnicas do projeto (Signals, estrutura de pastas, regras de criptografia etc.) — em atualização para refletir o modelo desktop.

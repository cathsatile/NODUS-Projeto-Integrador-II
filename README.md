# 🧠 Projeto NODUS - Sistema de Monitoramento Terapêutico
O NODUS é uma solução digital para a gestão de consultórios terapêuticos e clínicas-escola, desenvolvida para o Projeto Integrador II (2026). O foco é oferecer uma ferramenta modulável para que psicólogos acompanhem a evolução de pacientes com precisão e segurança.

## 🚀 Tecnologias Core (Front-End)

- Angular 18+: Uso de Signals para reatividade de alta performance e Standalone Components.
- Capacitor: Integração nativa para hardware (Câmera e Agenda) em modo Mobile-First.
- Dexie.js: Gerenciamento do banco de dados local (IndexedDB).
- Crypto-js: Criptografia de dados sensíveis no lado do cliente.

## 🏗️ Estrutura de Pastas Sugerida

Para manter o projeto organizado para todos os membros (Front, Back e DB), seguiremos este padrão:

~~~
src/app/
├── core/              # Serviços globais, Guards e Interceptores (Segurança)
├── features/          # Funcionalidades do MVP (Pacientes, Sessões, Dashboard)
├── shared/            # Componentes reutilizáveis e Interfaces (Models)
└── assets/            # Imagens, ícones e arquivos estáticos
~~~

## 🛡️ Pilares Técnicos: Por que usar Dexie e Crypto?

Para atender aos requisitos de Segurança (RNF01, RNF02) e Disponibilidade (RNF05), implementamos as seguintes estratégias:

### 1. Dexie.js (Offline-First)

Motivo: Terapeutas precisam registrar observações clínicas (RF06) mesmo sem conexão estável com a internet.

- Performance: Funciona como uma camada sobre o IndexedDB, permitindo consultas rápidas no navegador.
- Resiliência: Os dados são salvos localmente primeiro e sincronizados com o PostgreSQL (Back-end) quando a conexão retornar.

### 2. Crypto-js (Segurança Ética)

Motivo: Dados de saúde mental são ultra-sensíveis. A ética clínica exige proteção máxima contra vazamentos.

- Criptografia Client-side: Os dados sensíveis (notas de sessão, humor, nomes) são criptografados antes de serem armazenados no banco de dados local ou enviados para a API.
- Privacidade: Mesmo que alguém acesse o banco de dados, os textos estarão ilegíveis sem a chave de criptografia correta.

## 👨‍💻 Para Desenvolvedores (Como Rodar)

**Pré-requisitos**
- Node.js (Versão LTS)
- Angular CLI (npm install -g @angular/cli)

**Instalação**

1. Clone o repositório.
2. Na pasta do projeto, rode:

~~~Bash
npm install
~~~

3. Instale as dependências de segurança e banco local:

~~~Bash
npm install dexie crypto-js
npm install --save-dev @types/crypto-js
~~~

**Execução**

- **Front-end**: ng serve (Acesse http://localhost:4200)
- **Sincronizar Mobile**: npx cap sync

## 📝 Regras de Contribuição (Git)

- **Commits**: Use o padrão feat:, fix:, ou docs:.
- **Signals**: Proibido o uso de Variable = value para estados globais; use sempre signal().
- **Modularização**: Lógica de banco e cálculos sempre nos Services; componentes devem apenas exibir dados.
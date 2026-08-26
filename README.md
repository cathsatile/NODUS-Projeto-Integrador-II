# NODUS

**Gestão clínica para psicólogos, com os dados do paciente nunca saindo da máquina do profissional.**

NODUS é uma plataforma para consultórios e clínicas-escola de psicologia: agenda, prontuário de sessões, modelos de atendimento configuráveis e emissão de documentos — rodando localmente, sem servidor remoto, com todo dado clínico cifrado em disco (AES-256).

> 🎓 Nascido como Projeto Integrador (PI2/PI3, 2026). A arquitetura e o roadmap já estão sendo desenhados com o objetivo de evoluir para um produto real — ver [Visão de produto](#visão-de-produto).

---

## Por que o NODUS existe

Dados de saúde mental são extremamente sensíveis, e boa parte das ferramentas de gestão clínica no mercado depende de nuvem/servidor remoto — o que implica confiar dados de pacientes a terceiros. O NODUS parte do princípio oposto: a chave de criptografia nunca sai da máquina do profissional, então nem uma eventual infraestrutura do próprio NODUS conseguiria ler o conteúdo clínico de um usuário.

- **Local-first de verdade** — sem servidor remoto, sem internet necessária, sem sincronização. O profissional é o único dono do dado.
- **Modelos de sessão configuráveis** — cada abordagem terapêutica desenha seus próprios campos de acompanhamento, versionados sessão a sessão (permite consultar a evolução de um mesmo instrumento ao longo do tempo).
- **Documentos e consentimentos** — geração de PDF conforme a Resolução CFP 06/2019, com histórico de consentimento vinculado ao paciente.
- **Segurança como pilar, não feature** — AES-256 em todo dado clínico, cofre de anexos cifrado, bloqueio automático por inatividade.

## Status do projeto

Em pivô de arquitetura: de um protótipo mobile (Capacitor/Android + backend remoto + PostgreSQL) para um **executável desktop de uso individual** (Electron + backend local + SQLite embarcado). Sprint 1 da conversão em andamento.

- [`docs/PLANO-CONVERSAO-DESKTOP.md`](docs/PLANO-CONVERSAO-DESKTOP.md) — racional técnico completo do pivô: o que é aproveitado, adaptado e descartado do protótipo mobile.
- [`docs/NODUS-Relatorio-PI3-Documento-Software-V1.pdf`](docs/NODUS-Relatorio-PI3-Documento-Software-V1.pdf) — documento de software formal (requisitos, backlog, modelo de dados).

A trilha mobile anterior não foi descartada, apenas congelada — preservada na branch `frozen/mobile-capacitor` (detalhes em [`docs/mobile-congelado.md`](docs/mobile-congelado.md)) caso volte a fazer sentido no roadmap.

## Visão de produto

O NODUS começou como trabalho acadêmico, mas o objetivo da equipe é evoluí-lo para um produto comercial voltado a psicólogos autônomos e clínicas-escola. O modelo de monetização (licença por profissional, assinatura, ou outro formato) ainda está em aberto e será tratado como decisão de negócio nas próximas fases — a prioridade atual é consolidar a fundação técnica (empacotamento desktop, banco embarcado, CI) prevista para o Sprint 1.

## Arquitetura (alvo)

```
┌───────────────────────────────────────────────┐
│ Front-end (Angular, Signals) — telas e forms   │
├─────────────────────────────────────────────────┤
│ Back-end local (Node.js/TS) — auth, criptografia,│
│ domínio (paciente, sessão, modelo, documento)    │
├──────────────────────┬────────────────────────────┤
│ SQLite embarcado      │ Cofre de anexos cifrado     │
└──────────────────────┴────────────────────────────┘
```

Tudo empacotado como um único executável desktop via Electron, sem tráfego de rede e sem dependência de conexão.

## Estrutura do repositório

```
.
├── nodus-app/        # aplicação (Angular + backend Node local) — ver nodus-app/README.md
├── docs/             # documentação formal do projeto
└── electron-spike/   # prova de conceito isolada de empacotamento (Electron + SQLite nativo)
```

Para rodar o projeto em desenvolvimento, veja [`nodus-app/README.md`](nodus-app/README.md).

## Documentação

| Documento | Conteúdo |
|---|---|
| [`docs/PLANO-CONVERSAO-DESKTOP.md`](docs/PLANO-CONVERSAO-DESKTOP.md) | Plano técnico do pivô desktop — o que muda, o que é aproveitado, riscos e decisões em aberto |
| [`docs/NODUS-Relatorio-PI3-Documento-Software-V1.pdf`](docs/NODUS-Relatorio-PI3-Documento-Software-V1.pdf) | Documento de software formal (requisitos, backlog, ERD) |
| [`docs/mobile-congelado.md`](docs/mobile-congelado.md) | Por que e onde está a trilha mobile congelada |
| [`nodus-app/CLAUDE.md`](nodus-app/CLAUDE.md) | Guia técnico de desenvolvimento (em atualização para o modelo desktop) |

## Licença

A definir — projeto em transição de trabalho acadêmico para produto comercial.

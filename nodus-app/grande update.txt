================================================================================
NODUS — GRANDE UPDATE
Data: 30/05/2026
================================================================================

Este documento registra todas as alterações realizadas no sistema NODUS durante
a sessão de desenvolvimento de hoje. As mudanças abrangem backend, frontend
Angular e configuração do Capacitor (Android).

================================================================================
1. CORREÇÃO DE CORS E MIXED CONTENT (MOBILE)
================================================================================

Problema:
  O app no celular (Capacitor WebView, origin https://localhost) não conseguia
  chamar o backend (HTTP). O erro era "Mixed Content" bloqueado pelo WebView.

Correções:
  - backend/.env: FRONTEND_ORIGIN agora aceita múltiplas origens separadas por
    vírgula:
      FRONTEND_ORIGIN=http://localhost:4200,https://localhost,capacitor://localhost

  - backend/src/server.ts: CORS reescrito para aceitar lista de origens:
      const allowedOrigins = process.env.FRONTEND_ORIGIN.split(',').map(o => o.trim());

  - capacitor.config.ts: adicionado allowMixedContent: true no bloco android
    para permitir chamadas HTTP dentro do WebView HTTPS.

  - Firewall do Windows: liberada a porta 3000 via New-NetFirewallRule (executado
    manualmente pelo usuário como administrador).

================================================================================
2. BANCO DE DADOS — MIGRATIONS AUTOMÁTICAS
================================================================================

Alterações aplicadas automaticamente no startup do backend (backend/src/database/db.ts):

  - Coluna senha da tabela paciente tornou-se opcional (DROP NOT NULL)
  - Coluna status adicionada à tabela sessao (VARCHAR 50, nullable)
  - Colunas de paciente (nome, email, data_nascimento) alteradas para TEXT
    para suportar strings AES-256 base64

================================================================================
3. REMOÇÃO DA SENHA DO PACIENTE
================================================================================

Motivação: pacientes não fazem login no sistema; a senha era campo desnecessário
e criava fricção no cadastro.

Mudanças:
  - backend: paciente.model.ts — senha virou opcional (senha?: string | null)
  - backend: paciente.repository.ts — INSERT não inclui mais o campo senha
  - frontend: paciente.model.ts — CriarPacienteDto não tem mais o campo senha
  - frontend: add-section-paciente — formulário de cadastro removeu campo senha

================================================================================
4. SISTEMA DE EMOÇÕES CLÍNICAS (emocoes.ts)
================================================================================

Substituída a escala numérica 1-5 por 11 emoções clínicas nomeadas.

Arquivo criado: src/app/core/services/emocoes.ts

Emoções disponíveis:
  1  - Alegre         (😊)
  2  - Confiante      (💪)
  3  - Esperançoso    (🌟)
  4  - Tranquilo      (😌)
  5  - Ansioso        (😰)
  6  - Confuso        (😕)
  7  - Existencialista(🤔)
  8  - Frustrado      (😤)
  9  - Nervoso        (😬)
  10 - Sobrecarregado (😩)
  11 - Triste         (😢)

Status de sessão disponíveis:
  realizada            - Sessão realizada
  cancelada_paciente   - Cancelado pelo paciente
  cancelada_psicologo  - Cancelado pelo psicólogo
  nao_compareceu       - Paciente não compareceu
  remarcada            - Sessão remarcada

Funções exportadas: emocaoLabel(), emocaoEmoji(), statusLabel()
Todos os componentes que exibem humor/status usam este módulo centralizado.

================================================================================
5. CAMPO STATUS NA SESSÃO
================================================================================

Backend:
  - sessao.model.ts: adicionado status?: string
  - sessao.repository.ts: status incluído nas colunas, no UPDATE com COALESCE

Frontend:
  - sessao.model.ts: adicionado status?: string
  - sessao.service.ts: método update() persiste o status também no Dexie.js local

================================================================================
6. OFFLINE-FIRST COM DEXIE.JS
================================================================================

PacienteService:
  - Suporte completo offline: cache-first (lê do Dexie, sincroniza em background)
  - Métodos decifrarLocal() e atualizarCacheLocal() para persistência criptografada
  - create/update/delete também gravam localmente

SessaoService:
  - update() persiste status, humor e observacoes no IndexedDB via Dexie

Schema do Dexie atualizado para v3:
  sessoes: '++id, id_sessao, id_psicologo, id_paciente, data'

NetworkStatusService (criado):
  - Signal isOnline que detecta eventos online/offline do browser em tempo real

================================================================================
7. REDESIGN DA HOME PAGE
================================================================================

Removido: gráfico Chart.js de humor

Adicionado:
  - Card de boas-vindas com nome do psicólogo e contagem de sessões do dia
  - Grid com atalhos: nova sessão, novo paciente, contador de pacientes e sessões/mês
  - Seção "Emoções do último mês": top 3 emoções com barras de progresso e percentual
  - Seção "Sessões de hoje": lista apenas sessões do dia atual (ordenadas por horário)

Marcação de status nas sessões de hoje:
  - Botões "Realizada" e "Não ocorreu" aparecem SOMENTE após o horário da sessão
    ter passado (verifica data + hora atual)
  - Antes do horário: badge "Agendada"
  - Após marcar: badge colorido com o status registrado

================================================================================
8. MELHORIAS NO FORMULÁRIO DE NOVA SESSÃO
================================================================================

Componente: add-section-paciente

  - Stepper removido; formulário único e direto
  - Campo de emoção aparece SOMENTE quando a data E o horário preenchidos já
    passaram (verifica datetime completo: new Date(`${data}T${horario}:00`) <= now)
  - Paciente sem senha no formulário de cadastro
  - Seleção de emoção usa as 11 emoções clínicas do emocoes.ts

================================================================================
9. TELA DE SESSÕES — FILTRO E NOVA ABA
================================================================================

Componente: sections

Adicionado:
  - Campo de busca por nome de paciente (filtra todas as abas simultaneamente)
  - Nova aba "Não realiz.": sessões com status diferente de 'realizada'
    (canceladas, não compareceu, remarcadas)

Atualizado:
  - statusDe() agora usa o campo status real da sessão ao invés de apenas
    comparar datas
  - classStatus() gera a classe CSS correta para cada tipo de status
  - Badges coloridos para todos os status:
      Agendada          → amarelo
      Realizada         → verde
      Cancelada         → vermelho
      Não compareceu    → âmbar
      Remarcada         → azul

================================================================================
10. AGENDA — MARCADORES VISUAIS NO CALENDÁRIO
================================================================================

Visuais implementados via ::ng-deep no agenda.scss:

  - Hoje:       borda quadrada vermelha ao redor do número (border-radius: 4px)
  - Selecionado: sublinhado no número, sem fundo preenchido
  - Com sessão: ponto laranja (#ff8c00) abaixo do número do dia

================================================================================
11. AGENDA — SESSÕES INLINE (SEM MODAL)
================================================================================

Problema anterior: modal abria mas não exibia as sessões do dia selecionado
(bug de comparação de timezone entre slice(0,10) e toDateKey()).

Solução adotada: substituição do modal por componente inline abaixo do calendário.

Como funciona agora:
  - Ao clicar em qualquer dia, um card aparece abaixo do calendário
  - Exibe: nome do dia em português (ex: "quarta-feira, 28/05/2026"), horário,
    nome do paciente, emoção registrada, badge de status
  - Se não houver sessões no dia: mensagem "Nenhuma sessão neste dia"
  - Comparação de datas usa toDateKey(new Date(s.data)) em ambos os computeds
    (diasComSessao e sessoesDia) para consistência de fuso horário
  - Nome do dia gerado via array estático no componente (sem dependência de
    locale pt-BR não registrado no Angular)

================================================================================
12. HEADER — BANNER OFFLINE E NAVEGAÇÃO PARA PERFIL
================================================================================

  - Banner "Sem conexão..." aparece automaticamente quando o dispositivo fica
    offline (usa NetworkStatusService)
  - Botão de iniciais do psicólogo navega para a tela de perfil

================================================================================
13. TELA DE INFORMAÇÕES DO PACIENTE
================================================================================

  - Lista sessões do paciente com emoção (emoji + label) e status usando o
    módulo emocoes.ts centralizado
  - Ordenação por data decrescente (mais recente primeiro)

================================================================================
14. AMBIENTES E BUILD
================================================================================

  - environment.ts e environment.prod.ts criados com apiUrl por ambiente
  - angular.json: fileReplacements configurado para produção
  - Orçamento CSS ajustado: anyComponentStyle até 8kB (era 6kB)
  - allowedCommonJsDependencies: ['crypto-js'] para evitar warnings no build

================================================================================
15. SINCRONIZAÇÃO COM ANDROID
================================================================================

Fluxo executado ao final:
  1. npm run build  →  gera dist/ sem erros ou warnings
  2. npx cap sync android  →  copia assets para android/app/src/main/assets/public

App pronto para teste no celular via Android Studio ou npx cap run android.
Backend deve estar rodando em cd backend && npm run dev.

================================================================================
ARQUIVOS MODIFICADOS — RESUMO
================================================================================

Backend:
  backend/.env
  backend/src/server.ts
  backend/src/database/db.ts
  backend/src/modules/paciente/paciente.model.ts
  backend/src/modules/paciente/paciente.repository.ts
  backend/src/modules/sessao/sessao.model.ts
  backend/src/modules/sessao/sessao.repository.ts

Frontend — Core:
  src/app/core/services/emocoes.ts               (NOVO)
  src/app/core/services/sessao.model.ts
  src/app/core/services/sessao.service.ts
  src/app/core/services/paciente.model.ts
  src/app/core/services/paciente.service.ts
  src/app/core/services/network-status.service.ts (NOVO)
  src/app/core/database/db.ts

Frontend — Componentes:
  src/app/components/header/header.ts
  src/app/components/header/header.html
  src/app/components/add-section-paciente/add-section-paciente.ts
  src/app/components/add-section-paciente/add-section-paciente.html
  src/app/components/sessoes-dia/sessoes-dia.ts   (criado, não mais usado)
  src/app/components/sessoes-dia/sessoes-dia.html
  src/app/components/sessoes-dia/sessoes-dia.scss

Frontend — Páginas:
  src/app/pages/home-page/home-page.ts
  src/app/pages/home-page/home-page.html
  src/app/pages/home-page/home-page.scss
  src/app/pages/agenda/agenda.ts
  src/app/pages/agenda/agenda.html
  src/app/pages/agenda/agenda.scss
  src/app/pages/sections/sections.ts
  src/app/pages/sections/sections.html
  src/app/pages/sections/sections.scss
  src/app/pages/pacientes/pacientes.ts
  src/app/pages/pacientes/pacientes.html
  src/app/pages/info-paciente/info-paciente.ts
  src/app/pages/principal.routes.ts

Configuração:
  capacitor.config.ts
  angular.json
  src/environments/environment.ts               (NOVO)
  src/environments/environment.prod.ts          (NOVO)

================================================================================

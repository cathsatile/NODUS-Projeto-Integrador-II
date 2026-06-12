# Guia de Demo — NODUS no iPhone

> Para o colega que vai apresentar o app para a cliente.  
> Siga os passos na ordem. Leva menos de 15 minutos para configurar tudo.

---

## Antes de chegar na cliente

Faça essa parte em casa ou no caminho, com calma.

### 1. Fazer o deploy do app no Netlify (você gerencia isso)

Você vai criar a conta e hospedar o app. É gratuito e leva menos de 5 minutos.

1. Acessa **netlify.com** e clica em **"Sign up"**
2. Escolhe **"Sign up with GitHub"** e autoriza o acesso
3. Na dashboard, clica em **"Add new site"** → **"Import an existing project"**
4. Escolhe **GitHub** e seleciona o repositório **`NODUS-Projeto-Integrador-II`**
5. Preenche as configurações de build:
   - **Branch:** `feat/pwa-ios-client`
   - **Base directory:** `nodus-app`
   - **Build command:** `npm run build`
   - **Publish directory:** `dist/nodus-app/browser`
6. Clica em **"Deploy site"**
7. Aguarda 1-2 minutos — o Netlify gera uma URL no formato `https://nome-aleatório.netlify.app`

> Você pode personalizar o nome da URL em Site Settings → Domain → Change site name, por exemplo `nodus-demo.netlify.app`.

Guarda essa URL — você vai usar no passo seguinte.

### 2. Instalar o app no iPhone

1. Abra o **Safari** (não o Chrome, não o Firefox — tem que ser o Safari mesmo)
2. Acesse a URL que o Netlify gerou (ex: `https://nodus-demo.netlify.app`)
3. Toque no botão **Compartilhar** — é o ícone de quadrado com uma seta para cima, na barra inferior do Safari
4. Role a lista para baixo e toque em **"Adicionar à Tela de Início"**
5. Deixa o nome como **NODUS** e toque em **"Adicionar"**

Agora o app aparece na tela inicial do iPhone igual a um app normal.

### 3. Criar a conta de demonstração

1. Abra o NODUS pela tela inicial (não pelo Safari)
2. Toque em **"Cadastrar"**
3. Preencha com dados fictícios para a demo:
   - **Nome:** seu nome ou um nome qualquer
   - **E-mail:** qualquer e-mail (ex: `demo@nodus.app`)
   - **Senha:** algo fácil de lembrar na hora (ex: `Demo@2026`)
   - **Registro profissional:** qualquer número (ex: `CRP-12345`)
4. Toque em **"Cadastrar"**

> O app vai esperar 5 segundos tentando conectar com o servidor e depois vai criar a conta **localmente, sem internet**. Isso é normal e intencional — o app funciona offline por design.

### 4. Popular o app com dados de demo

Depois de entrar, cadastre alguns pacientes e sessões para a tela não aparecer vazia na hora da apresentação. Quanto mais parecido com uso real, melhor a impressão.

**Sugestão de pacientes para cadastrar:**
- Ana Costa, 34 anos
- Carlos Lima, 28 anos
- Mariana Oliveira, 45 anos

**Sugestão de sessões para cadastrar:**
- 2 ou 3 sessões no dia de hoje (assim aparecem na home como "sessões de hoje")
- 1 sessão ontem marcada como "Realizada"
- 1 sessão ontem marcada como "Não compareceu"
- Algumas sessões nos próximos dias (aparecem no calendário da Agenda)

---

## Na hora de apresentar para a cliente

### Roteiro sugerido (15–20 minutos)

**1. Mostre que é um app, não um site**
- Abra pela tela inicial — o iPhone não vai mostrar a barra do Safari
- Mostre que tem ícone próprio na tela inicial

**2. Tela de Login**
- Logue com o e-mail e senha que você cadastrou
- Destaque: "funciona sem internet, os dados ficam no próprio aparelho"

**3. Home — visão geral do dia**
- Mostre as sessões de hoje com horário
- Mostre os cards de atalho (novo paciente, nova sessão, etc.)
- Mostre o gráfico de emoções do último mês se tiver dados

**4. Pacientes**
- Mostre a lista de pacientes cadastrados
- Abra um paciente e mostre o histórico de sessões
- Destaque a emoção registrada em cada sessão

**5. Agenda**
- Mostre o calendário com os pontos laranjas nos dias que têm sessão
- Toque em um dia e mostre as sessões aparecendo logo abaixo
- Mostre o botão de nova sessão

**6. Sessões**
- Mostre as abas: Todas, Realizadas, Agendadas, Não realizadas
- Mostre o campo de busca filtrando por nome de paciente
- Se tiver uma sessão de hoje que já passou do horário, mostre os botões "Realizada / Não ocorreu"

**7. Perfil do psicólogo**
- Mostre que o nome aparece corretamente

---

## O que **não** mostrar ou evitar

| Situação | O que fazer |
|---|---|
| Perguntar "e o backup?" | Backup nativo funciona só no Android por enquanto. No iPhone, está planejado para a próxima versão. |
| App travar ou demorar no login | É o timeout de 5s tentando conectar com o servidor — explica que é comportamento esperado no modo demo |
| Pergunta sobre sincronização com outros dispositivos | "A sincronização em nuvem está prevista — agora os dados ficam seguros e criptografados no dispositivo" |
| Tela branca ao abrir pela primeira vez | Feche o app e abra de novo. Se persistir, feche o Safari e tente de novo. |

---

## Dúvidas técnicas rápidas

**"Os dados estão seguros?"**
> Sim. Todos os dados clínicos (notas, prontuários, emoções) são criptografados com AES-256 antes de serem salvos. Ninguém consegue ler mesmo que acesse o dispositivo.

**"Funciona sem internet?"**
> Sim, completamente. O app foi projetado para funcionar offline. A sincronização com o servidor é secundária.

**"Vai ter versão no App Store?"**
> Essa é a versão de testes. A versão final vai passar pelo processo de publicação na App Store.

**"Posso adicionar pacientes reais agora?"**
> Para fins de demo, melhor não. Use dados fictícios e apague depois.

---

## Se algo der errado

- **App não abre:** Feche completamente pelo gerenciador de apps e abra de novo
- **Tela branca:** Vá até as configurações do Safari, limpe o cache, reinstale o app (remova da tela inicial e refaça o passo 1)
- **Erro no cadastro:** Tente com outro e-mail — e-mails já usados ficam salvos localmente
- **Precisar resetar tudo:** Remova o app da tela inicial, vá em Configurações → Safari → Avançado → Dados de Sites → delete o NODUS, e repita a instalação

---

*Qualquer problema, chama o Davi antes da apresentação.*

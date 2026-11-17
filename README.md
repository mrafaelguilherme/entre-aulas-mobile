# Entre Aulas — Tech Challenge Fase 4

[![CI](https://github.com/mrafaelguilherme/entre-aulas-mobile/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/mrafaelguilherme/entre-aulas-mobile/actions/workflows/ci.yml)

Aplicativo mobile do blog educacional **Entre Aulas**: professores publicam, alunos leem e comentam, e um usuário master administra as contas. Este repositório reúne o **app em React Native** (Expo), construído nesta fase, e a **API REST** (NestJS + MongoDB), evoluída das fases 2 e 3 com as correções de segurança apontadas nas avaliações anteriores.

> **Rafael Guilherme Martins — RM 372843**
> Pós Tech FIAP · Full Stack Development · Fase 4

**Comece por aqui:** `node scripts/setup-env.mjs`, depois `docker compose up --build -d` e, na pasta `mobile`, `npx expo start --android`. O passo a passo está em [Como rodar](#como-rodar).

---

## Índice

1. [Acesso de demonstração](#acesso-de-demonstração)
2. [O que o sistema faz](#o-que-o-sistema-faz)
3. [Como rodar](#como-rodar)
4. [Variáveis de ambiente](#variáveis-de-ambiente)
5. [Arquitetura](#arquitetura)
6. [Modelo de acesso](#modelo-de-acesso)
7. [Guia de uso por perfil](#guia-de-uso-por-perfil)
8. [Segurança](#segurança)
9. [Testes e qualidade](#testes-e-qualidade)
10. [Integração contínua e Docker](#integração-contínua-e-docker)
11. [Decisões](#decisões)
12. [Limitações conhecidas](#limitações-conhecidas)
13. [Documentação](#documentação)

---

## Acesso de demonstração

O `docker compose up` cria o master e roda o `seed`, que cadastra as contas abaixo pela própria API, com 11 posts e 5 comentários. As senhas valem **só para demonstração** e estão no `.env.example`.

| Perfil | E-mail | Senha | Para que serve |
|---|---|---|---|
| **Master** | `master@entreaulas.com.br` | `master-entre-aulas-2026` | Administra tudo: aceita convites, exclui e restaura contas, redefine senhas |
| Professora | `ana@escola.com.br` | `demo-entre-aulas-2026` | Dona de 6 posts. Convidou a Marina |
| Professor | `carlos@escola.com.br` | `demo-entre-aulas-2026` | Dono de 5 posts, para mostrar a regra de posse |
| Aluna | `beatriz@escola.com.br` | `demo-entre-aulas-2026` | Comenta e apaga os próprios comentários |
| Aluna | `lia@escola.com.br` | `demo-entre-aulas-2026` | Primeiro acesso: o app exige a troca da senha antes de qualquer coisa |
| Professora convidada | `marina@escola.com.br` | sem acesso até o master aceitar | Convite pendente na aba Professores |
| Aluno excluído | `caio@escola.com.br` | sem acesso até o master restaurar | Aparece em Contas excluídas |

**Comece pelo master.** O enunciado fala em professores que editam e excluem outros professores. Aqui, quem faz isso é o master, um professor com permissão extra; um professor comum convida um colega e edita só o próprio cadastro. Entrando como master, você vê todas as telas e todas as ações.

Depois de aceitar a Marina ou restaurar o Caio, a senha deles é `demo-entre-aulas-2026-provisoria`, e o app pede a troca no primeiro acesso.

Sem login, qualquer pessoa lê e busca os posts e lê os comentários.

---

## O que o sistema faz

Cada requisito do enunciado e onde ele está.

| # | Requisito funcional | Onde | Quem |
|---|---|---|---|
| 1 | Lista de posts com título, autor, descrição e busca | Aba **Posts** | Todos |
| 2 | Leitura do post com comentários | Tela **Leitura** | Todos leem; logados comentam |
| 3 | Criar post | **Novo post**, pela aba Gerenciar | Professor e master |
| 4 | Editar post | **Editar post** | Só quem criou |
| 5 | Cadastrar professor | **Cadastrar professor**: convite (professor) ou direto (master) | Professor e master |
| 6 | Editar professor | **Editar professor** | Master, ou o próprio cadastro |
| 7 | Lista paginada de professores, com editar e excluir | Aba **Professores** | Professor e master; excluir é do master |
| 8 | O mesmo para alunos | Aba **Alunos**, Cadastrar e Editar aluno | Professor e master |
| 9 | Administração dos posts | Aba **Gerenciar** | Professor e master |
| 10 | Login e telas protegidas | Aba **Entrar** e navegação por perfil | Todos |

| Requisito técnico | Como foi atendido |
|---|---|
| React Native com hooks e componentes funcionais | Todo o app em `mobile/src`, sem componente de classe |
| Estilização | Direção visual "Lousa": faixa escura no topo com canaleta de giz, fonte Atkinson Hyperlegible, paleta de contraste AA |
| Integração com a API REST | `axios` com interceptors em `mobile/src/api/client.ts`; toda regra de permissão é garantida pela API |
| Gerenciamento de estado | Context API: `AuthContext` (sessão) e `PendingInvitesContext` (convites pendentes) |
| Acessibilidade | Alvos de toque de 48, rótulos e estados para leitor de tela, erros ligados aos campos |
| Documentação | Este README, [docs/DOCUMENTACAO.md](docs/DOCUMENTACAO.md) e [requests.http](requests.http) |

Comentários são opcionais no enunciado e **entraram no escopo**: eles dão sentido ao login do aluno, que de outro modo só leria.

---

## Como rodar

**Pré-requisitos**

| Ferramenta | Versão | Observação |
|---|---|---|
| Node.js | 24.22.2 | Fixada em `.nvmrc` |
| Docker Desktop | atual | Sobe MongoDB, API e seed |
| Android Studio | atual | Só para o emulador. Crie um dispositivo virtual com Google APIs (testado no Medium Phone, API 37) |
| `ANDROID_HOME` e `PATH` | | `ANDROID_HOME` aponta para o SDK do Android, e `platform-tools` e `emulator` estão no `PATH` |

### 1. Gerar o `.env` e subir a API

```powershell
node scripts/setup-env.mjs
docker compose up --build -d
docker compose ps
```

O script copia o `.env.example` para `.env` e troca cada `__GERAR__` por um segredo aleatório. O compose sobe o MongoDB com usuário e senha, a API na porta 3000 e o serviço `seed`, que roda uma vez, depois que a API responde, e cria os dados de demonstração. Com `ENABLE_API_DOCS=true` no `.env`, o Swagger fica em <http://localhost:3000/api>.

Para recomeçar do zero, apagando o banco:

```powershell
docker compose down -v
docker compose up --build -d
```

### 2. Ligar o emulador e abrir o app

```powershell
# Em um terminal, deixe o emulador ligado (ou inicie pelo Android Studio)
emulator -avd Medium_Phone_API_37.0

# Em outro terminal, na pasta do projeto
adb reverse tcp:3000 tcp:3000
cd mobile
npm ci
npx expo start --android
```

Na primeira vez, o Expo instala o Expo Go no emulador e abre o app. `adb reverse` liga a porta 3000 do emulador à porta 3000 do computador; sem ele, `localhost` dentro do emulador é o próprio emulador. O comando vale até o emulador desligar.

### 3. Chamar a API direto

`requests.http` tem um exemplo de cada rota, incluindo os ataques bloqueados. Abra no VSCode com a extensão **REST Client** (`humao.rest-client`) e clique em "Send Request".

### Portas

| Serviço | Porta | Observação |
|---|---|---|
| API | 3000 | Publicada para o emulador, o Swagger e o `requests.http` |
| MongoDB | interna | Não publicada; só a API chega nele |
| Expo (Metro) | 8081 | Servidor de desenvolvimento do app |

Se a porta 3000 estiver ocupada por outro compose, pare-o antes: `docker compose ls` mostra o que está no ar.

---

## Variáveis de ambiente

### `.env` (raiz, usado pelo compose)

| Variável | Padrão no `.env.example` | Para quê |
|---|---|---|
| `JWT_SECRET` | `__GERAR__` | Assina os tokens. Mínimo de 32 caracteres; a API recusa valor curto |
| `MONGO_USER`, `MONGO_PASSWORD` | `entreaulas`, `__GERAR__` | Credenciais do MongoDB |
| `MASTER_EMAIL`, `MASTER_PASSWORD` | `master@entreaulas.com.br`, `master-entre-aulas-2026` | A API cria o master ao subir, se ele não existir |
| `SEED_PASSWORD` | `demo-entre-aulas-2026` | Senha das contas de demonstração |
| `ENABLE_API_DOCS` | `true` | Liga o Swagger em `/api`. Padrão da API é desligado |

O `.env` **não vai para o Git**. O `.gitignore` o exclui, e o `.env.example` guarda só valores de demonstração e marcadores `__GERAR__`.

### `mobile/.env` (opcional)

| Variável | Padrão | Para quê |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `http://localhost:3000` | Endereço da API |

O prefixo `EXPO_PUBLIC_` embute o valor no pacote do app. Por isso, essa variável guarda só um endereço, nunca um segredo. Fora do modo de desenvolvimento, o app recusa um endereço `http://`: um app publicado que falasse HTTP mandaria o token em texto aberto pela rede.

---

## Arquitetura

```text
App React Native (Expo Go no emulador)
   │  HTTPS em produção; HTTP local via adb reverse
   │  Authorization: Bearer <JWT>
   ▼
API NestJS (porta 3000) ──▶ MongoDB 8 (rede interna do Docker)
```

**O app chama a API direto, sem BFF.** Na Fase 3, a interface web tinha uma camada intermediária (BFF) para manter o token em um cookie `httpOnly`, fora do alcance do JavaScript do navegador. Em um app nativo, o problema não existe do mesmo jeito: o token fica no `expo-secure-store`, cifrado pelo sistema do aparelho, e não há JavaScript de terceiros na mesma origem. Uma camada a mais só adicionaria um serviço para manter.

**Toda regra vale na API.** O app esconde ou mostra ações conforme o perfil (`mobile/src/permissions/index.ts`), mas isso é conforto, não segurança. Cada requisição protegida passa por dois guards globais: o `AuthGuard` valida o JWT, carrega o usuário do banco e confere `status` e `tokenVersion`; o `RolesGuard` confere o perfil, que vem do banco e não do token. Só rotas marcadas com `@Public()` abrem sem login, então uma rota esquecida fica fechada.

### Estrutura do repositório

| Pasta | O que é |
|---|---|
| `api/` | API NestJS 12, Mongoose 9, Zod 4. Módulos `auth`, `users` (professores, alunos e master em uma coleção), `posts` (posts e comentários) e `shared` (guards, pipes, filtros, interceptor de auditoria, senha) |
| `mobile/` | App Expo SDK 58. `src/api` (chamadas), `src/contexts` (sessão e convites), `src/navigation` (abas por perfil), `src/screens` (11 telas), `src/components`, `src/permissions`, `src/theme` |
| `scripts/` | `setup-env.mjs` gera o `.env`; `seed.mjs` cria os dados de demonstração pela API |
| `docs/` | [Documentação técnica](docs/DOCUMENTACAO.md) |
| `.github/` | CI com quatro trabalhos e Dependabot semanal |

### Fluxo de uma requisição protegida

```text
Tela ─▶ api/*.ts ─▶ axios (interceptor cola o Bearer) ─▶ AuthGuard ─▶ RolesGuard ─▶ Pipes (id e Zod) ─▶ Controller ─▶ Service ─▶ Repository ─▶ MongoDB
                   ◀── 401 em requisição com token: o app apaga a sessão e avisa "Sua sessão expirou"
```

---

## Modelo de acesso

Existe um só master, que é um professor com permissão extra. Quem não tem login só lê.

| Ação | Sem login | Aluno | Professor | Master |
|---|---|---|---|---|
| Ler e buscar posts, ler comentários | Sim | Sim | Sim | Sim |
| Comentar | Não | Sim | Sim | Sim |
| Apagar comentários | Não | Só os próprios | Qualquer um | Qualquer um |
| Criar post | Não | Não | Sim | Sim |
| Editar post | Não | Não | Só os próprios | Só os próprios |
| Excluir post | Não | Não | Só os próprios | Qualquer um |
| Listar professores | Não | Não | Sim | Sim |
| Cadastrar professor | Não | Não | Convite pendente | Direto |
| Aceitar ou recusar convite | Não | Não | Não | Sim |
| Editar professor | Não | Não | Só o próprio cadastro | Sim |
| Excluir ou restaurar professor | Não | Não | Não | Sim, menos a si mesmo |
| Criar, listar, editar e excluir alunos | Não | Não | Sim, sem mexer na senha | Sim |
| Restaurar aluno excluído | Não | Não | Não | Sim |
| Redefinir senha de outra pessoa | Não | Não | Não | Sim |
| Trocar a própria senha | Não | Sim | Sim | Sim |

Cada célula dessa tabela tem um teste de ponta a ponta em `api/test/permissions.e2e-spec.ts`, com guards reais e banco em memória. A tabela completa, com o ataque que cada regra bloqueia, está em [docs/DOCUMENTACAO.md](docs/DOCUMENTACAO.md#4-permissões).

**Por que só quem criou edita:** a avaliação da Fase 3 apontou que qualquer professor conseguia editar ou excluir o post de outro, porque o post não guardava o id do autor. Agora o post guarda `authorId`, preenchido pelo token, e a API compara ids. Nem o master edita o post de outra pessoa; ele só exclui, para moderar.

---

## Guia de uso por perfil

**Visitante.** Abre o app na aba Posts: lista com título, data, autor e começo do texto. A busca procura no título, no autor e no conteúdo. Tocar em um post abre a leitura, com os comentários. Para comentar, o app pede login.

**Aluno.** Entra pela aba Entrar. Ganha a aba Conta, com nome, e-mail, perfil, troca de senha e Sair. Na leitura, comenta e apaga os próprios comentários. Não vê Gerenciar, Professores nem Alunos, e essas telas nem são registradas na navegação.

**Primeiro acesso.** Toda conta criada por outra pessoa nasce com troca de senha obrigatória. O app abre só a tela Trocar senha, com um botão Sair. Depois da troca, entra de novo com a senha nova e cai nas abas normais. A Lia demonstra esse fluxo.

**Professor.** Além do que o aluno faz, tem as abas Gerenciar, Professores e Alunos. Em Gerenciar, cria posts e vê o lápis e a lixeira só nos próprios posts; nos dos outros, aparece a frase "Só quem criou o post pode editar." Em Professores, convida um colega (o convite fica pendente) e edita só o próprio cadastro. Em Alunos, cadastra, edita e exclui.

**Master.** Vê tudo o que o professor vê. Em Professores, aceita ou recusa convites (a aba mostra o número de pendentes), cadastra direto, edita e exclui qualquer professor, menos a si mesmo. Em Gerenciar, exclui qualquer post. Em Conta, abre Contas excluídas, onde restaura professores e alunos. Ao editar uma pessoa, pode redefinir a senha dela, que passa a exigir troca no próximo login.

---

## Segurança

As avaliações das fases anteriores apontaram dois problemas: o post sem dono e o token no `localStorage`. A análise do código antigo com as recomendações do OWASP achou outros. O que mudou:

| Problema nas fases anteriores | Correção nesta fase |
|---|---|
| Post sem dono | `authorId` vem do token; só o criador edita; o criador ou o master exclui |
| Token no `localStorage` | Token no `expo-secure-store`, cifrado pelo sistema do aparelho |
| Cadastro público de professor | Rota protegida: professor convida, master aceita ou cadastra direto |
| Token valia 8 horas, mesmo após excluir a conta | Validade de 1 hora; o guard consulta o banco e confere `status` e `tokenVersion` a cada requisição. Sair, trocar senha, excluir ou redefinir invalida os tokens na hora |
| Segredo fraco com valor padrão | Mínimo de 32 caracteres; `setup-env.mjs` gera segredos aleatórios; o compose recusa subir sem eles |
| bcrypt com custo 8 e senha de 6 caracteres | Argon2id (19 MiB, 2 iterações); senha de 15 a 128 caracteres |
| Login sem limite | Bloqueio da conta por 15 minutos após 5 falhas; limite por IP com `@nestjs/throttler` no login e nos comentários |
| Tempo de resposta revelava e-mail existente | Hash fictício para e-mail inexistente; erro único para conta inexistente, senha errada, pendente ou excluída |
| Algoritmo do JWT não fixado | Só `HS256`, com `issuer` e `audience` conferidos; claims só `sub` e `ver` |
| Campos sem limite e `createdAt` vindo do cliente | `z.strictObject` em todo corpo e query, com limites de tamanho; campo extra devolve 400; a API carimba as datas |
| Erro interno sem registro e `console.log` | Logger do Nest; falha de login registrada sem senha nem token; interceptor registra toda escrita do master (método, rota, ator e id, nunca o corpo) |
| Sem cabeçalhos de segurança; Swagger sempre aberto | `app.useSecurityHeaders()`; Swagger só com `ENABLE_API_DOCS=true` |
| MongoDB sem senha e com porta publicada | Usuário e senha no `.env`; porta não publicada |
| 14 vulnerabilidades em dependências | Versões atualizadas; `npm audit --omit=dev --audit-level=high` na CI; Dependabot semanal |

No app: nenhum log de token, senha ou dado pessoal; campos de senha com `secureTextEntry`; o app recusa `http://` fora do desenvolvimento; um 401 em requisição autenticada apaga o token e avisa; sair apaga o token do aparelho e chama `POST /auth/signout`.

Os detalhes, com os arquivos e os testes de cada item, estão em [docs/DOCUMENTACAO.md](docs/DOCUMENTACAO.md#6-correções-em-relação-às-fases-anteriores).

---

## Testes e qualidade

| Onde | Quantidade | O que cobre |
|---|---|---|
| `api/` unitários (Jest) | 64 testes, 11 suítes | Serviços, guards, pipes, filtro, interceptor, senha, validação do ambiente |
| `api/` ponta a ponta (Jest + supertest + MongoDB em memória) | 120 testes, 8 suítes | Matriz de permissões completa, autenticação, bloqueio, token antigo, campos extras, cabeçalhos, limites de taxa, logs |
| `mobile/` (Jest + Testing Library) | 161 testes, 26 suítes | Cliente da API, sessão, permissões, abas por perfil, componentes, as 11 telas com pilha de navegação real |
| `scripts/` (`node --test`) | 3 testes | Geração do `.env` |

```powershell
# API (a partir da pasta do projeto)
cd api
npm ci              # só na primeira vez
npm test            # unitários
npm run test:cov    # com cobertura; os limites reprovam o build (40% linhas, 60% decisões)
npm run test:e2e    # ponta a ponta
npm run lint
cd ..

# App (a partir da pasta do projeto)
cd mobile
npm ci              # só na primeira vez; já feito em "Como rodar"
npm test
npm run typecheck
npm run lint
cd ..

# Scripts (na pasta do projeto)
node --test "scripts/*.test.mjs"
```

O `npm ci` da pasta `api` também serve para abrir o código da API no VSCode sem avisos de módulo não encontrado. A API em si roda no Docker, que instala as dependências dentro da imagem.

A cobertura unitária da API fica em 44% das linhas e 70% das decisões. O número é baixo de propósito: a regra de negócio é coberta pelos testes de ponta a ponta, que exercitam guards, pipes e banco de verdade, em vez de dublês.

**Auditoria de dependências.** `npm audit --omit=dev` na API: 0 achados. No app: 3 achados moderados em `minimatch`, trazido por `@expo/fingerprint` dentro do pacote `expo`. É ferramenta de build do Expo, não entra no app instalado, e a única correção disponível seria voltar ao Expo 52. A CI reprova só achados altos ou críticos.

---

## Integração contínua e Docker

| Trabalho | O que roda | Bloqueia? |
|---|---|---|
| **API** | `npm ci`, lint, testes com cobertura, ponta a ponta, build, `npm audit --omit=dev --audit-level=high` | Sim |
| **App** | `npm ci`, `typecheck`, lint, testes | Sim |
| **Scripts** | `node --test "scripts/*.test.mjs"` | Sim |
| **Docker** | Gera o `.env`, constrói a imagem da API e, em push na `main`, publica no Docker Hub | Sim |

A publicação usa os segredos `DOCKERHUB_USERNAME` e `DOCKERHUB_TOKEN` do repositório. Sem eles, o trabalho só constrói a imagem. A imagem publicada se chama `mrafaelguilherme/entre-aulas-api:latest`.

O Dependabot abre um PR por semana para cada pasta (`api`, `mobile` e as actions), agrupando as atualizações. Versões maiores do TypeScript, dos tipos do Node, do React e do React Native ficam de fora, porque exigem migração manual.

| Imagem | Base | Observação |
|---|---|---|
| `mongo` | `mongo:8.0` | Volume nomeado, com usuário e senha; porta não publicada; `healthcheck` com `mongosh` |
| `api` | `node:24-slim`, dois estágios | Só dependências de produção; roda como usuário `node`; `healthcheck` em `/posts` |
| `seed` | `node:24-alpine` | Roda uma vez, depois que a API responde; termina sem alterar nada se já houver posts |

---

## Decisões

**Subida de versões.** A API saiu do NestJS 10 para o 12 (com `StandardSchemaValidationPipe`, `@Body({ schema })` e `useSecurityHeaders()` nativos), Mongoose 7 para 9, Zod 3 para 4, TypeScript 5 para 6, ESLint 8 para 10 e Node 20 para 24. O app nasceu no Expo SDK 58, com React Native 0.88 e React 19.3. O critério foi usar só versões com suporte ativo, verificado em `endoflife.date`, porque dependência sem suporte não recebe correção de segurança.

**Um master em vez de "todo professor administra".** O enunciado diz que professores editam e excluem outros professores. Com essa regra, um professor mal-intencionado poderia excluir um colega para tomar os posts dele, ou, pior, trocar a senha dele e entrar como ele. Por isso, essas ações ficaram com o master, e a redefinição de senha é a única forma de recuperar uma conta.

**Posse do post.** O enunciado pede editar e excluir cada post. Aqui, a posse restringe a edição, seguindo a avaliação da Fase 3. O master exclui qualquer post, para moderar, mas não edita, para ninguém publicar em nome de outro.

**Exclusão lógica de contas.** A conta vira `deleted`, o e-mail continua reservado, os posts do professor continuam publicados e só o master restaura. Convite recusado é apagado de verdade, porque a conta nunca teve acesso. Excluir um post apaga os comentários dele.

**Sem BFF.** Explicado em [Arquitetura](#arquitetura).

**Comentários no escopo**, mesmo opcionais, porque dão sentido ao login do aluno.

---

## Limitações conhecidas

- **HTTPS.** A demonstração usa HTTP local no emulador, por `adb reverse`. Em produção, a API precisaria de TLS, e o app já recusa `http://` fora do desenvolvimento.
- **Sem refresh token.** A sessão dura 1 hora. Depois disso, o app pede login de novo. A consulta ao banco em cada requisição já invalida o acesso na hora em que a conta muda.
- **Sem MFA nem recuperação de senha por e-mail.** O projeto não tem serviço de e-mail. Quem esquece a senha pede ao master, que redefine.
- **Senha inicial conhecida por quem cria a conta**, até o primeiro login. Se alguém entrar antes do dono, o dono percebe e o master redefine.
- **Master de confiança total.** As ações dele ficam só nos logs da API.
- **Limite de taxa em memória**, válido para uma instância da API.
- **Dados de conta excluída** ficam guardados. Em produção, a LGPD exigiria prazo de retenção.
- **Barra de abas com 2 destinos** para visitante e aluno, abaixo do mínimo de 3 que o guia do Android recomenda. Foi uma escolha para manter a mesma estrutura em todos os perfis.
- **A aba Conta não atualiza o nome** depois que a própria pessoa edita o cadastro em Professores. É preciso sair e entrar.
- **O convite pendente não mostra quem convidou**, porque a API devolve só o id de quem convidou.
- **Restaurar um convite pendente que foi excluído** o deixa ativo, sem passar pelo aceite. Só o master faz as duas coisas, e o caminho esperado para um convite é recusar.
- **As listas de professores e alunos mostram `mustChangePassword`** a qualquer professor. Quem criou a conta sabe, assim, se a pessoa já fez o primeiro acesso.
- **A API usa o usuário administrador do MongoDB.** Em produção, o certo seria um usuário só do banco `entre-aulas`, com o mínimo de permissão.
- **`npm audit` do app** com 3 achados moderados em ferramenta de build do Expo, explicados em [Testes e qualidade](#testes-e-qualidade).

---

## Documentação

- [docs/DOCUMENTACAO.md](docs/DOCUMENTACAO.md): arquitetura, fluxos de autenticação e permissão, matriz com os ataques bloqueados e os testes, correções em relação às fases anteriores e o relato de experiências.
- [requests.http](requests.http): um exemplo de cada rota, com os ataques bloqueados, para a extensão REST Client.
- Swagger em <http://localhost:3000/api>, com `ENABLE_API_DOCS=true`.
- Fases anteriores: [API da Fase 2](https://github.com/mrafaelguilherme/entre-aulas-api) e [interface web da Fase 3](https://github.com/mrafaelguilherme/entre-aulas-frontend).

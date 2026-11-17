# Entre Aulas: documentação técnica

> Tech Challenge Fase 4 · Rafael Guilherme Martins · RM 372843
> Pós Tech FIAP · Full Stack Development

Este documento complementa o [README](../README.md). O README diz como rodar e o que o sistema faz. Aqui ficam a arquitetura, os fluxos de autenticação e permissão, a tabela de permissões com o ataque que cada regra bloqueia e o teste que a prova, as correções em relação às fases anteriores, as decisões e o relato de experiências.

## Índice

1. [Visão geral](#1-visão-geral)
2. [Arquitetura](#2-arquitetura)
3. [Como usar](#3-como-usar)
4. [Permissões](#4-permissões)
5. [Autenticação e sessão](#5-autenticação-e-sessão)
6. [Correções em relação às fases anteriores](#6-correções-em-relação-às-fases-anteriores)
7. [Subida de versões](#7-subida-de-versões)
8. [Decisões e tensões com o enunciado](#8-decisões-e-tensões-com-o-enunciado)
9. [Testes](#9-testes)
10. [Limitações](#10-limitações)
11. [Relato de experiências e desafios](#11-relato-de-experiências-e-desafios)

---

## 1. Visão geral

O Entre Aulas é um blog para a escola. Professores publicam posts, alunos leem e comentam, e um usuário master administra as contas. A Fase 2 entregou a API, a Fase 3 a interface web, e esta fase entrega o app mobile em React Native, com a API evoluída.

Três perfis com login, mais o visitante:

| Perfil | Quem é | O que faz |
|---|---|---|
| Visitante | Qualquer pessoa sem login | Lê e busca posts, lê comentários |
| Aluno | Conta criada por um professor | Comenta e apaga os próprios comentários |
| Professor | Conta criada pelo master, ou convite aceito por ele | Publica, edita os próprios posts, convida colegas, administra alunos |
| Master | Um só, criado pela API ao subir | Tudo o que o professor faz, mais aceitar convites, excluir e restaurar contas, redefinir senhas e excluir qualquer post |

---

## 2. Arquitetura

```text
┌────────────────────────────┐        ┌────────────────────────────┐        ┌──────────────┐
│ App React Native (Expo)    │  REST  │ API NestJS 12 (porta 3000) │        │ MongoDB 8    │
│ emulador Android           │ ─────▶ │ guards globais             │ ─────▶ │ rede interna │
│ token no expo-secure-store │  JWT   │ Zod em todo corpo e query  │        │ com senha    │
└────────────────────────────┘        └────────────────────────────┘        └──────────────┘
```

### Componentes

**API (`api/`).** NestJS 12 com Mongoose 9 e Zod 4. Quatro módulos:

| Módulo | Responsabilidade | Arquivos principais |
|---|---|---|
| `auth` | Login, saída, perfil atual, troca da própria senha, criação do master ao subir, opções do JWT | `auth/controllers/auth.controller.ts`, `auth/controllers/me.controller.ts`, `auth/services/auth.service.ts`, `auth/services/master-bootstrap.service.ts`, `auth/jwt.options.ts` |
| `users` | Professores, alunos e master em uma só coleção; convite, aceite, recusa, exclusão lógica, restauração e redefinição de senha | `users/controllers/teacher.controller.ts`, `student.controller.ts`, `user.controller.ts`, `users/services/account.service.ts`, `users/schemas/user.schema.ts` |
| `posts` | Posts com dono e comentários | `posts/controllers/post.controller.ts`, `comment.controller.ts`, `posts/services/post.service.ts`, `comment.service.ts` |
| `shared` | Guards, decorators, pipes, filtro de erros, interceptor de auditoria, hash de senha, paginação, limites dos campos | `shared/guards/auth.guard.ts`, `roles.guard.ts`, `shared/pipes/object-id-param.pipe.ts`, `shared/interceptors/master-audit.interceptor.ts`, `shared/security/password.service.ts`, `shared/validation/fields.ts` |

O fluxo de uma requisição é `Controller → Service → Repository → MongoDB`, como nas fases anteriores. Os services recebem o repositório pelo construtor, por uma abstração, o que permite trocar o banco ou usar dublês nos testes unitários.

**App (`mobile/`).** Expo SDK 58, React Native 0.88, React 19.3, TypeScript 6.

| Pasta | Responsabilidade |
|---|---|
| `src/api` | Cliente axios com interceptors (`client.ts`) e uma função por rota (`auth.ts`, `posts.ts`, `comments.ts`, `people.ts`) |
| `src/config` | Endereço da API, com a recusa de `http://` fora do desenvolvimento (`env.ts`) |
| `src/contexts` | `AuthContext` (sessão, token no cofre, entrar, sair) e `PendingInvitesContext` (número de convites pendentes para o master) |
| `src/navigation` | `RootNavigator` (pilha e abas por perfil), `tabsForRole` (quais abas cada perfil vê), `types.ts` (rotas e parâmetros) |
| `src/permissions` | Regras que a tela usa para mostrar ou esconder ações; espelham a API |
| `src/screens` | As 11 telas: `PostsList`, `PostRead`, `Login`, `Account`, `ChangePassword`, `ManagePosts`, `PostEditor`, `Teachers`, `Students`, `PersonEditor`, `DeletedAccounts` |
| `src/components` | `Button`, `IconButton`, `TextField`, `ChalkHeader`, `ListState`, `PersonRow` |
| `src/hooks` | `usePaginatedList`: carregando, vazio, erro, puxar para atualizar e carregar mais |
| `src/theme` | Paleta, fonte e tamanhos da direção visual "Lousa" |
| `src/utils` | Formatação de datas |

**Infraestrutura.** `docker-compose.yml` sobe MongoDB (com usuário e senha, sem porta publicada), a API (imagem em dois estágios, usuário `node`, `healthcheck`) e o `seed`, que roda uma vez depois que a API responde. `scripts/setup-env.mjs` gera o `.env` com segredos aleatórios. A CI (`.github/workflows/ci.yml`) tem quatro trabalhos: API, App, Scripts e Docker.

### Por que o app chama a API direto

Na Fase 3, a interface web tinha um BFF (Backend for Frontend) por três motivos: manter o token em um cookie `httpOnly`, evitar CORS e tirar a URL da API do pacote do navegador. No app nativo:

- o token fica no `expo-secure-store`, que o sistema do aparelho cifra, e não existe JavaScript de terceiros na mesma origem para roubá-lo;
- não há CORS, porque não há navegador;
- a URL da API não é segredo, só um endereço.

Um BFF aqui seria um serviço a mais para manter, sem ganho de segurança. A autorização continua toda na API.

### Onde cada regra vale

O app esconde o que a pessoa não pode fazer, para não gerar dúvida nem toque inútil. Mas essa é a camada de conforto. A camada de segurança é a API, que confere tudo de novo, com dados do banco. Um app alterado, ou uma chamada feita por fora dele, recebe 401, 403 ou 404.

---

## 3. Como usar

O guia por perfil está no [README](../README.md#guia-de-uso-por-perfil). Os fluxos que merecem explicação:

**Primeiro acesso.** Toda conta criada por outra pessoa nasce com `mustChangePassword: true`. No login, a API devolve o token, mas toda rota protegida responde 403 com o código `PASSWORD_CHANGE_REQUIRED`, exceto `GET /me`, `PUT /me/password` e `POST /auth/signout`. O app lê esse campo em `GET /me` e abre uma pilha com uma só tela, Trocar senha, com o botão Sair. Depois da troca, a API sobe a versão do token, o app entra de novo com a senha nova e remonta a navegação completa.

**Convite.** Um professor comum cadastra um colega em `POST /teachers`; a conta nasce `pending`, com `invitedBy` igual a quem convidou, e não consegue entrar. A aba Professores do master mostra o número de pendentes e, na lista, os botões Aceitar e Recusar. Aceitar torna a conta `active`; recusar apaga o cadastro e libera o e-mail. O master cadastra direto, e a conta já nasce `active`.

**Exclusão e restauração.** Excluir um professor ou aluno muda o `status` para `deleted`. A pessoa não entra mais, o token dela morre na próxima requisição, o e-mail continua reservado, e os posts do professor continuam publicados. Só o master vê Contas excluídas e restaura. Como o id não muda, o controle dos posts volta junto.

**Redefinir senha.** Só o master, ao editar outra pessoa. A API grava a senha provisória, marca `mustChangePassword` e sobe a versão do token. A pessoa entra com a provisória e cai na troca obrigatória.

**Sessão expirada.** O token vale 1 hora. Quando qualquer requisição que levou token recebe 401, o app apaga o token do cofre, volta para a lista de posts e avisa "Sua sessão expirou". O mesmo acontece se a conta for excluída ou a senha for redefinida enquanto a pessoa usa o app.

---

## 4. Permissões

### Matriz

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

### Onde cada regra é garantida

| Regra | Onde a API garante | Teste |
|---|---|---|
| Rota fechada por padrão | `AuthGuard` e `RolesGuard` são globais (`api/src/app.module.ts`). Só `@Public()` abre uma rota | `api/test/permissions.e2e-spec.ts`: toda rota sem token devolve 401, exceto as públicas |
| Perfil vem do banco | `AuthGuard` carrega o usuário pelo `sub` do token e põe `role` na requisição | `auth.e2e-spec.ts`: "the role comes from the database: changing it there affects the same token" |
| Criar post só professor e master | `@Roles(...TEACHER_ROLES)` em `post.controller.ts` | `posts.e2e-spec.ts`: "a student answers 403 on POST and without login answers 401" |
| Editar post só quem criou | `post.service.ts`, `if (post.authorId !== actor.id)` | `posts.e2e-spec.ts`: "another teacher answers 403 on PUT and on DELETE, and the post does not change" |
| Excluir post: criador ou master | `post.service.ts`, `if (post.authorId !== actor.id && actor.role !== 'master')` | `posts.e2e-spec.ts`: "the master answers 403 on PUT of another teacher post, but can DELETE it" |
| Apagar comentário: autor, professor ou master | `comment.service.ts` | `comments.e2e-spec.ts`: "a student can delete their own comment, and answers 403 on another one" |
| Professor convida, master cadastra direto | `account.service.ts`: `status` nasce `pending` ou `active` conforme o perfil de quem cria | `teachers.e2e-spec.ts`: "a teacher POST creates a pending account with invitedBy = actor", "a master POST creates an active account with mustChangePassword true" |
| Aceitar, recusar e excluir professor só master | `@Roles('master')` em `teacher.controller.ts` | `teachers.e2e-spec.ts`: "approve by a teacher answers 403; by the master activates the account" |
| Editar professor: master ou o próprio | `account.service.ts` compara o id do ator com o do alvo | `teachers.e2e-spec.ts`: "a teacher updating another teacher answers 403; the master succeeds" |
| Master não exclui a si mesmo | `account.service.ts` | `teachers.e2e-spec.ts`: "the master deleting themselves answers 403" |
| Rotas de alunos filtram o perfil | `account.service.ts` consulta com `role: 'student'` | `students.e2e-spec.ts`: "GET, PUT and DELETE /students/:id with the master id answer 404 and change nothing" |
| Senha nunca vem no cadastro ou edição por terceiros | `z.strictObject` em `account.schemas.ts`: `password` só na criação; `role` e `status` nunca | `students.e2e-spec.ts`: "POST or PUT with password, role or status answers 400"; `teachers.e2e-spec.ts`: "PUT with a password field answers 400, even for the master" |
| Contas excluídas, restaurar e redefinir só master | `@Roles('master')` na classe `user.controller.ts` | `users.e2e-spec.ts`: "a teacher answers 403 on every /users route" |
| Master não redefine a própria senha | `account.service.ts` | `users.e2e-spec.ts`: "reset-password on the master own id answers 403" |

A matriz inteira, célula por célula, está em `api/test/permissions.e2e-spec.ts`: uma tabela com uma linha por rota e situação, e o status esperado para visitante, aluno, professor e master. O teste sobe a aplicação de verdade, com guards, pipes e um MongoDB em memória.

### Ataques bloqueados

| Ataque | Resposta da API | Teste |
|---|---|---|
| Professor alcança o master por `/students/:id` | 404, sem alterar nada | `students.e2e-spec.ts`: "GET, PUT and DELETE /students/:id with the master id answer 404 and change nothing" |
| Corpo com `role`, `status` ou `password` extras | 400 com o nome do campo | `students.e2e-spec.ts`: "POST or PUT with password, role or status answers 400" |
| Professor edita ou exclui post de outro | 403, post intacto | `posts.e2e-spec.ts`: "another teacher answers 403 on PUT and on DELETE, and the post does not change" |
| Conta nova com o mesmo nome do autor | 403: a checagem compara ids, não nomes | `posts.e2e-spec.ts`: "a new account with the same name as the author answers 403 on PUT and DELETE" |
| Token antigo depois de trocar a senha, sair ou ser excluído | 401, mesmo antes de expirar | `auth.e2e-spec.ts`: "answers 204, the old token answers 401 and the new password logs in", "a token is rejected after signout"; `teachers.e2e-spec.ts`: "DELETE by the master soft-deletes: GET answers 404 and the old token answers 401" |
| Token com `alg: none`, outro segredo, outro `iss` ou `aud` | 401 | `auth.e2e-spec.ts`: "a token signed with alg none, another secret, issuer or audience answers 401" |
| Login de conta pendente ou excluída | O mesmo 401 de senha errada | `auth.e2e-spec.ts`: "unknown email, wrong password, pending and soft-deleted answer the same 401" |
| Descobrir e-mail pelo tempo de resposta | Hash fictício calculado mesmo sem conta | `auth.e2e-spec.ts`: "unknown email still runs verifyDummy" |
| Força bruta no login | Bloqueio da conta por 15 minutos após 5 falhas; 429 por IP após 20 por minuto | `auth.e2e-spec.ts`: "five wrong passwords lock the account"; `hardening.e2e-spec.ts`: "the 21st signin in one minute from the same IP answers 429" |
| Recriar conta com e-mail de conta excluída | 409 | `teachers.e2e-spec.ts`: "the email of a soft-deleted teacher stays reserved: POST answers 409" |
| Cliente define `createdAt`, `author` ou `authorId` | 400 | `posts.e2e-spec.ts`: "POST with createdAt, author, authorId or an unknown field answers 400" |
| Campos sem limite | 400 acima de 200 (título), 20000 (conteúdo), 1000 (comentário), 100 (nome e busca), 254 (e-mail) | `posts.e2e-spec.ts`: "a title with 201 chars and a content with 20001 chars answer 400"; `comments.e2e-spec.ts`: "a comment with 1001 chars, an empty one or an extra field answers 400" |
| Busca com caracteres especiais | 200, termo escapado | `posts.e2e-spec.ts`: 'search with "c++ (a" answers 200' |
| Toque duplo em Aceitar | O segundo devolve 404 | `teachers.e2e-spec.ts`: "a second approve answers 404" |
| Comentar em post apagado | 404, sem comentário órfão | `comments.e2e-spec.ts`: "commenting on a missing or invalid post answers 404 and creates nothing" |
| Resposta vaza hash ou campos internos | Nunca saem `password`, `tokenVersion`, `failedLoginCount` ou `lockedUntil` | `teachers.e2e-spec.ts`: "responses never contain password, tokenVersion, failedLoginCount or lockedUntil" |
| Log com senha ou token | A falha de login registra o evento, nunca a senha nem o token | `hardening.e2e-spec.ts`: "logs of a failed login contain the event, but not the password or a token" |
| Swagger aberto em produção | 404 em `/api` sem `ENABLE_API_DOCS=true` | `hardening.e2e-spec.ts`: "/api and /api-json answer 404 when ENABLE_API_DOCS is false" |
| Id inválido chega ao banco | 404 antes da consulta | `posts.e2e-spec.ts`: "an invalid or missing id answers 404 on GET, PUT and DELETE" |

---

## 5. Autenticação e sessão

### Login

```text
App                                  API                                   MongoDB
 │ POST /auth/signin {email, senha}   │                                      │
 │ ─────────────────────────────────▶ │ normaliza o e-mail                   │
 │                                    │ busca a conta ───────────────────────▶
 │                                    │ sem conta: verifica um hash fictício │
 │                                    │ bloqueada: 401                       │
 │                                    │ confere Argon2id; erro: soma falha   │
 │                                    │ 5 falhas: lockedUntil = agora + 15 min
 │                                    │ pendente ou excluída: 401            │
 │ ◀───────────────────────────────── │ { token } HS256, 1 h, sub e ver      │
 │ guarda no expo-secure-store        │                                      │
 │ GET /me ─────────────────────────▶ │ perfil, status e mustChangePassword  │
```

O token carrega só `sub` (id) e `ver` (versão), além de `iat`, `exp`, `iss` `entre-aulas-api` e `aud` `entre-aulas-mobile`. Nome, perfil e status ficam fora, porque vêm do banco a cada requisição.

### Requisição protegida

1. O interceptor do axios (`mobile/src/api/client.ts`) cola `Authorization: Bearer <token>`.
2. `AuthGuard` (`api/src/shared/guards/auth.guard.ts`) verifica a assinatura, o algoritmo, `iss` e `aud`; carrega o usuário pelo `sub`; recusa com 401 se a conta não existe, não está `active` ou tem `tokenVersion` diferente de `ver`; recusa com 403 `PASSWORD_CHANGE_REQUIRED` se a troca de senha está pendente, exceto nas três rotas liberadas.
3. `RolesGuard` (`api/src/shared/guards/roles.guard.ts`) compara o perfil do banco com o `@Roles()` da rota; 403 se não bate.
4. `ObjectIdParamPipe` recusa ids inválidos com 404, e o `StandardSchemaValidationPipe` valida o corpo e a query com Zod, devolvendo 400 com os campos errados.
5. O `MasterAuditInterceptor` registra toda escrita feita pelo master.

### O que invalida um token

| Evento | O que acontece |
|---|---|
| Sair (`POST /auth/signout`) | `tokenVersion` sobe; o app apaga o token do cofre mesmo se a chamada falhar |
| Trocar a própria senha | `tokenVersion` sobe; o app entra de novo com a senha nova |
| Master redefine a senha | `tokenVersion` sobe e `mustChangePassword` liga |
| Conta excluída | `status` vira `deleted`; o guard recusa |
| 1 hora | `exp` vence |

Em todos os casos, a próxima requisição do app recebe 401. O interceptor de resposta chama o `AuthContext`, que apaga o token, volta para Posts e avisa. Um 401 em requisição **sem** token é só um login errado, e não mexe na sessão.

### Lado do app

- Token no `expo-secure-store` (`mobile/src/contexts/AuthContext.tsx`), nunca em `AsyncStorage` nem em log.
- Ao abrir o app, o contexto lê o token do cofre e chama `GET /me`. Se a API responder 401, o token é apagado e o app abre como visitante.
- Campos de senha com `secureTextEntry` e sem autocapitalização.
- `assertSecureApiUrl` (`mobile/src/config/env.ts`) recusa `http://` fora do modo de desenvolvimento.

---

## 6. Correções em relação às fases anteriores

A avaliação da Fase 3 apontou o post sem dono e o token no `localStorage`. A revisão do código antigo com as recomendações do OWASP (Password Storage, Authentication e JWT Cheat Sheets) e a RFC 8725 achou os demais itens.

| # | Problema nas fases 2 e 3 | Correção nesta fase | Onde | Teste |
|---|---|---|---|---|
| 1 | Post sem dono: qualquer professor editava o post de outro | `authorId` preenchido pelo token; só o criador edita; criador ou master exclui | `api/src/posts/schemas/post.schema.ts`, `api/src/posts/services/post.service.ts` | `posts.e2e-spec.ts` |
| 2 | Token no `localStorage` | `expo-secure-store` | `mobile/src/contexts/AuthContext.tsx` | `mobile/src/contexts/__tests__/` |
| 3 | Cadastro público de professor | Rota protegida; professor convida, master aceita ou cadastra direto | `api/src/users/controllers/teacher.controller.ts`, `api/src/users/services/account.service.ts` | `teachers.e2e-spec.ts` |
| 4 | Token valia 8 horas, mesmo após excluir a conta | 1 hora; guard consulta o banco e confere `status` e `tokenVersion` | `api/src/auth/jwt.options.ts`, `api/src/shared/guards/auth.guard.ts` | `auth.e2e-spec.ts` |
| 5 | Segredo fraco com valor padrão | Mínimo de 32 caracteres; `setup-env.mjs` gera aleatórios; compose recusa subir sem eles | `api/src/config/env.validation.ts`, `scripts/setup-env.mjs`, `docker-compose.yml` | `env.validation.spec.ts`, `scripts/setup-env.test.mjs` |
| 6 | bcrypt com custo 8 | Argon2id com 19 MiB, 2 iterações e paralelismo 1 | `api/src/shared/security/password.service.ts` | `password.service.spec.ts` |
| 7 | Senha com mínimo de 6 | Mínimo de 15 e máximo de 128 | `api/src/shared/validation/fields.ts` | `teachers.e2e-spec.ts`: "a password shorter than 15 chars answers 400" |
| 8 | Login sem limite de tentativas | Bloqueio da conta por 15 minutos após 5 falhas; limite por IP no login e nos comentários | `api/src/auth/services/auth.service.ts`, `api/src/app.module.ts` (`ThrottlerModule`), `@Throttle` nos controllers | `auth.e2e-spec.ts`, `hardening.e2e-spec.ts` |
| 9 | Tempo de resposta revelava e-mail existente | Hash fictício para e-mail inexistente; erro único | `api/src/auth/services/auth.service.ts`, `password.service.ts` (`verifyDummy`) | `auth.e2e-spec.ts` |
| 10 | Algoritmo do JWT não fixado | Só `HS256`; `issuer` e `audience` conferidos | `api/src/auth/jwt.options.ts` | `auth.e2e-spec.ts` |
| 11 | 14 vulnerabilidades em dependências | Versões atualizadas; `npm audit` na CI; Dependabot | `api/package.json`, `mobile/package.json`, `.github/` | Trabalho API da CI |
| 12 | Campos sem limite | `z.strictObject` com `.max()` em todo corpo e query | `api/src/shared/validation/fields.ts`, `api/src/users/controllers/account.schemas.ts`, `post.controller.ts`, `comment.controller.ts` | e2e de cada rota |
| 13 | Cliente definia `createdAt` | Campo removido do corpo; a API carimba as datas | `api/src/posts/controllers/post.controller.ts` | `posts.e2e-spec.ts` |
| 14 | Erro interno sem registro e `console.log` | Logger do Nest no filtro de erros; falha de login registrada sem senha nem token; auditoria das escritas do master | `api/src/shared/filters/http-exception.filter.ts`, `api/src/shared/interceptors/master-audit.interceptor.ts` | `hardening.e2e-spec.ts`, specs dos dois |
| 15 | Sem cabeçalhos de segurança | `app.useSecurityHeaders()` antes de qualquer `app.use()` | `api/src/app.setup.ts` | `hardening.e2e-spec.ts` |
| 16 | Swagger sempre aberto e Redoc duplicado | Só Swagger, só com `ENABLE_API_DOCS=true`; Redoc removido | `api/src/app.setup.ts`, `api/src/config/env.validation.ts` | `hardening.e2e-spec.ts` |
| 17 | MongoDB sem senha e com porta publicada | Usuário e senha no `.env`; porta não publicada | `docker-compose.yml` | Verificação manual: `docker compose ps` não mostra 27017 |

O que já estava certo e continua: a busca escapa o termo, o erro de login é genérico, o Zod valida os tipos, o id é validado antes da consulta, e o Docker roda sem root.

---

## 7. Subida de versões

O critério foi usar só versões com suporte ativo, conferido em `endoflife.date`, porque dependência sem suporte não recebe correção de segurança.

| Peça | Fases 2 e 3 | Fase 4 |
|---|---|---|
| Node.js | 20 | 24.22.2 |
| NestJS | 10 | 12 |
| Mongoose | 8 | 9 |
| Zod | 3 | 4 |
| TypeScript | 5.4 | 6.0 |
| ESLint | 8 | 10 |
| Jest | 29 | 30 |
| Hash de senha | bcryptjs 2.4 | argon2 0.45 |
| MongoDB | 7 | 8.0 |
| App | React 18 + Next.js (web) | Expo SDK 58, React Native 0.88, React 19.3 |

O que a subida exigiu:

- **NestJS 12.** O Jest precisa rodar com `--experimental-vm-modules`, porque o Nest 12 traz pacotes só ESM. Em troca, o `StandardSchemaValidationPipe`, o `@Body({ schema })` e o `app.useSecurityHeaders()` são nativos, e o Swagger documenta os esquemas Zod sem conversor.
- **Mongoose 9.** `FilterQuery` virou `QueryFilter`, e `{ new: true }` virou `{ returnDocument: 'after' }`.
- **Zod 4.** `.pipe()` em um campo deixa a chave opcional no tipo inferido; o `emailSchema` usa `.regex(z.regexes.email)` depois de `trim` e `toLowerCase`.
- **TypeScript 6.** `baseUrl` e `incremental` saíram do `tsconfig.json`: com `incremental`, o build gerava `dist` vazio e a API não subia no Docker. No app, `"types": ["jest"]` é necessário porque o TypeScript 6 não inclui `@types` sozinho.
- **ESLint 10.** O `eslint-config-expo` depende de um plugin que não roda no ESLint 10, e o ESLint 9 está sem suporte. O app usa a mesma base da API (`typescript-eslint` e Prettier) mais `eslint-plugin-react-hooks` 7, cujas regras novas proíbem ler ref durante a renderização e `setState` síncrono em `useEffect`.
- **Testing Library 14.** Toda a API é assíncrona (`await render`, `await fireEvent.press`), e os matchers vêm embutidos.

---

## 8. Decisões e tensões com o enunciado

**Um master em vez de "todo professor administra".** O enunciado (requisitos 6 e 7) diz que professores editam e excluem docentes. Com essa regra, um professor mal-intencionado excluiria um colega para tomar os posts dele; pior, se pudesse editar, trocaria a senha do colega e entraria como ele. Por isso, essas ações ficaram com o master, um professor com permissão extra. Um professor comum convida um colega e edita só o próprio cadastro. O README orienta a avaliação a entrar primeiro com o master.

**Posse do post.** O requisito 9 pede editar e excluir cada post. Aqui, a posse restringe a edição, seguindo a avaliação da Fase 3. O master exclui qualquer post, para moderar, mas não edita: ninguém publica em nome de outro. A checagem compara ids, não nomes, para uma conta nova com o mesmo nome não ganhar acesso.

**Alunos só visualizam** vale para posts. Comentar é opcional no enunciado e não altera post. Os comentários entraram no escopo porque dão sentido ao login do aluno.

**Exclusão lógica de contas, definitiva de posts.** Contas viram `deleted`, com e-mail reservado e restauração pelo master. Convite recusado é apagado, porque a conta nunca teve acesso. Posts e comentários são removidos de verdade, e excluir um post remove os comentários dele.

**Bloqueio por conta, e não só por IP.** O `@nestjs/throttler` conta também os logins certos, o que travaria uma demonstração. O bloqueio por conta, após 5 falhas, protege contra força bruta sem punir quem acerta; o limite por IP fica como segunda camada.

**Abas em todos os perfis.** Visitante e aluno veem 2 abas, abaixo do mínimo de 3 que o guia do Android recomenda. A mesma estrutura em todos os perfis ficou mais simples de aprender e de testar.

**Ações só quando permitidas.** Em vez de botões desativados, a lista mostra os ícones só para quem pode agir, e uma frase explica a ausência ("Só quem criou o post pode editar."). Botão desativado sem explicação gera dúvida sobre o motivo.

---

## 9. Testes

| Onde | Quantidade | Estratégia |
|---|---|---|
| `api/src/**/*.spec.ts` | 64 testes, 11 suítes | Unitários: serviços com repositório dublê, guards, pipes, filtro, interceptor, senha, validação do ambiente |
| `api/test/*.e2e-spec.ts` | 120 testes, 8 suítes | Ponta a ponta: aplicação real, guards reais, MongoDB em memória (`mongodb-memory-server`), um banco por arquivo |
| `mobile/src/**/__tests__` | 161 testes, 26 suítes | Cliente da API, contexto de sessão, permissões, abas por perfil, componentes e as 11 telas renderizadas dentro de uma pilha de navegação real, com a API dublada |
| `scripts/*.test.mjs` | 3 testes | Geração do `.env` |

Os limites de cobertura unitária da API (40% de linhas, 60% de decisões) reprovam o build. Eles são baixos de propósito: a regra de negócio é coberta pelos testes de ponta a ponta, que exercitam o caminho inteiro em vez de dublês.

A CI roda tudo a cada push e PR: lint, tipos, testes, build, `npm audit --omit=dev --audit-level=high` e a construção da imagem Docker. Na `main`, publica a imagem no Docker Hub quando os segredos existem.

Para rodar, veja [Testes e qualidade](../README.md#testes-e-qualidade) no README.

---

## 10. Limitações

A lista completa está em [Limitações conhecidas](../README.md#limitações-conhecidas) no README. As que mais importam para quem avalia:

- HTTPS só em produção; a demonstração usa HTTP local via `adb reverse`.
- Sem refresh token: a sessão dura 1 hora.
- Sem MFA nem recuperação de senha por e-mail: o master redefine.
- `npm audit` do app com 3 achados moderados em ferramenta de build do Expo, sem correção que não quebre o SDK.

Achados da revisão de código final, documentados em vez de corrigidos, por serem de baixo impacto e só alcançáveis pelo master ou por professores:

- Restaurar um convite pendente que foi excluído o deixa `active`, sem passar pelo aceite. O caminho esperado para um convite é recusar.
- `GET /teachers` e `GET /students` devolvem `mustChangePassword`, então quem criou a conta sabe se a pessoa já fez o primeiro acesso.
- A API se conecta ao MongoDB com o usuário administrador. Em produção, o certo é um usuário só do banco `entre-aulas`.
- O pipe que valida ids só olha o parâmetro chamado `id`. Todas as rotas usam esse nome; uma rota futura com outro nome precisaria estender o pipe.

---

## 11. Relato de experiências e desafios

### Comecei pelas avaliações

A avaliação da Fase 3 apontou dois problemas: qualquer professor editava o post de outro, e o token ficava no `localStorage`. Fiz da correção desses pontos a prioridade da fase, junto com o que uma revisão pelas recomendações do OWASP revelou. A seção 6 lista as 17 correções.

### Um master em vez de professores com poder total

O enunciado diz que professores editam e excluem outros professores. Assim, um professor poderia trocar a senha de um colega e entrar como ele. Por isso criei um único master, que cuida de tudo o que mexe na conta de outra pessoa. O professor comum convida, e o master aceita. A seção 8 registra essa escolha.

### Versões com suporte

Usei só versões com suporte: NestJS 12, Mongoose 9, Zod 4, TypeScript 6, ESLint 10 e Expo SDK 58. Testei a subida antes, em uma pasta separada. A seção 7 descreve os ajustes que ela exigiu.

### O emulador e o `localhost`

Dentro do emulador, `localhost` é o próprio emulador, e o endereço `10.0.2.2` ficou pendurado no Expo Go. A solução foi `adb reverse tcp:3000 tcp:3000`, que liga a porta do emulador à do computador.

### Teste verde não é app funcionando

Depois da troca obrigatória de senha, o teste passava, mas no aparelho o app continuava na mesma tela. O React Navigation guardava o estado antigo da navegação. A correção foi uma `key` no contêiner de navegação, que o recria quando a troca termina. A lição: o teste não dispensa o aparelho.

### A verificação final

Na verificação final, um teste da API falhou: um e-mail de teste tinha virado `'../users/'` pelo autocompletar do editor. A CI não avisou porque eu estava sem enviar os commits ao GitHub, e agora envio a cada commit. Uma revisão de código independente de toda a branch não achou problema crítico. Corrigi com teste os quatro pequenos que afetam quem usa o app e documentei os outros na seção 10.

### O que ficou de fora

O `npm audit` do app mostra 3 achados moderados em uma ferramenta de build do Expo. A correção automática voltaria o Expo para o SDK 52, mais antigo e mais exposto, então preferi documentar. Também não fiz refresh token nem recuperação de senha por e-mail, porque o projeto não tem serviço de e-mail.

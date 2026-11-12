import { CommentRepository } from '../src/posts/repositories/comment.repository';
import { PostRepository } from '../src/posts/repositories/post.repository';
import { IUser } from '../src/users/models/user.interface';
import { auth, createTestApp, MASTER, TestApp } from './support/test-app';

// Uma linha por rota e situacao. Cada celula diz o que cada perfil recebe:
// um status exato, ou 'allow' (qualquer status fora de 401 e 403).
type Expected = number | 'allow';
type Body = Record<string, unknown> | (() => Record<string, unknown>);
type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
type Row = [Method, string, Expected, Expected, Expected, Expected, Body?];

const ACTORS = ['none', 'student', 'teacher', 'master'] as const;
type Actor = (typeof ACTORS)[number];

const post = { title: 'Aula de teste', content: 'Conteudo da aula' };
let emailCounter = 0;
const newAccount = () => ({
  name: 'Conta Nova',
  email: `conta-${++emailCounter}@escola.com.br`,
  password: 'senha-da-conta-nova-1',
});

// POST /auth/signout fica fora da tabela porque invalida o proprio token;
// ele e testado em auth.e2e-spec.ts.
const rows: Row[] = [
  // Sessao
  ['GET', '/me', 401, 'allow', 'allow', 'allow'],
  [
    'PUT',
    '/me/password',
    401,
    'allow',
    'allow',
    'allow',
    {
      currentPassword: 'senha-errada-mas-longa',
      newPassword: 'nova-senha-bem-comprida',
    },
  ],
  // Posts
  ['GET', '/posts', 'allow', 'allow', 'allow', 'allow'],
  ['GET', '/posts/search?term=aula', 'allow', 'allow', 'allow', 'allow'],
  ['GET', '/posts/:postId', 'allow', 'allow', 'allow', 'allow'],
  ['POST', '/posts', 401, 403, 'allow', 'allow', post],
  ['PUT', '/posts/:ownPost', 401, 403, 'allow', 'allow', { title: 'Editado' }],
  ['PUT', '/posts/:otherTeacherPost', 401, 403, 403, 403, { title: 'Editado' }],
  ['DELETE', '/posts/:ownPost', 401, 403, 'allow', 'allow'],
  ['DELETE', '/posts/:otherTeacherPost', 401, 403, 403, 'allow'],
  // Comentarios
  ['GET', '/posts/:postId/comments', 'allow', 'allow', 'allow', 'allow'],
  [
    'POST',
    '/posts/:postId/comments',
    401,
    'allow',
    'allow',
    'allow',
    {
      content: 'Otima aula!',
    },
  ],
  ['DELETE', '/comments/:ownComment', 401, 'allow', 'allow', 'allow'],
  ['DELETE', '/comments/:otherComment', 401, 403, 'allow', 'allow'],
  // Professores
  ['GET', '/teachers', 401, 403, 'allow', 'allow'],
  ['GET', '/teachers/:teacherId', 401, 403, 'allow', 'allow'],
  ['POST', '/teachers', 401, 403, 'allow', 'allow', newAccount],
  ['PUT', '/teachers/:selfId', 401, 403, 'allow', 'allow', { name: 'Editado' }],
  ['PUT', '/teachers/:teacherId', 401, 403, 403, 'allow', { name: 'Editado' }],
  ['DELETE', '/teachers/:freshTeacherId', 401, 403, 403, 'allow'],
  ['POST', '/teachers/:pendingId/approve', 401, 403, 403, 'allow'],
  ['POST', '/teachers/:pendingId/reject', 401, 403, 403, 'allow'],
  // Alunos
  ['GET', '/students', 401, 403, 'allow', 'allow'],
  ['GET', '/students/:studentId', 401, 403, 'allow', 'allow'],
  ['POST', '/students', 401, 403, 'allow', 'allow', newAccount],
  [
    'PUT',
    '/students/:studentId',
    401,
    403,
    'allow',
    'allow',
    { name: 'Editado' },
  ],
  ['DELETE', '/students/:studentId', 401, 403, 'allow', 'allow'],
  // Contas excluidas e senha
  ['GET', '/users/deleted', 401, 403, 403, 'allow'],
  ['POST', '/users/:deletedId/restore', 401, 403, 403, 'allow'],
  [
    'POST',
    '/users/:studentId/reset-password',
    401,
    403,
    403,
    'allow',
    {
      password: 'senha-provisoria-123',
    },
  ],
];

describe('Permissions matrix (e2e)', () => {
  let t: TestApp;
  let posts: PostRepository;
  let comments: CommentRepository;
  let teacher: IUser;
  let otherTeacher: IUser;
  let student: IUser;
  let otherStudent: IUser;
  let master: { id: string; name: string };
  const tokens: Partial<Record<Actor, string>> = {};

  beforeAll(async () => {
    t = await createTestApp();
    posts = t.app.get(PostRepository);
    comments = t.app.get(CommentRepository);

    teacher = await t.createUser({
      email: 'ana@escola.com.br',
      role: 'teacher',
    });
    otherTeacher = await t.createUser({
      email: 'carlos@escola.com.br',
      role: 'teacher',
    });
    student = await t.createUser({
      email: 'bia@escola.com.br',
      role: 'student',
    });
    otherStudent = await t.createUser({
      email: 'caio@escola.com.br',
      role: 'student',
    });

    tokens.student = await t.signIn(student.email);
    tokens.teacher = await t.signIn(teacher.email);
    tokens.master = await t.signIn(MASTER.email, MASTER.password);
    master = (await t.http.get('/me').set(auth(tokens.master))).body;
  });

  afterAll(() => t.close());

  // Quem e "eu" em cada linha: o proprio ator, ou alguem qualquer sem login.
  function self(actor: Actor): { id: string; name: string } {
    if (actor === 'master') return master;
    if (actor === 'teacher') return teacher;
    return student;
  }

  async function createPost(owner: { id: string; name: string }) {
    const created = await posts.create({
      ...post,
      author: owner.name,
      authorId: owner.id,
    });
    return created.id;
  }

  async function createComment(owner: { id: string; name: string }) {
    const created = await comments.create({
      postId: await createPost(teacher),
      content: 'Comentario',
      author: owner.name,
      authorId: owner.id,
    });
    return created.id;
  }

  async function createAccount(
    role: 'teacher' | 'student',
    status: 'active' | 'pending' | 'deleted' = 'active',
  ) {
    const account = await t.createUser({
      email: `fixture-${++emailCounter}@escola.com.br`,
      role,
      status: status === 'deleted' ? 'active' : status,
    });
    if (status === 'deleted') await t.users.softDelete(account.id, [role]);
    return account.id;
  }

  // Troca cada marcador da rota por um recurso novo, criado para esta celula.
  async function resolve(path: string, actor: Actor): Promise<string> {
    const makers: Record<string, () => Promise<string>> = {
      ':postId': () => createPost(teacher),
      ':ownPost': () => createPost(self(actor)),
      ':otherTeacherPost': () => createPost(otherTeacher),
      ':ownComment': () => createComment(self(actor)),
      ':otherComment': () => createComment(otherStudent),
      ':teacherId': async () => otherTeacher.id,
      ':selfId': async () => self(actor).id,
      ':freshTeacherId': () => createAccount('teacher'),
      ':pendingId': () => createAccount('teacher', 'pending'),
      ':studentId': () => createAccount('student'),
      ':deletedId': () => createAccount('student', 'deleted'),
    };

    let resolved = path;
    for (const [placeholder, make] of Object.entries(makers)) {
      if (resolved.includes(placeholder)) {
        resolved = resolved.replace(placeholder, await make());
      }
    }
    return resolved;
  }

  function start(method: Method, url: string) {
    if (method === 'GET') return t.http.get(url);
    if (method === 'POST') return t.http.post(url);
    if (method === 'PUT') return t.http.put(url);
    return t.http.delete(url);
  }

  it.each(rows)('%s %s', async (...row: Row) => {
    // Parametros soltos confundem o Jest quando a linha nao tem corpo.
    const [method, path, none, asStudent, asTeacher, asMaster, body] = row;
    const expected: Expected[] = [none, asStudent, asTeacher, asMaster];

    for (const [index, actor] of ACTORS.entries()) {
      const url = await resolve(path, actor);
      let req = start(method, url);
      if (actor !== 'none') req = req.set(auth(tokens[actor]));
      if (body) req = req.send(typeof body === 'function' ? body() : body);

      const response = await req;
      const denied = [401, 403].includes(response.status);
      const outcome =
        expected[index] === 'allow'
          ? denied
            ? `denied with ${response.status}`
            : 'allow'
          : response.status;

      expect(`${actor}: ${outcome}`).toBe(`${actor}: ${expected[index]}`);
    }
  });
});

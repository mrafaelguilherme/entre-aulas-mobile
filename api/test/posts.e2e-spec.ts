import { IPost } from '../src/posts/models/post.interface';
import { IUser } from '../src/users/models/user.interface';
import { auth, createTestApp, MASTER, TestApp } from './support/test-app';

const post = { title: 'Aula de teste', content: 'Conteudo da aula' };

describe('Posts (e2e)', () => {
  let t: TestApp;
  let masterToken: string;
  let teacher: IUser;
  let teacherToken: string;
  let otherToken: string;
  let studentToken: string;

  async function createPost(token: string, overrides = {}): Promise<IPost> {
    const response = await t.http
      .post('/posts')
      .set(auth(token))
      .send({ ...post, ...overrides })
      .expect(201);
    return response.body;
  }

  beforeAll(async () => {
    t = await createTestApp();
    masterToken = await t.signIn(MASTER.email, MASTER.password);
    teacher = await t.createUser({
      email: 'ana@escola.com.br',
      role: 'teacher',
    });
    const other = await t.createUser({
      email: 'carlos@escola.com.br',
      role: 'teacher',
    });
    const student = await t.createUser({
      email: 'bia@escola.com.br',
      role: 'student',
    });
    teacherToken = await t.signIn(teacher.email);
    otherToken = await t.signIn(other.email);
    studentToken = await t.signIn(student.email);
  });

  afterAll(() => t.close());

  it('the list is public and has items, page, limit and total, newest first', async () => {
    await createPost(teacherToken, { title: 'Primeiro' });
    await createPost(teacherToken, { title: 'Segundo' });
    const last = await createPost(otherToken, { title: 'Terceiro' });

    const response = await t.http.get('/posts?limit=2').expect(200);

    expect(response.body).toMatchObject({ page: 1, limit: 2, total: 3 });
    expect(response.body.items).toHaveLength(2);
    expect(response.body.items[0].id).toBe(last.id);
    await t.http.get(`/posts/${last.id}`).expect(200);
    await t.http.get('/posts?limit=51').expect(400);
  });

  it('POST /posts sets author and authorId from the logged-in user', async () => {
    const created = await createPost(teacherToken);

    expect(created).toMatchObject({
      ...post,
      author: teacher.name,
      authorId: teacher.id,
    });
    expect(created).not.toHaveProperty('__v');
  });

  it('POST with createdAt, author, authorId or an unknown field answers 400', async () => {
    const bodies = [
      { ...post, createdAt: '2026-01-01T00:00:00.000Z' },
      { ...post, author: 'Outra Pessoa' },
      { ...post, authorId: '507f1f77bcf86cd799439011' },
      { ...post, extra: true },
    ];

    for (const body of bodies) {
      const response = await t.http
        .post('/posts')
        .set(auth(teacherToken))
        .send(body)
        .expect(400);
      expect(response.body.message).toBe('Validation failed');
    }
  });

  it('a title with 201 chars and a content with 20001 chars answer 400', async () => {
    await t.http
      .post('/posts')
      .set(auth(teacherToken))
      .send({ ...post, title: 'a'.repeat(201) })
      .expect(400);
    await t.http
      .post('/posts')
      .set(auth(teacherToken))
      .send({ ...post, content: 'a'.repeat(20001) })
      .expect(400);
    await t.http
      .post('/posts')
      .set(auth(teacherToken))
      .send({ title: 'a'.repeat(200), content: 'a'.repeat(20000) })
      .expect(201);
  });

  it('a student answers 403 on POST and without login answers 401', async () => {
    await t.http.post('/posts').set(auth(studentToken)).send(post).expect(403);
    await t.http.post('/posts').send(post).expect(401);
  });

  it('the creator can update and delete', async () => {
    const created = await createPost(teacherToken);

    const updated = await t.http
      .put(`/posts/${created.id}`)
      .set(auth(teacherToken))
      .send({ title: 'Titulo novo' })
      .expect(200);
    expect(updated.body).toMatchObject({
      title: 'Titulo novo',
      content: post.content,
      authorId: teacher.id,
    });

    await t.http
      .delete(`/posts/${created.id}`)
      .set(auth(teacherToken))
      .expect(204);
    await t.http.get(`/posts/${created.id}`).expect(404);
  });

  it('another teacher answers 403 on PUT and on DELETE, and the post does not change', async () => {
    const created = await createPost(teacherToken);

    await t.http
      .put(`/posts/${created.id}`)
      .set(auth(otherToken))
      .send({ title: 'Invasao' })
      .expect(403);
    await t.http
      .delete(`/posts/${created.id}`)
      .set(auth(otherToken))
      .expect(403);

    const stored = await t.http.get(`/posts/${created.id}`).expect(200);
    expect(stored.body.title).toBe(post.title);
  });

  it('the master answers 403 on PUT of another teacher post, but can DELETE it', async () => {
    const created = await createPost(teacherToken);

    await t.http
      .put(`/posts/${created.id}`)
      .set(auth(masterToken))
      .send({ title: 'Master editou' })
      .expect(403);
    await t.http
      .delete(`/posts/${created.id}`)
      .set(auth(masterToken))
      .expect(204);
    await t.http.get(`/posts/${created.id}`).expect(404);
  });

  it('search is public and returns paginated matches in title or content', async () => {
    await createPost(teacherToken, {
      title: 'Fotossintese',
      content: 'As plantas usam clorofila.',
    });
    await createPost(otherToken, {
      title: 'Revisao de matematica',
      content: 'Funcao do primeiro grau.',
    });

    const byContent = await t.http
      .get('/posts/search?term=clorofila')
      .expect(200);
    expect(byContent.body.total).toBe(1);
    expect(byContent.body.items[0].title).toBe('Fotossintese');

    const byTitle = await t.http
      .get('/posts/search?term=MATEMATICA&limit=1')
      .expect(200);
    expect(byTitle.body).toMatchObject({ page: 1, limit: 1, total: 1 });
  });

  it('search with "c++ (a" answers 200', async () => {
    const response = await t.http
      .get('/posts/search')
      .query({ term: 'c++ (a' })
      .expect(200);

    expect(response.body.items).toEqual([]);
  });

  it('search with only spaces or with 101 chars answers 400', async () => {
    await t.http.get('/posts/search').query({ term: '   ' }).expect(400);
    await t.http
      .get('/posts/search')
      .query({ term: 'a'.repeat(101) })
      .expect(400);
    await t.http.get('/posts/search').expect(400);
  });

  it('posts of a soft-deleted teacher stay listed; restoring the account gives control back', async () => {
    const leaving = await t.createUser({
      email: 'saindo@escola.com.br',
      role: 'teacher',
    });
    const leavingToken = await t.signIn(leaving.email);
    const created = await createPost(leavingToken);
    await t.users.softDelete(leaving.id, ['teacher']);

    await t.http.get(`/posts/${created.id}`).expect(200);
    await t.http
      .put(`/posts/${created.id}`)
      .set(auth(leavingToken))
      .send({ title: 'X' })
      .expect(401);

    await t.http
      .post(`/users/${leaving.id}/restore`)
      .set(auth(masterToken))
      .expect(200);
    const backToken = await t.signIn(leaving.email);
    await t.http
      .put(`/posts/${created.id}`)
      .set(auth(backToken))
      .send({ title: 'De volta' })
      .expect(200);
  });

  it('a new account with the same name as the author answers 403 on PUT and DELETE', async () => {
    const created = await createPost(teacherToken);
    const homonym = await t.createUser({
      name: teacher.name,
      email: 'homonimo@escola.com.br',
      role: 'teacher',
    });
    const homonymToken = await t.signIn(homonym.email);

    await t.http
      .put(`/posts/${created.id}`)
      .set(auth(homonymToken))
      .send({ title: 'X' })
      .expect(403);
    await t.http
      .delete(`/posts/${created.id}`)
      .set(auth(homonymToken))
      .expect(403);
  });

  it('an invalid or missing id answers 404 on GET, PUT and DELETE', async () => {
    for (const id of ['nao-e-um-id', '507f1f77bcf86cd799439011']) {
      await t.http.get(`/posts/${id}`).expect(404);
      await t.http
        .put(`/posts/${id}`)
        .set(auth(teacherToken))
        .send({ title: 'X' })
        .expect(404);
      await t.http.delete(`/posts/${id}`).set(auth(teacherToken)).expect(404);
    }
  });
});

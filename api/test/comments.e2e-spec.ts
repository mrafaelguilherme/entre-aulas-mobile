import { IComment } from '../src/posts/models/comment.interface';
import { IPost } from '../src/posts/models/post.interface';
import { CommentRepository } from '../src/posts/repositories/comment.repository';
import { IUser } from '../src/users/models/user.interface';
import { auth, createTestApp, MASTER, TestApp } from './support/test-app';

const post = { title: 'Aula de teste', content: 'Conteudo da aula' };

describe('Comments (e2e)', () => {
  let t: TestApp;
  let masterToken: string;
  let teacher: IUser;
  let teacherToken: string;
  let student: IUser;
  let studentToken: string;
  let otherStudentToken: string;
  let targetPost: IPost;

  async function comment(
    token: string,
    content = 'Otima aula!',
  ): Promise<IComment> {
    const response = await t.http
      .post(`/posts/${targetPost.id}/comments`)
      .set(auth(token))
      .send({ content })
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
    student = await t.createUser({
      email: 'bia@escola.com.br',
      role: 'student',
    });
    const otherStudent = await t.createUser({
      email: 'caio@escola.com.br',
      role: 'student',
    });
    teacherToken = await t.signIn(teacher.email);
    studentToken = await t.signIn(student.email);
    otherStudentToken = await t.signIn(otherStudent.email);
    targetPost = (
      await t.http.post('/posts').set(auth(teacherToken)).send(post).expect(201)
    ).body;
  });

  afterAll(() => t.close());

  it('a student, a teacher and the master can comment; author and authorId come from the user', async () => {
    const byStudent = await comment(studentToken, 'Primeiro');
    const byTeacher = await comment(teacherToken, 'Segundo');
    const byMaster = await comment(masterToken, 'Terceiro');

    expect(byStudent).toMatchObject({
      postId: targetPost.id,
      content: 'Primeiro',
      author: student.name,
      authorId: student.id,
    });
    expect(byTeacher.authorId).toBe(teacher.id);
    expect(byMaster.author).toBe('Master');
  });

  it('GET /posts/:id/comments is public, paginated and oldest first', async () => {
    const response = await t.http
      .get(`/posts/${targetPost.id}/comments?limit=2`)
      .expect(200);

    expect(response.body).toMatchObject({ page: 1, limit: 2, total: 3 });
    expect(response.body.items.map((item: IComment) => item.content)).toEqual([
      'Primeiro',
      'Segundo',
    ]);
  });

  it('without login, POST answers 401', async () => {
    await t.http
      .post(`/posts/${targetPost.id}/comments`)
      .send({ content: 'Anonimo' })
      .expect(401);
  });

  it('commenting on a missing or invalid post answers 404 and creates nothing', async () => {
    for (const id of ['507f1f77bcf86cd799439011', 'nao-e-um-id']) {
      await t.http
        .post(`/posts/${id}/comments`)
        .set(auth(studentToken))
        .send({ content: 'Perdido' })
        .expect(404);
      await t.http.get(`/posts/${id}/comments`).expect(404);
    }
  });

  it('a comment with 1001 chars, an empty one or an extra field answers 400', async () => {
    const bodies = [
      { content: 'a'.repeat(1001) },
      { content: '   ' },
      { content: 'Ok', author: 'Outra Pessoa' },
      {},
    ];

    for (const body of bodies) {
      await t.http
        .post(`/posts/${targetPost.id}/comments`)
        .set(auth(studentToken))
        .send(body)
        .expect(400);
    }
  });

  it('a student can delete their own comment, and answers 403 on another one', async () => {
    const own = await comment(studentToken, 'Meu comentario');
    const foreign = await comment(otherStudentToken, 'Comentario alheio');

    await t.http
      .delete(`/comments/${foreign.id}`)
      .set(auth(studentToken))
      .expect(403);
    await t.http
      .delete(`/comments/${own.id}`)
      .set(auth(studentToken))
      .expect(204);
    await t.http
      .delete(`/comments/${own.id}`)
      .set(auth(studentToken))
      .expect(404);
  });

  it('a teacher and the master can delete any comment', async () => {
    const first = await comment(studentToken, 'Apagado pelo professor');
    const second = await comment(studentToken, 'Apagado pelo master');

    await t.http
      .delete(`/comments/${first.id}`)
      .set(auth(teacherToken))
      .expect(204);
    await t.http
      .delete(`/comments/${second.id}`)
      .set(auth(masterToken))
      .expect(204);
  });

  it('comments of a soft-deleted account stay visible', async () => {
    const leaving = await t.createUser({
      email: 'saindo@escola.com.br',
      role: 'student',
    });
    const created = await comment(await t.signIn(leaving.email), 'Fico aqui');
    await t.users.softDelete(leaving.id, ['student']);

    const response = await t.http
      .get(`/posts/${targetPost.id}/comments?limit=50`)
      .expect(200);
    const ids = response.body.items.map((item: IComment) => item.id);
    expect(ids).toContain(created.id);
  });

  it('deleting a post removes its comments', async () => {
    const doomed = (
      await t.http.post('/posts').set(auth(teacherToken)).send(post).expect(201)
    ).body;
    const created = await t.http
      .post(`/posts/${doomed.id}/comments`)
      .set(auth(studentToken))
      .send({ content: 'Vou sumir' })
      .expect(201);

    await t.http
      .delete(`/posts/${doomed.id}`)
      .set(auth(teacherToken))
      .expect(204);

    const comments = t.app.get(CommentRepository);
    await expect(comments.findById(created.body.id)).resolves.toBeNull();
    await t.http.get(`/posts/${doomed.id}/comments`).expect(404);
  });

  it('an invalid or missing comment id answers 404', async () => {
    await t.http
      .delete('/comments/nao-e-um-id')
      .set(auth(masterToken))
      .expect(404);
    await t.http
      .delete('/comments/507f1f77bcf86cd799439011')
      .set(auth(masterToken))
      .expect(404);
  });
});

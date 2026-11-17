import { IUser } from '../src/users/models/user.interface';
import {
  auth,
  createTestApp,
  MASTER,
  PASSWORD,
  TestApp,
} from './support/test-app';

const post = { title: 'Aula de teste', content: 'Conteudo da aula' };

describe('Users: deleted accounts and password reset (e2e)', () => {
  let t: TestApp;
  let masterToken: string;
  let masterId: string;
  let teacherToken: string;

  beforeAll(async () => {
    t = await createTestApp();
    masterToken = await t.signIn(MASTER.email, MASTER.password);
    masterId = (await t.http.get('/me').set(auth(masterToken))).body.id;
    const teacher = await t.createUser({
      email: 'ana@escola.com.br',
      role: 'teacher',
    });
    teacherToken = await t.signIn(teacher.email);
  });

  afterAll(() => t.close());

  it('GET /users/deleted lists soft-deleted teachers and students, paginated', async () => {
    const teacher = await t.createUser({
      email: 'prof-excluido@escola.com.br',
      role: 'teacher',
    });
    const student = await t.createUser({
      email: 'aluno-excluido@escola.com.br',
      role: 'student',
    });
    await t.users.softDelete(teacher.id, ['teacher']);
    await t.users.softDelete(student.id, ['student']);

    const response = await t.http
      .get('/users/deleted?limit=1')
      .set(auth(masterToken))
      .expect(200);
    expect(response.body).toMatchObject({ page: 1, limit: 1, total: 2 });
    expect(response.body.items[0].status).toBe('deleted');

    const all = await t.http
      .get('/users/deleted')
      .set(auth(masterToken))
      .expect(200);
    const ids = all.body.items.map((item: IUser) => item.id).sort();
    expect(ids).toEqual([teacher.id, student.id].sort());
  });

  it('a teacher answers 403 on every /users route', async () => {
    await t.http.get('/users/deleted').set(auth(teacherToken)).expect(403);
    await t.http
      .post(`/users/${masterId}/restore`)
      .set(auth(teacherToken))
      .expect(403);
    await t.http
      .post(`/users/${masterId}/reset-password`)
      .set(auth(teacherToken))
      .send({ password: 'senha-provisoria-123' })
      .expect(403);
  });

  it('restore gives access back, but the old token still answers 401', async () => {
    const student = await t.createUser({
      email: 'voltar@escola.com.br',
      role: 'student',
    });
    const oldToken = await t.signIn(student.email);
    await t.users.softDelete(student.id, ['student']);

    const response = await t.http
      .post(`/users/${student.id}/restore`)
      .set(auth(masterToken))
      .expect(200);
    expect(response.body).toMatchObject({ id: student.id, status: 'active' });

    await t.http.get('/me').set(auth(oldToken)).expect(401);
    await t.signIn(student.email);
  });

  it('restore on an account that is not deleted answers 404', async () => {
    const active = await t.createUser({
      email: 'ativa@escola.com.br',
      role: 'student',
    });

    await t.http
      .post(`/users/${active.id}/restore`)
      .set(auth(masterToken))
      .expect(404);
  });

  it('reset-password sets mustChangePassword, the old token answers 401 and protected routes answer PASSWORD_CHANGE_REQUIRED', async () => {
    const teacher = await t.createUser({
      email: 'esqueceu@escola.com.br',
      role: 'teacher',
    });
    const oldToken = await t.signIn(teacher.email);
    const provisional = 'senha-provisoria-123';

    await t.http
      .post(`/users/${teacher.id}/reset-password`)
      .set(auth(masterToken))
      .send({ password: provisional })
      .expect(204);

    await t.http.get('/me').set(auth(oldToken)).expect(401);
    await t.http
      .post('/auth/signin')
      .send({ email: teacher.email, password: PASSWORD })
      .expect(401);

    const newToken = await t.signIn(teacher.email, provisional);
    const me = await t.http.get('/me').set(auth(newToken)).expect(200);
    expect(me.body.mustChangePassword).toBe(true);

    const blocked = await t.http
      .post('/posts')
      .set(auth(newToken))
      .send(post)
      .expect(403);
    expect(blocked.body.code).toBe('PASSWORD_CHANGE_REQUIRED');

    await t.http
      .put('/me/password')
      .set(auth(newToken))
      .send({ currentPassword: provisional, newPassword: PASSWORD })
      .expect(204);
    const finalToken = await t.signIn(teacher.email);
    await t.http.post('/posts').set(auth(finalToken)).send(post).expect(201);
  });

  it('reset-password on the master own id answers 403', async () => {
    await t.http
      .post(`/users/${masterId}/reset-password`)
      .set(auth(masterToken))
      .send({ password: 'senha-provisoria-123' })
      .expect(403);
  });

  it('reset-password with fewer than 15 chars or on an unknown id answers 400 or 404', async () => {
    const student = await t.createUser({
      email: 'curta@escola.com.br',
      role: 'student',
    });

    await t.http
      .post(`/users/${student.id}/reset-password`)
      .set(auth(masterToken))
      .send({ password: 'curta-14-chars' })
      .expect(400);
    await t.http
      .post('/users/507f1f77bcf86cd799439011/reset-password')
      .set(auth(masterToken))
      .send({ password: 'senha-provisoria-123' })
      .expect(404);
  });
});

import { IUser } from '../src/users/models/user.interface';
import {
  auth,
  createTestApp,
  MASTER,
  PASSWORD,
  TestApp,
} from './support/test-app';

const FORBIDDEN_KEYS = [
  'password',
  'tokenVersion',
  'failedLoginCount',
  'lockedUntil',
];

describe('Teachers (e2e)', () => {
  let t: TestApp;
  let masterToken: string;
  let masterId: string;
  let teacher: IUser;
  let teacherToken: string;
  let other: IUser;
  let studentToken: string;

  const invite = {
    name: 'Marina Alves',
    email: 'marina@escola.com.br',
    password: 'senha-da-marina-123',
  };
  let invitedId: string;

  beforeAll(async () => {
    t = await createTestApp();
    masterToken = await t.signIn(MASTER.email, MASTER.password);
    masterId = (await t.http.get('/me').set(auth(masterToken))).body.id;
    teacher = await t.createUser({
      email: 'ana@escola.com.br',
      role: 'teacher',
    });
    other = await t.createUser({
      email: 'carlos@escola.com.br',
      role: 'teacher',
    });
    const student = await t.createUser({
      email: 'bia@escola.com.br',
      role: 'student',
    });
    teacherToken = await t.signIn(teacher.email);
    studentToken = await t.signIn(student.email);
  });

  afterAll(() => t.close());

  it('GET /teachers lists teachers and the master, paginated, pending first, and hides students', async () => {
    const pending = await t.createUser({
      email: 'pendente@escola.com.br',
      role: 'teacher',
      status: 'pending',
    });

    const page = await t.http
      .get('/teachers?limit=2')
      .set(auth(teacherToken))
      .expect(200);
    expect(page.body).toMatchObject({ page: 1, limit: 2, total: 4 });
    expect(page.body.items).toHaveLength(2);
    expect(page.body.items[0].id).toBe(pending.id);

    const all = await t.http
      .get('/teachers')
      .set(auth(teacherToken))
      .expect(200);
    const roles = new Set(all.body.items.map((item: IUser) => item.role));
    expect([...roles].sort()).toEqual(['master', 'teacher']);
  });

  it('GET /teachers?status=pending returns only pending; limit=51 answers 400', async () => {
    const pending = await t.http
      .get('/teachers?status=pending')
      .set(auth(masterToken))
      .expect(200);
    expect(pending.body.total).toBe(1);
    expect(pending.body.items[0].status).toBe('pending');

    await t.http.get('/teachers?limit=51').set(auth(masterToken)).expect(400);
  });

  it('a teacher POST creates a pending account with invitedBy = actor', async () => {
    const response = await t.http
      .post('/teachers')
      .set(auth(teacherToken))
      .send(invite)
      .expect(201);

    expect(response.body).toMatchObject({
      name: invite.name,
      email: invite.email,
      role: 'teacher',
      status: 'pending',
      mustChangePassword: true,
      invitedBy: teacher.id,
    });
    invitedId = response.body.id;
  });

  it('a pending account cannot log in, with the generic 401', async () => {
    const response = await t.http
      .post('/auth/signin')
      .send({ email: invite.email, password: invite.password })
      .expect(401);

    expect(response.body.message).toBe('Invalid credentials');
  });

  it('a master POST creates an active account with mustChangePassword true', async () => {
    const response = await t.http
      .post('/teachers')
      .set(auth(masterToken))
      .send({ ...invite, email: 'direto@escola.com.br' })
      .expect(201);

    expect(response.body).toMatchObject({
      status: 'active',
      mustChangePassword: true,
      invitedBy: masterId,
    });
  });

  it('responses never contain password, tokenVersion, failedLoginCount or lockedUntil', async () => {
    const list = await t.http
      .get('/teachers')
      .set(auth(masterToken))
      .expect(200);
    const one = await t.http
      .get(`/teachers/${teacher.id}`)
      .set(auth(masterToken))
      .expect(200);

    for (const item of [...list.body.items, one.body]) {
      for (const key of FORBIDDEN_KEYS) {
        expect(item).not.toHaveProperty(key);
      }
    }
  });

  it('a body with role, status or an unknown field answers 400', async () => {
    const bodies = [
      { ...invite, email: 'a@escola.com.br', role: 'master' },
      { ...invite, email: 'b@escola.com.br', status: 'active' },
      { ...invite, email: 'c@escola.com.br', admin: true },
    ];

    for (const body of bodies) {
      const response = await t.http
        .post('/teachers')
        .set(auth(masterToken))
        .send(body)
        .expect(400);
      expect(response.body.message).toBe('Validation failed');
    }
  });

  it('a password shorter than 15 chars answers 400', async () => {
    const response = await t.http
      .post('/teachers')
      .set(auth(masterToken))
      .send({
        ...invite,
        email: 'curta@escola.com.br',
        password: 'curta-14-chars',
      })
      .expect(400);

    expect(response.body.errors).toHaveProperty('password');
  });

  it('a duplicate email answers 409, on create and on update', async () => {
    const created = await t.http
      .post('/teachers')
      .set(auth(masterToken))
      .send({ ...invite, email: teacher.email })
      .expect(409);
    expect(created.body.message).toBe('Email is unavailable');

    await t.http
      .put(`/teachers/${other.id}`)
      .set(auth(masterToken))
      .send({ email: teacher.email })
      .expect(409);
  });

  it('a teacher can update their own name', async () => {
    const response = await t.http
      .put(`/teachers/${teacher.id}`)
      .set(auth(teacherToken))
      .send({ name: 'Ana Maria Silva' })
      .expect(200);

    expect(response.body).toMatchObject({
      id: teacher.id,
      name: 'Ana Maria Silva',
    });
  });

  it('a teacher updating another teacher answers 403; the master succeeds', async () => {
    await t.http
      .put(`/teachers/${other.id}`)
      .set(auth(teacherToken))
      .send({ name: 'Invasor' })
      .expect(403);

    const response = await t.http
      .put(`/teachers/${other.id}`)
      .set(auth(masterToken))
      .send({ name: 'Carlos Lima' })
      .expect(200);
    expect(response.body.name).toBe('Carlos Lima');
  });

  it('PUT with a password field answers 400, even for the master', async () => {
    await t.http
      .put(`/teachers/${other.id}`)
      .set(auth(masterToken))
      .send({ password: 'senha-trocada-pelo-master' })
      .expect(400);

    await t.http
      .put(`/teachers/${other.id}`)
      .set(auth(masterToken))
      .send({})
      .expect(400);
  });

  it('DELETE by the master soft-deletes: GET answers 404 and the old token answers 401', async () => {
    const victim = await t.createUser({
      email: 'apagar@escola.com.br',
      role: 'teacher',
    });
    const victimToken = await t.signIn(victim.email);

    await t.http
      .delete(`/teachers/${victim.id}`)
      .set(auth(teacherToken))
      .expect(403);
    await t.http
      .delete(`/teachers/${victim.id}`)
      .set(auth(masterToken))
      .expect(204);
    await t.http
      .get(`/teachers/${victim.id}`)
      .set(auth(masterToken))
      .expect(404);
    await t.http.get('/me').set(auth(victimToken)).expect(401);
  });

  it('the email of a soft-deleted teacher stays reserved: POST answers 409', async () => {
    await t.http
      .post('/teachers')
      .set(auth(masterToken))
      .send({ ...invite, email: 'apagar@escola.com.br' })
      .expect(409);
  });

  it('the master deleting themselves answers 403', async () => {
    await t.http
      .delete(`/teachers/${masterId}`)
      .set(auth(masterToken))
      .expect(403);
    await t.http.get('/me').set(auth(masterToken)).expect(200);
  });

  it('approve by a teacher answers 403; by the master activates the account, which can then log in', async () => {
    await t.http
      .post(`/teachers/${invitedId}/approve`)
      .set(auth(teacherToken))
      .expect(403);

    const response = await t.http
      .post(`/teachers/${invitedId}/approve`)
      .set(auth(masterToken))
      .expect(200);
    expect(response.body).toMatchObject({ id: invitedId, status: 'active' });

    await t.signIn(invite.email, invite.password);
  });

  it('a second approve answers 404', async () => {
    await t.http
      .post(`/teachers/${invitedId}/approve`)
      .set(auth(masterToken))
      .expect(404);
  });

  it('reject removes a pending account and frees the email', async () => {
    const pending = await t.http
      .post('/teachers')
      .set(auth(teacherToken))
      .send({ ...invite, email: 'recusar@escola.com.br' })
      .expect(201);

    await t.http
      .post(`/teachers/${pending.body.id}/reject`)
      .set(auth(masterToken))
      .expect(204);
    await t.http
      .get(`/teachers/${pending.body.id}`)
      .set(auth(masterToken))
      .expect(404);
    await t.http
      .post('/teachers')
      .set(auth(masterToken))
      .send({ ...invite, email: 'recusar@escola.com.br' })
      .expect(201);
  });

  it('reject on an active account answers 404 and keeps it', async () => {
    await t.http
      .post(`/teachers/${other.id}/reject`)
      .set(auth(masterToken))
      .expect(404);
    await t.http
      .get(`/teachers/${other.id}`)
      .set(auth(masterToken))
      .expect(200);
  });

  it('a student answers 403 on /teachers', async () => {
    await t.http.get('/teachers').set(auth(studentToken)).expect(403);
    await t.http
      .post('/teachers')
      .set(auth(studentToken))
      .send(invite)
      .expect(403);
  });

  it('an invalid id answers 404', async () => {
    await t.http
      .get('/teachers/nao-e-um-id')
      .set(auth(masterToken))
      .expect(404);
    await t.http
      .put('/teachers/nao-e-um-id')
      .set(auth(masterToken))
      .send({ name: 'Qualquer' })
      .expect(404);
  });

  it('a teacher signs in with the shared test password', async () => {
    await t.http
      .post('/auth/signin')
      .send({ email: other.email, password: PASSWORD })
      .expect(200);
  });
});

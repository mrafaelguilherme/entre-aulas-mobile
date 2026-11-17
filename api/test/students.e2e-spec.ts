import { IUser } from '../src/users/models/user.interface';
import { auth, createTestApp, MASTER, TestApp } from './support/test-app';

const newStudent = {
  name: 'Beatriz Souza',
  email: 'beatriz@escola.com.br',
  password: 'senha-da-beatriz-123',
};

describe('Students (e2e)', () => {
  let t: TestApp;
  let masterToken: string;
  let masterId: string;
  let teacher: IUser;
  let teacherToken: string;
  let studentToken: string;

  beforeAll(async () => {
    t = await createTestApp();
    masterToken = await t.signIn(MASTER.email, MASTER.password);
    masterId = (await t.http.get('/me').set(auth(masterToken))).body.id;
    teacher = await t.createUser({
      email: 'ana@escola.com.br',
      role: 'teacher',
    });
    teacherToken = await t.signIn(teacher.email);
    const student = await t.createUser({
      email: 'aluno@escola.com.br',
      role: 'student',
    });
    studentToken = await t.signIn(student.email);
  });

  afterAll(() => t.close());

  it('a teacher can create, list, read, update and delete students', async () => {
    const created = await t.http
      .post('/students')
      .set(auth(teacherToken))
      .send(newStudent)
      .expect(201);
    expect(created.body).toMatchObject({
      name: newStudent.name,
      email: newStudent.email,
      role: 'student',
      status: 'active',
      mustChangePassword: true,
      invitedBy: teacher.id,
    });
    expect(created.body).not.toHaveProperty('password');

    const list = await t.http
      .get('/students')
      .set(auth(teacherToken))
      .expect(200);
    expect(list.body).toMatchObject({ page: 1, limit: 20, total: 2 });
    expect(
      list.body.items.every((item: IUser) => item.role === 'student'),
    ).toBe(true);

    await t.http
      .get(`/students/${created.body.id}`)
      .set(auth(teacherToken))
      .expect(200);

    const updated = await t.http
      .put(`/students/${created.body.id}`)
      .set(auth(teacherToken))
      .send({ name: 'Bia Souza' })
      .expect(200);
    expect(updated.body.name).toBe('Bia Souza');

    await t.http
      .delete(`/students/${created.body.id}`)
      .set(auth(teacherToken))
      .expect(204);
    await t.http
      .get(`/students/${created.body.id}`)
      .set(auth(teacherToken))
      .expect(404);
  });

  it('the master can do the same', async () => {
    const created = await t.http
      .post('/students')
      .set(auth(masterToken))
      .send({ ...newStudent, email: 'master-criou@escola.com.br' })
      .expect(201);

    await t.http.get('/students').set(auth(masterToken)).expect(200);
    await t.http
      .put(`/students/${created.body.id}`)
      .set(auth(masterToken))
      .send({ name: 'Outro Nome' })
      .expect(200);
    await t.http
      .delete(`/students/${created.body.id}`)
      .set(auth(masterToken))
      .expect(204);
  });

  it('GET, PUT and DELETE /students/:id with the master id answer 404 and change nothing', async () => {
    await t.http
      .get(`/students/${masterId}`)
      .set(auth(teacherToken))
      .expect(404);
    await t.http
      .put(`/students/${masterId}`)
      .set(auth(teacherToken))
      .send({ name: 'Invasor' })
      .expect(404);
    await t.http
      .delete(`/students/${masterId}`)
      .set(auth(teacherToken))
      .expect(404);

    const master = await t.http.get('/me').set(auth(masterToken)).expect(200);
    expect(master.body.name).toBe('Master');
  });

  it('GET, PUT and DELETE /students/:id with a teacher id answer 404 and change nothing', async () => {
    await t.http
      .get(`/students/${teacher.id}`)
      .set(auth(masterToken))
      .expect(404);
    await t.http
      .put(`/students/${teacher.id}`)
      .set(auth(masterToken))
      .send({ name: 'Invasor' })
      .expect(404);
    await t.http
      .delete(`/students/${teacher.id}`)
      .set(auth(masterToken))
      .expect(404);

    await t.http.get('/me').set(auth(teacherToken)).expect(200);
  });

  it('POST or PUT with password, role or status answers 400', async () => {
    const student = await t.createUser({
      email: 'editar@escola.com.br',
      role: 'student',
    });
    const bodies = [
      { password: 'senha-trocada-por-professor' },
      { role: 'teacher' },
      { status: 'deleted' },
    ];

    for (const body of bodies) {
      await t.http
        .put(`/students/${student.id}`)
        .set(auth(teacherToken))
        .send(body)
        .expect(400);
    }
    await t.http
      .post('/students')
      .set(auth(teacherToken))
      .send({ ...newStudent, email: 'x@escola.com.br', role: 'teacher' })
      .expect(400);
  });

  it('DELETE soft-deletes: the student cannot log in, with the generic 401', async () => {
    const created = await t.http
      .post('/students')
      .set(auth(teacherToken))
      .send({ ...newStudent, email: 'sair@escola.com.br' })
      .expect(201);
    const token = await t.signIn('sair@escola.com.br', newStudent.password);

    await t.http
      .delete(`/students/${created.body.id}`)
      .set(auth(teacherToken))
      .expect(204);

    const login = await t.http
      .post('/auth/signin')
      .send({ email: 'sair@escola.com.br', password: newStudent.password })
      .expect(401);
    expect(login.body.message).toBe('Invalid credentials');
    await t.http.get('/me').set(auth(token)).expect(401);
  });

  it('a student answers 403 on every /students route', async () => {
    await t.http.get('/students').set(auth(studentToken)).expect(403);
    await t.http
      .post('/students')
      .set(auth(studentToken))
      .send(newStudent)
      .expect(403);
  });

  it('an unknown or invalid id answers 404', async () => {
    await t.http
      .get('/students/507f1f77bcf86cd799439011')
      .set(auth(teacherToken))
      .expect(404);
    await t.http
      .get('/students/nao-e-um-id')
      .set(auth(teacherToken))
      .expect(404);
  });
});

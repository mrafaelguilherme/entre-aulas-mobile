import { Logger } from '@nestjs/common';
import {
  auth,
  createTestApp,
  MASTER,
  PASSWORD,
  TestApp,
} from './support/test-app';

const post = { title: 'Aula de teste', content: 'Conteudo da aula' };

describe('Hardening (e2e)', () => {
  describe('default app: headers, docs off and logs', () => {
    let t: TestApp;

    beforeAll(async () => {
      t = await createTestApp();
    });

    afterAll(() => t.close());
    afterEach(() => jest.restoreAllMocks());

    it('responses carry the security headers and hide x-powered-by', async () => {
      const response = await t.http.get('/posts').expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(response.headers['content-security-policy']).toContain(
        "default-src 'self'",
      );
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('/api and /api-json answer 404 when ENABLE_API_DOCS is false', async () => {
      await t.http.get('/api').expect(404);
      await t.http.get('/api-json').expect(404);
    });

    it('/docs answers 404: the Redoc is gone', async () => {
      await t.http.get('/docs').expect(404);
    });

    it('logs of a failed login contain the event, but not the password or a token', async () => {
      const warn = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined);
      const user = await t.createUser({
        email: 'ana@escola.com.br',
        role: 'teacher',
      });
      const token = await t.signIn(user.email);

      await t.http
        .post('/auth/signin')
        .send({ email: user.email, password: 'senha-errada-mas-longa' })
        .expect(401);

      const messages = warn.mock.calls.map((call) => String(call[0]));
      expect(messages.some((m) => m.includes('Failed login'))).toBe(true);
      for (const message of messages) {
        expect(message).not.toContain('senha-errada-mas-longa');
        expect(message).not.toContain(PASSWORD);
        expect(message).not.toContain(token);
      }
    });

    it('a write by the master logs method, route, actor and id, but not the body', async () => {
      const masterToken = await t.signIn(MASTER.email, MASTER.password);
      const masterId = (await t.http.get('/me').set(auth(masterToken))).body.id;
      const teacher = await t.createUser({
        email: 'carlos@escola.com.br',
        role: 'teacher',
      });
      const log = jest
        .spyOn(Logger.prototype, 'log')
        .mockImplementation(() => undefined);

      await t.http
        .put(`/teachers/${teacher.id}`)
        .set(auth(masterToken))
        .send({ name: 'Nome Secreto' })
        .expect(200);

      const audit = log.mock.calls
        .map((call) => String(call[0]))
        .filter((m) => m.startsWith('[audit]'));
      expect(audit).toHaveLength(1);
      expect(audit[0]).toContain('PUT /teachers/:id');
      expect(audit[0]).toContain(masterId);
      expect(audit[0]).toContain(teacher.id);
      expect(audit[0]).not.toContain('Nome Secreto');
    });

    it('a write by a teacher logs nothing from the audit interceptor', async () => {
      const teacher = await t.createUser({
        email: '../users/',
        role: 'teacher',
      });
      const teacherToken = await t.signIn(teacher.email);
      const log = jest
        .spyOn(Logger.prototype, 'log')
        .mockImplementation(() => undefined);

      await t.http
        .post('/posts')
        .set(auth(teacherToken))
        .send(post)
        .expect(201);

      const audit = log.mock.calls
        .map((call) => String(call[0]))
        .filter((m) => m.startsWith('[audit]'));
      expect(audit).toHaveLength(0);
    });
  });

  describe('with docs on', () => {
    let t: TestApp;

    beforeAll(async () => {
      t = await createTestApp({ docs: true });
    });

    afterAll(() => t.close());

    it('/api and /api-json answer 200', async () => {
      const page = await t.http.get('/api').expect(200);
      expect(page.headers['content-type']).toContain('text/html');
      await t.http.get('/api-json').expect(200);
    });

    it('/api-json describes the body of POST /posts from its schema', async () => {
      const response = await t.http.get('/api-json').expect(200);
      const operation = response.body.paths['/posts'].post;
      const body = operation.requestBody.content['application/json'].schema;
      const schema = body.$ref
        ? response.body.components.schemas[body.$ref.split('/').pop()]
        : body;

      expect(schema.properties.title).toMatchObject({ maxLength: 200 });
      expect(schema.properties.content).toMatchObject({ maxLength: 20000 });
      expect(schema.required).toEqual(
        expect.arrayContaining(['title', 'content']),
      );
    });
  });

  describe('with throttling on', () => {
    let t: TestApp;
    let token: string;
    let postId: string;

    // O login acontece antes do teste que esgota o limite de logins.
    beforeAll(async () => {
      t = await createTestApp({ throttle: true });
      const teacher = await t.createUser({
        email: 'limite@escola.com.br',
        role: 'teacher',
      });
      token = await t.signIn(teacher.email);
      const created = await t.http
        .post('/posts')
        .set(auth(token))
        .send(post)
        .expect(201);
      postId = created.body.id;
    });

    afterAll(() => t.close());

    it('the 11th comment in one minute answers 429', async () => {
      for (let attempt = 1; attempt <= 10; attempt++) {
        await t.http
          .post(`/posts/${postId}/comments`)
          .set(auth(token))
          .send({ content: `Comentario ${attempt}` })
          .expect(201);
      }

      await t.http
        .post(`/posts/${postId}/comments`)
        .set(auth(token))
        .send({ content: 'Comentario 11' })
        .expect(429);
    });

    it('the 21st signin in one minute from the same IP answers 429', async () => {
      const body = { email: 'ninguem@escola.com.br', password: PASSWORD };

      // O beforeAll ja gastou 1 dos 20 logins permitidos.
      for (let attempt = 1; attempt <= 19; attempt++) {
        await t.http.post('/auth/signin').send(body).expect(401);
      }

      const response = await t.http.post('/auth/signin').send(body).expect(429);
      expect(response.body.statusCode).toBe(429);
    });
  });
});

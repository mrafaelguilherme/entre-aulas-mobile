import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JWT_AUDIENCE, JWT_ISSUER } from '../src/auth/jwt.options';
import { MasterBootstrapService } from '../src/auth/services/master-bootstrap.service';
import { PasswordService } from '../src/shared/security/password.service';
import { User, UserDocument } from '../src/users/schemas/user.schema';
import {
  auth,
  createTestApp,
  MASTER,
  PASSWORD,
  TestApp,
} from './support/test-app';

const WRONG_PASSWORD = 'senha-errada-mas-longa';
const post = { title: 'Aula de teste', content: 'Conteudo da aula' };

function claimsOf(token: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
}

describe('Auth (e2e)', () => {
  let t: TestApp;
  let teacherToken: string;
  const teacher = { email: 'ana@escola.com.br', role: 'teacher' as const };

  beforeAll(async () => {
    t = await createTestApp();
    await t.createUser(teacher);
    teacherToken = await t.signIn(teacher.email);
  });

  afterAll(() => t.close());

  describe('POST /auth/signin', () => {
    it('returns a token whose claims are sub, ver, iat, exp, iss and aud only', () => {
      const claims = claimsOf(teacherToken);

      expect(Object.keys(claims).sort()).toEqual([
        'aud',
        'exp',
        'iat',
        'iss',
        'sub',
        'ver',
      ]);
    });

    it('has iss "entre-aulas-api", aud "entre-aulas-mobile" and expires in 3600s', () => {
      const claims = claimsOf(teacherToken);

      expect(claims.iss).toBe(JWT_ISSUER);
      expect(claims.aud).toBe(JWT_AUDIENCE);
      expect((claims.exp as number) - (claims.iat as number)).toBe(3600);
    });

    it('normalizes an email written with capital letters and spaces', async () => {
      await t.http
        .post('/auth/signin')
        .send({ email: '  ANA@Escola.com.br ', password: PASSWORD })
        .expect(200);
    });

    it('unknown email, wrong password, pending and soft-deleted answer the same 401', async () => {
      const pending = await t.createUser({
        email: 'pendente@escola.com.br',
        role: 'teacher',
        status: 'pending',
      });
      const deleted = await t.createUser({
        email: 'excluida@escola.com.br',
        role: 'student',
      });
      await t.users.softDelete(deleted.id, ['student']);

      const attempts = [
        { email: 'ninguem@escola.com.br', password: PASSWORD },
        { email: teacher.email, password: WRONG_PASSWORD },
        { email: pending.email, password: PASSWORD },
        { email: deleted.email, password: PASSWORD },
      ];

      for (const body of attempts) {
        const response = await t.http
          .post('/auth/signin')
          .send(body)
          .expect(401);
        expect(response.body.message).toBe('Invalid credentials');
      }
    });

    it('unknown email still runs verifyDummy', async () => {
      const spy = jest.spyOn(t.app.get(PasswordService), 'verifyDummy');

      await t.http
        .post('/auth/signin')
        .send({ email: 'ninguem@escola.com.br', password: PASSWORD })
        .expect(401);

      expect(spy).toHaveBeenCalledWith(PASSWORD);
      spy.mockRestore();
    });

    it('five wrong passwords lock the account: the right password then gets the same 401', async () => {
      const locked = await t.createUser({
        email: 'bloqueada@escola.com.br',
        role: 'student',
      });

      for (let attempt = 1; attempt <= 5; attempt++) {
        await t.http
          .post('/auth/signin')
          .send({ email: locked.email, password: WRONG_PASSWORD })
          .expect(401);
      }

      const response = await t.http
        .post('/auth/signin')
        .send({ email: locked.email, password: PASSWORD })
        .expect(401);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('a correct login resets the failure count', async () => {
      const user = await t.createUser({
        email: 'quase@escola.com.br',
        role: 'student',
      });

      for (let attempt = 1; attempt <= 4; attempt++) {
        await t.http
          .post('/auth/signin')
          .send({ email: user.email, password: WRONG_PASSWORD })
          .expect(401);
      }
      await t.signIn(user.email);

      const stored = await t.users.findForLogin(user.email);
      expect(stored.failedLoginCount).toBe(0);
    });

    it('a body with an extra field answers 400 with message "Validation failed" and errors', async () => {
      const response = await t.http
        .post('/auth/signin')
        .send({ email: teacher.email, password: PASSWORD, role: 'master' })
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /me', () => {
    it('returns the profile without password or tokenVersion', async () => {
      const response = await t.http
        .get('/me')
        .set(auth(teacherToken))
        .expect(200);

      expect(response.body).toEqual({
        id: expect.any(String),
        name: expect.any(String),
        email: teacher.email,
        role: 'teacher',
        status: 'active',
        mustChangePassword: false,
      });
    });

    it('without a token answers 401', async () => {
      await t.http.get('/me').expect(401);
    });

    it('a token signed with alg none, another secret, issuer or audience answers 401', async () => {
      const jwt = t.app.get(JwtService);
      const payload = { sub: claimsOf(teacherToken).sub, ver: 0 };
      const header = Buffer.from(
        JSON.stringify({ alg: 'none', typ: 'JWT' }),
      ).toString('base64url');
      const body = Buffer.from(
        JSON.stringify({
          ...payload,
          iss: JWT_ISSUER,
          aud: JWT_AUDIENCE,
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      ).toString('base64url');

      const forged = [
        `${header}.${body}.`,
        jwt.sign(payload, {
          secret: 'outro-segredo-com-mais-de-32-caracteres',
        }),
        jwt.sign(payload, { issuer: 'outra-api' }),
        jwt.sign(payload, { audience: 'outro-app' }),
      ];

      for (const token of forged) {
        await t.http.get('/me').set(auth(token)).expect(401);
      }
    });

    it('a token is rejected after signout', async () => {
      const user = await t.createUser({
        email: 'saida@escola.com.br',
        role: 'student',
      });
      const token = await t.signIn(user.email);

      await t.http.post('/auth/signout').set(auth(token)).expect(204);
      await t.http.get('/me').set(auth(token)).expect(401);
    });

    it('the role comes from the database: changing it there affects the same token', async () => {
      const model = t.app.get<Model<UserDocument>>(getModelToken(User.name));
      const user = await t.createUser({
        email: 'mutavel@escola.com.br',
        role: 'teacher',
      });
      const token = await t.signIn(user.email);

      await t.http.post('/posts').set(auth(token)).send(post).expect(201);
      await model.updateOne({ _id: user.id }, { $set: { role: 'student' } });
      await t.http.post('/posts').set(auth(token)).send(post).expect(403);
    });
  });

  describe('mustChangePassword', () => {
    let token: string;

    beforeAll(async () => {
      const user = await t.createUser({
        email: 'provisoria@escola.com.br',
        role: 'teacher',
        mustChangePassword: true,
      });
      token = await t.signIn(user.email);
    });

    it('answers 403 with code PASSWORD_CHANGE_REQUIRED on protected routes', async () => {
      const response = await t.http
        .post('/posts')
        .set(auth(token))
        .send(post)
        .expect(403);

      expect(response.body.code).toBe('PASSWORD_CHANGE_REQUIRED');
    });

    it('still allows GET /me, PUT /me/password and POST /auth/signout', async () => {
      await t.http.get('/me').set(auth(token)).expect(200);
      await t.http
        .put('/me/password')
        .set(auth(token))
        .send({ currentPassword: WRONG_PASSWORD, newPassword: PASSWORD })
        .expect(400);
      await t.http.post('/auth/signout').set(auth(token)).expect(204);
    });
  });

  describe('PUT /me/password', () => {
    it('rejects a wrong current password with 400', async () => {
      await t.http
        .put('/me/password')
        .set(auth(teacherToken))
        .send({ currentPassword: WRONG_PASSWORD, newPassword: PASSWORD })
        .expect(400);
    });

    it('rejects a new password shorter than 15 chars with 400', async () => {
      const response = await t.http
        .put('/me/password')
        .set(auth(teacherToken))
        .send({ currentPassword: PASSWORD, newPassword: 'curta-14-chars' })
        .expect(400);

      expect(response.body.errors).toHaveProperty('newPassword');
    });

    it('answers 204, the old token answers 401 and the new password logs in', async () => {
      const user = await t.createUser({
        email: 'troca@escola.com.br',
        role: 'student',
      });
      const token = await t.signIn(user.email);
      const newPassword = 'nova-senha-bem-comprida';

      await t.http
        .put('/me/password')
        .set(auth(token))
        .send({ currentPassword: PASSWORD, newPassword })
        .expect(204);

      await t.http.get('/me').set(auth(token)).expect(401);
      await t.signIn(user.email, newPassword);
    });
  });

  describe('master bootstrap', () => {
    it('creates the master at startup once, with role master, status active and a hashed password', async () => {
      const master = await t.users.findForLogin(MASTER.email);
      expect(master).toMatchObject({
        role: 'master',
        status: 'active',
        mustChangePassword: false,
      });
      expect(master.password).toMatch(/^\$argon2id\$/);

      await t.app.get(MasterBootstrapService).onApplicationBootstrap();
      const masters = await t.users.list({ roles: ['master'] }, 1, 10);
      expect(masters.total).toBe(1);

      await t.signIn(MASTER.email, MASTER.password);
    });
  });
});

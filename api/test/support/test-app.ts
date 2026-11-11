import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Connection } from 'mongoose';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { PasswordService } from '../../src/shared/security/password.service';
import { IUser } from '../../src/users/models/user.interface';
import {
  CreateUserInput,
  UserRepository,
} from '../../src/users/repositories/user.repository';

// Conta master criada pela API ao subir, com os valores de env.ts.
export const MASTER = {
  email: process.env.MASTER_EMAIL,
  password: process.env.MASTER_PASSWORD,
};

// Senha de toda conta criada pelos testes. O hash e calculado uma vez por arquivo.
export const PASSWORD = 'senha-de-teste-com-15';

export type TestAccount = Partial<CreateUserInput> &
  Pick<CreateUserInput, 'email' | 'role'>;

export type TestAppOptions = {
  // Liga a documentacao em /api.
  docs?: boolean;
};

export type TestApp = {
  app: INestApplication;
  http: ReturnType<typeof request>;
  users: UserRepository;
  createUser(input: TestAccount): Promise<IUser>;
  signIn(email: string, password?: string): Promise<string>;
  close(): Promise<void>;
};

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

// O Mongoose cria os indices em segundo plano. Sem esperar, o indice unico
// do e-mail pode nao existir ainda quando o teste de duplicidade rodar.
async function waitForIndexes(connection: Connection): Promise<void> {
  await Promise.all(
    connection.modelNames().map((name) => connection.model(name).init()),
  );
}

export async function createTestApp(
  options: TestAppOptions = {},
): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  app.useLogger(false);
  configureApp(app, { docs: options.docs ?? false });
  await app.init();
  await waitForIndexes(app.get<Connection>(getConnectionToken()));

  const http = request(app.getHttpServer());
  const users = app.get(UserRepository);
  const hash = await app.get(PasswordService).hash(PASSWORD);
  let counter = 0;

  return {
    app,
    http,
    users,
    createUser: (input) =>
      users.create({
        name: `Pessoa ${++counter}`,
        password: hash,
        status: 'active',
        mustChangePassword: false,
        invitedBy: null,
        ...input,
      }),
    async signIn(email, password = PASSWORD) {
      const response = await http
        .post('/auth/signin')
        .send({ email, password })
        .expect(200);
      return response.body.token as string;
    },
    close: () => app.close(),
  };
}

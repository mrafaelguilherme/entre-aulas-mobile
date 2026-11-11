import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model } from 'mongoose';
import { User, UserDocument, UserSchema } from '../../schemas/user.schema';
import { CreateUserInput } from '../user.repository';
import { UserMongooseRepository } from './user.mongoose.repository';

// A primeira execucao baixa o MongoDB de teste; por isso o prazo e longo.
jest.setTimeout(120000);

function input(overrides: Partial<CreateUserInput> = {}): CreateUserInput {
  return {
    name: 'Professora Ana',
    email: 'ana@escola.com.br',
    password: 'hash-de-teste',
    role: 'teacher',
    status: 'active',
    mustChangePassword: false,
    invitedBy: null,
    ...overrides,
  };
}

// Pequena pausa para dois registros nao nascerem no mesmo milissegundo.
const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

describe('UserMongooseRepository', () => {
  let mongod: MongoMemoryServer;
  let moduleRef: TestingModule;
  let repository: UserMongooseRepository;
  let model: Model<UserDocument>;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create({
      instance: { launchTimeout: 60000 },
    });
    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongod.getUri()),
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
      ],
      providers: [UserMongooseRepository],
    }).compile();
    repository = moduleRef.get(UserMongooseRepository);
    model = moduleRef.get(getModelToken(User.name));
    await model.init(); // espera o indice unico do e-mail existir
  });

  afterEach(() => model.deleteMany({}));

  afterAll(async () => {
    await moduleRef.close();
    await mongod.stop();
  });

  it('stores the email in lowercase', async () => {
    const user = await repository.create(input({ email: 'ANA@Escola.com.br' }));

    expect(user.email).toBe('ana@escola.com.br');
  });

  it('rejects a duplicate email with Mongo code 11000', async () => {
    await repository.create(input());

    await expect(repository.create(input())).rejects.toMatchObject({
      code: 11000,
    });
  });

  it('findById hides soft-deleted users and never returns the password', async () => {
    const user = await repository.create(input());

    const found = await repository.findById(user.id);
    expect(found).not.toBeNull();
    expect(found).not.toHaveProperty('password');

    await repository.softDelete(user.id, ['teacher']);
    await expect(repository.findById(user.id)).resolves.toBeNull();
  });

  it('findById with roles returns null when the role does not match', async () => {
    const user = await repository.create(input({ role: 'student' }));

    await expect(repository.findById(user.id, ['teacher'])).resolves.toBeNull();
    await expect(
      repository.findById(user.id, ['student']),
    ).resolves.toMatchObject({ id: user.id });
  });

  it('findById returns null for an id that is not an ObjectId', async () => {
    await expect(repository.findById('nao-e-um-id')).resolves.toBeNull();
  });

  it('findForLogin returns only active accounts, with the password', async () => {
    await repository.create(input());
    await repository.create(
      input({ email: 'pendente@escola.com.br', status: 'pending' }),
    );

    const active = await repository.findForLogin('ANA@escola.com.br');
    expect(active).toMatchObject({ password: 'hash-de-teste' });
    await expect(
      repository.findForLogin('pendente@escola.com.br'),
    ).resolves.toBeNull();
  });

  it('list filters by roles and status, puts pending first, then newest, and reports the total', async () => {
    const older = await repository.create(input({ email: 'a@escola.com.br' }));
    await tick();
    const newer = await repository.create(input({ email: 'b@escola.com.br' }));
    await tick();
    const pending = await repository.create(
      input({ email: 'c@escola.com.br', status: 'pending' }),
    );
    await repository.create(
      input({ email: 'aluno@escola.com.br', role: 'student' }),
    );

    const page = await repository.list({ roles: ['teacher', 'master'] }, 1, 2);
    expect(page.items.map((user) => user.id)).toEqual([pending.id, newer.id]);
    expect(page).toMatchObject({ page: 1, limit: 2, total: 3 });

    const onlyPending = await repository.list(
      { roles: ['teacher'], status: 'pending' },
      1,
      20,
    );
    expect(onlyPending.items.map((user) => user.id)).toEqual([pending.id]);

    const secondPage = await repository.list(
      { roles: ['teacher', 'master'] },
      2,
      2,
    );
    expect(secondPage.items.map((user) => user.id)).toEqual([older.id]);
  });

  it('list without status hides deleted accounts; status deleted returns only them', async () => {
    const active = await repository.create(input({ email: 'a@escola.com.br' }));
    const deleted = await repository.create(
      input({ email: 'b@escola.com.br' }),
    );
    await repository.softDelete(deleted.id, ['teacher']);

    const visible = await repository.list({}, 1, 20);
    expect(visible.items.map((user) => user.id)).toEqual([active.id]);

    const removed = await repository.list({ status: 'deleted' }, 1, 20);
    expect(removed.items.map((user) => user.id)).toEqual([deleted.id]);
  });

  it('updateProfile returns null when the role does not match', async () => {
    const student = await repository.create(input({ role: 'student' }));

    await expect(
      repository.updateProfile(student.id, ['teacher'], { name: 'Outro' }),
    ).resolves.toBeNull();
    await expect(
      repository.updateProfile(student.id, ['student'], { name: 'Outro' }),
    ).resolves.toMatchObject({ name: 'Outro' });
  });

  it('softDelete sets status deleted, raises tokenVersion and keeps the email reserved', async () => {
    const user = await repository.create(input());

    await expect(repository.softDelete(user.id, ['teacher'])).resolves.toBe(
      true,
    );
    const stored = await model.findById(user.id).exec();
    expect(stored).toMatchObject({ status: 'deleted', tokenVersion: 1 });

    await expect(repository.create(input())).rejects.toMatchObject({
      code: 11000,
    });
    await expect(repository.softDelete(user.id, ['teacher'])).resolves.toBe(
      false,
    );
  });

  it('restore sets status active and keeps tokenVersion', async () => {
    const user = await repository.create(input());
    await repository.softDelete(user.id, ['teacher']);

    const restored = await repository.restore(user.id);
    expect(restored).toMatchObject({ status: 'active', tokenVersion: 1 });
    await expect(repository.restore(user.id)).resolves.toBeNull();
  });

  it('approve only changes pending users', async () => {
    const pending = await repository.create(input({ status: 'pending' }));
    const active = await repository.create(input({ email: 'b@escola.com.br' }));

    await expect(repository.approve(pending.id)).resolves.toMatchObject({
      status: 'active',
    });
    await expect(repository.approve(pending.id)).resolves.toBeNull();
    await expect(repository.approve(active.id)).resolves.toBeNull();
  });

  it('removePending never removes an active user', async () => {
    const pending = await repository.create(input({ status: 'pending' }));
    const active = await repository.create(input({ email: 'b@escola.com.br' }));

    await expect(repository.removePending(active.id)).resolves.toBe(false);
    await expect(repository.removePending(pending.id)).resolves.toBe(true);
    await expect(model.countDocuments().exec()).resolves.toBe(1);
  });

  it('setPassword raises tokenVersion and clears the login failures', async () => {
    const user = await repository.create(input());
    await repository.registerLoginFailure(user.id);

    await repository.setPassword(user.id, 'novo-hash', true);

    const stored = await repository.findForLogin(user.email);
    expect(stored).toMatchObject({
      password: 'novo-hash',
      mustChangePassword: true,
      tokenVersion: 1,
      failedLoginCount: 0,
      lockedUntil: null,
    });
  });

  it('registerLoginFailure locks for 15 minutes on the fifth failure', async () => {
    const user = await repository.create(input());

    for (let attempt = 1; attempt <= 4; attempt++) {
      await repository.registerLoginFailure(user.id);
    }
    let stored = await repository.findForLogin(user.email);
    expect(stored).toMatchObject({ failedLoginCount: 4, lockedUntil: null });

    await repository.registerLoginFailure(user.id);
    stored = await repository.findForLogin(user.email);
    const minutesLocked =
      (stored.lockedUntil.getTime() - Date.now()) / (60 * 1000);
    expect(stored.failedLoginCount).toBe(0);
    expect(minutesLocked).toBeGreaterThan(14);
    expect(minutesLocked).toBeLessThanOrEqual(15);

    await repository.resetLoginFailures(user.id);
    stored = await repository.findForLogin(user.email);
    expect(stored).toMatchObject({ failedLoginCount: 0, lockedUntil: null });
  });

  it('masterExists answers true only after a master is created', async () => {
    await expect(repository.masterExists()).resolves.toBe(false);
    await repository.create(input({ role: 'master' }));
    await expect(repository.masterExists()).resolves.toBe(true);
  });
});

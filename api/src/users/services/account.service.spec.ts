import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PasswordService } from '../../shared/security/password.service';
import { AuthenticatedUser, IUser } from '../models/user.interface';
import { UserRepository } from '../repositories/user.repository';
import { AccountService } from './account.service';

const master: AuthenticatedUser = {
  id: 'master-id',
  name: 'Master',
  email: 'master@escola.com.br',
  role: 'master',
  status: 'active',
  mustChangePassword: false,
};
const teacher: AuthenticatedUser = { ...master, id: 'ana-id', role: 'teacher' };
const input = {
  name: 'Marina Alves',
  email: 'marina@escola.com.br',
  password: 'senha-da-marina-123',
};

describe('AccountService', () => {
  let service: AccountService;
  let users: jest.Mocked<UserRepository>;

  beforeEach(() => {
    users = {
      create: jest.fn(async (data) => ({ id: 'new-id', ...data }) as IUser),
      findById: jest.fn(),
      updateProfile: jest.fn(),
      softDelete: jest.fn(),
      approve: jest.fn(),
      removePending: jest.fn(),
      setPassword: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;
    const passwords = {
      hash: jest.fn(async (plain: string) => `hash(${plain})`),
    } as unknown as PasswordService;
    service = new AccountService(users, passwords);
  });

  it('createTeacher: a teacher invites (pending) and the master creates (active), always with mustChangePassword', async () => {
    const invited = await service.createTeacher(teacher, input);
    const created = await service.createTeacher(master, input);

    expect(invited).toMatchObject({ status: 'pending', invitedBy: 'ana-id' });
    expect(created).toMatchObject({ status: 'active', invitedBy: 'master-id' });
    expect(users.create.mock.calls[0][0]).toMatchObject({
      role: 'teacher',
      mustChangePassword: true,
      password: 'hash(senha-da-marina-123)',
    });
    expect(invited).not.toHaveProperty('password');
  });

  it('updateTeacher: a teacher can only update their own account', async () => {
    users.updateProfile.mockResolvedValue({ id: 'ana-id' } as IUser);

    await expect(
      service.updateTeacher(teacher, 'outro-id', { name: 'X' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.updateTeacher(teacher, 'ana-id', { name: 'X' }),
    ).resolves.toMatchObject({ id: 'ana-id' });
    await expect(
      service.updateTeacher(master, 'outro-id', { name: 'X' }),
    ).resolves.toMatchObject({ id: 'ana-id' });
  });

  it('removeTeacher refuses the own id and answers 404 when nothing is deleted', async () => {
    users.softDelete.mockResolvedValue(false);

    await expect(
      service.removeTeacher(master, 'master-id'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.removeTeacher(master, 'x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('approve and reject answer 404 when the account is not pending', async () => {
    users.approve.mockResolvedValue(null);
    users.removePending.mockResolvedValue(false);

    await expect(service.approve('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.reject('x')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('resetPassword refuses the own id and sets a provisional password', async () => {
    users.findById.mockResolvedValue({ id: 'ana-id' } as IUser);

    await expect(
      service.resetPassword(master, 'master-id', 'nova-senha-provisoria'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await service.resetPassword(master, 'ana-id', 'nova-senha-provisoria');
    expect(users.setPassword).toHaveBeenCalledWith(
      'ana-id',
      'hash(nova-senha-provisoria)',
      true,
    );
  });
});

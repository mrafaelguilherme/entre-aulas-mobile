import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Paginated } from '../../shared/pagination/pagination';
import { PasswordService } from '../../shared/security/password.service';
import {
  AuthenticatedUser,
  IUserResponse,
  TEACHER_ROLES,
  toUserResponse,
  UserRole,
  UserStatus,
} from '../models/user.interface';
import {
  UpdateProfileInput,
  UserListFilter,
  UserRepository,
} from '../repositories/user.repository';

export type NewAccount = { name: string; email: string; password: string };

// Um so servico para professores, alunos e contas excluidas: e uma so colecao.
@Injectable()
export class AccountService {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordService,
  ) {}

  async list(
    filter: UserListFilter,
    page: number,
    limit: number,
  ): Promise<Paginated<IUserResponse>> {
    const result = await this.users.list(filter, page, limit);
    return { ...result, items: result.items.map(toUserResponse) };
  }

  async findOne(id: string, roles: UserRole[]): Promise<IUserResponse> {
    const user = await this.users.findById(id, roles);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return toUserResponse(user);
  }

  // Toda conta criada por outra pessoa nasce com troca de senha obrigatoria.
  async create(
    input: NewAccount,
    role: UserRole,
    status: UserStatus,
    invitedBy: string,
  ): Promise<IUserResponse> {
    const user = await this.users.create({
      name: input.name,
      email: input.email,
      password: await this.passwords.hash(input.password),
      role,
      status,
      mustChangePassword: true,
      invitedBy,
    });
    return toUserResponse(user);
  }

  async update(
    id: string,
    roles: UserRole[],
    input: UpdateProfileInput,
  ): Promise<IUserResponse> {
    const user = await this.users.updateProfile(id, roles, input);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return toUserResponse(user);
  }

  async softDelete(id: string, roles: UserRole[]): Promise<void> {
    const deleted = await this.users.softDelete(id, roles);
    if (!deleted) {
      throw new NotFoundException('User not found');
    }
  }

  // Professor convida (fica pendente). Master cadastra direto (ja ativo).
  createTeacher(
    actor: AuthenticatedUser,
    input: NewAccount,
  ): Promise<IUserResponse> {
    const status: UserStatus = actor.role === 'master' ? 'active' : 'pending';
    return this.create(input, 'teacher', status, actor.id);
  }

  async updateTeacher(
    actor: AuthenticatedUser,
    id: string,
    input: UpdateProfileInput,
  ): Promise<IUserResponse> {
    if (actor.role !== 'master' && actor.id !== id) {
      throw new ForbiddenException('You can only update your own account');
    }
    return this.update(id, TEACHER_ROLES, input);
  }

  async removeTeacher(actor: AuthenticatedUser, id: string): Promise<void> {
    if (actor.id === id) {
      throw new ForbiddenException('You cannot delete your own account');
    }
    return this.softDelete(id, TEACHER_ROLES);
  }

  async approve(id: string): Promise<IUserResponse> {
    const user = await this.users.approve(id);
    if (!user) {
      throw new NotFoundException('Pending invitation not found');
    }
    return toUserResponse(user);
  }

  async reject(id: string): Promise<void> {
    const removed = await this.users.removePending(id);
    if (!removed) {
      throw new NotFoundException('Pending invitation not found');
    }
  }

  async restore(id: string): Promise<IUserResponse> {
    const user = await this.users.restore(id);
    if (!user) {
      throw new NotFoundException('Deleted account not found');
    }
    return toUserResponse(user);
  }

  // Senha provisoria definida pelo master. A pessoa troca no primeiro acesso.
  async resetPassword(
    actor: AuthenticatedUser,
    id: string,
    password: string,
  ): Promise<void> {
    if (actor.id === id) {
      throw new ForbiddenException(
        'Use PUT /me/password to change your own password',
      );
    }
    const user = await this.users.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.users.setPassword(id, await this.passwords.hash(password), true);
  }
}

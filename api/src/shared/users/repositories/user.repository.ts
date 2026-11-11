import { Paginated } from '../../../shared/pagination/pagination';
import { IUser, UserRole, UserStatus } from '../models/user.interface';

export type CreateUserInput = Pick<
  IUser,
  'name' | 'email' | 'role' | 'status' | 'mustChangePassword' | 'invitedBy'
> & { password: string };

export type UpdateProfileInput = Partial<Pick<IUser, 'name' | 'email'>>;

export type UserListFilter = { roles?: UserRole[]; status?: UserStatus };

export abstract class UserRepository {
  // Sem excluidos e sem senha. Com roles, so devolve se o perfil bater.
  abstract findById(id: string, roles?: UserRole[]): Promise<IUser | null>;
  // So contas ativas, com a senha, para o login.
  abstract findForLogin(email: string): Promise<IUser | null>;
  abstract findWithPassword(id: string): Promise<IUser | null>;
  abstract create(input: CreateUserInput): Promise<IUser>;
  // Sem status, omite excluidos. Pendentes primeiro, depois os mais novos.
  abstract list(
    filter: UserListFilter,
    page: number,
    limit: number,
  ): Promise<Paginated<IUser>>;
  abstract updateProfile(
    id: string,
    roles: UserRole[],
    input: UpdateProfileInput,
  ): Promise<IUser | null>;
  // Sobe tokenVersion: os tokens antigos deixam de valer.
  abstract setPassword(
    id: string,
    hash: string,
    mustChange: boolean,
  ): Promise<void>;
  abstract incrementTokenVersion(id: string): Promise<void>;
  abstract approve(id: string): Promise<IUser | null>;
  abstract removePending(id: string): Promise<boolean>;
  abstract softDelete(id: string, roles: UserRole[]): Promise<boolean>;
  abstract restore(id: string): Promise<IUser | null>;
  abstract masterExists(): Promise<boolean>;
  // Na quinta falha, bloqueia por 15 minutos e zera a contagem.
  abstract registerLoginFailure(id: string): Promise<void>;
  abstract resetLoginFailures(id: string): Promise<void>;
}

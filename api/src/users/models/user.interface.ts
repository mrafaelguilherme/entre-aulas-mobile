export const USER_ROLES = ['master', 'teacher', 'student'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ['pending', 'active', 'deleted'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

// Perfis que podem publicar posts e gerenciar pessoas.
export const TEACHER_ROLES: UserRole[] = ['teacher', 'master'];

export interface IUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  status: UserStatus;
  mustChangePassword: boolean;
  tokenVersion: number;
  invitedBy: string | null;
  failedLoginCount: number;
  lockedUntil: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// O que a API devolve sobre uma pessoa. Nunca inclui senha nem campos de controle.
export type IUserResponse = Pick<
  IUser,
  | 'id'
  | 'name'
  | 'email'
  | 'role'
  | 'status'
  | 'mustChangePassword'
  | 'invitedBy'
  | 'createdAt'
  | 'updatedAt'
>;

// O que o guard coloca em request.user depois de validar o token.
export type AuthenticatedUser = Pick<
  IUser,
  'id' | 'name' | 'email' | 'role' | 'status' | 'mustChangePassword'
>;

// Unica funcao que monta a resposta: lista explicita dos campos permitidos.
export function toUserResponse(user: IUser): IUserResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    invitedBy: user.invitedBy,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/models/user.interface';

export const ROLES_KEY = 'roles';

// Lista os perfis que podem usar a rota. Sem a marca, basta estar logado.
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

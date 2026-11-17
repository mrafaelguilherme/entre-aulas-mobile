import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/models/user.interface';
import { RolesGuard } from './roles.guard';

function createGuard(roles?: UserRole[]) {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(roles),
  } as unknown as Reflector;
  return new RolesGuard(reflector);
}

function createContext(user?: { role: UserRole }) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('passes when the route has no @Roles()', () => {
    const guard = createGuard(undefined);

    expect(guard.canActivate(createContext({ role: 'student' }))).toBe(true);
  });

  it('passes when the user role is in the list', () => {
    const guard = createGuard(['teacher', 'master']);

    expect(guard.canActivate(createContext({ role: 'master' }))).toBe(true);
  });

  it('throws ForbiddenException for another role', () => {
    const guard = createGuard(['teacher', 'master']);

    expect(() => guard.canActivate(createContext({ role: 'student' }))).toThrow(
      ForbiddenException,
    );
  });

  it('throws ForbiddenException when there is no user', () => {
    const guard = createGuard(['teacher']);

    expect(() => guard.canActivate(createContext())).toThrow(
      ForbiddenException,
    );
  });
});

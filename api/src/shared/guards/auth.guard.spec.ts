import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IUser } from '../../users/models/user.interface';
import { UserRepository } from '../../users/repositories/user.repository';
import { ALLOW_PENDING_PASSWORD_KEY } from '../decorators/allow-pending-password.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthGuard } from './auth.guard';

const activeUser: IUser = {
  id: 'user-id',
  name: 'Professora Ana',
  email: 'ana@escola.com.br',
  role: 'teacher',
  status: 'active',
  mustChangePassword: false,
  tokenVersion: 0,
  invitedBy: null,
  failedLoginCount: 0,
  lockedUntil: null,
};

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: jest.Mocked<JwtService>;
  let users: jest.Mocked<UserRepository>;
  let flags: Record<string, boolean>;

  beforeEach(() => {
    flags = {};
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => flags[key]),
    } as unknown as Reflector;
    jwtService = {
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;
    users = { findById: jest.fn() } as unknown as jest.Mocked<UserRepository>;
    guard = new AuthGuard(reflector, jwtService, users);
  });

  function createContext(authorization?: string) {
    const request: { headers: { authorization?: string }; user?: unknown } = {
      headers: { authorization },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;
    return { request, context };
  }

  it('lets a @Public() route pass without a token', async () => {
    flags[IS_PUBLIC_KEY] = true;
    const { context } = createContext();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('rejects a request without a token', async () => {
    const { context } = createContext();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects an invalid token', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid token'));
    const { context } = createContext('Bearer invalid-token');

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(users.findById).not.toHaveBeenCalled();
  });

  it('rejects a token whose user is missing, inactive or has another tokenVersion', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'user-id', ver: 0 });
    const rejected: Array<IUser | null> = [
      null,
      { ...activeUser, status: 'pending' },
      { ...activeUser, status: 'deleted' },
      { ...activeUser, tokenVersion: 1 },
    ];

    for (const user of rejected) {
      users.findById.mockResolvedValue(user);
      const { context } = createContext('Bearer valid-token');

      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    }
  });

  it('loads the user from the database and sets request.user without password or tokenVersion', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'user-id', ver: 0 });
    users.findById.mockResolvedValue({ ...activeUser, password: 'hash' });
    const { request, context } = createContext('Bearer valid-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(users.findById).toHaveBeenCalledWith('user-id');
    expect(request.user).toEqual({
      id: 'user-id',
      name: 'Professora Ana',
      email: 'ana@escola.com.br',
      role: 'teacher',
      status: 'active',
      mustChangePassword: false,
    });
  });

  it('answers 403 PASSWORD_CHANGE_REQUIRED when the password must change and the route is not allowed', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'user-id', ver: 0 });
    users.findById.mockResolvedValue({
      ...activeUser,
      mustChangePassword: true,
    });
    const { context } = createContext('Bearer valid-token');

    const error: ForbiddenException = await guard
      .canActivate(context)
      .catch((caught) => caught);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect(error.getResponse()).toMatchObject({
      code: 'PASSWORD_CHANGE_REQUIRED',
    });
  });

  it('allows a pending password on a route with @AllowPendingPassword()', async () => {
    flags[ALLOW_PENDING_PASSWORD_KEY] = true;
    jwtService.verifyAsync.mockResolvedValue({ sub: 'user-id', ver: 0 });
    users.findById.mockResolvedValue({
      ...activeUser,
      mustChangePassword: true,
    });
    const { context } = createContext('Bearer valid-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});

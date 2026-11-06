import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;
    guard = new AuthGuard(jwtService);
  });

  function createContext(authorization?: string) {
    const request = { headers: { authorization } };
    return {
      request,
      context: {
        switchToHttp: () => ({ getRequest: () => request }),
      } as ExecutionContext,
    };
  }

  it('should allow a valid bearer token', async () => {
    const { request, context } = createContext('Bearer valid-token');
    jwtService.verifyAsync.mockResolvedValue({ sub: 'teacher-id' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request).toHaveProperty('user', { sub: 'teacher-id' });
  });

  it('should reject a request without a token', async () => {
    const { context } = createContext();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('should reject an invalid token', async () => {
    const { context } = createContext('Bearer invalid-token');
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid token'));

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

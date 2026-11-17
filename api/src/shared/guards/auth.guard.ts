import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthenticatedUser } from '../../users/models/user.interface';
import { UserRepository } from '../../users/repositories/user.repository';
import { ALLOW_PENDING_PASSWORD_KEY } from '../decorators/allow-pending-password.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

// O token carrega so o id (sub) e a versao (ver). O resto vem do banco.
export interface IJwtPayload {
  sub: string;
  ver: number;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export interface IAuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.hasFlag(context, IS_PUBLIC_KEY)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<IAuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Authentication token is required');
    }

    const payload = await this.verify(token);
    const user = await this.userRepository.findById(payload.sub);

    // Conta excluida, pendente ou com token antigo: o crachá nao vale mais.
    if (
      !user ||
      user.status !== 'active' ||
      user.tokenVersion !== payload.ver
    ) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    request.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
    };

    if (
      user.mustChangePassword &&
      !this.hasFlag(context, ALLOW_PENDING_PASSWORD_KEY)
    ) {
      throw new ForbiddenException({
        message: 'Password change required',
        code: 'PASSWORD_CHANGE_REQUIRED',
      });
    }

    return true;
  }

  private hasFlag(context: ExecutionContext, key: string): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(key, [
        context.getHandler(),
        context.getClass(),
      ]) === true
    );
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private async verify(token: string): Promise<IJwtPayload> {
    try {
      return await this.jwtService.verifyAsync<IJwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

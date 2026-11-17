import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { IAuthenticatedRequest } from '../guards/auth.guard';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Registra toda escrita feita pelo master: metodo, rota, ator e ID alvo.
// Nunca o corpo, que pode trazer nome, e-mail ou senha.
@Injectable()
export class MasterAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('MasterAudit');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<IAuthenticatedRequest>();

    if (request.user?.role === 'master' && WRITE_METHODS.has(request.method)) {
      const route: string = request.route?.path ?? request.url;
      const target = request.params?.id ? ` on ${request.params.id}` : '';
      this.logger.log(
        `[audit] ${request.method} ${route} by ${request.user.id}${target}`,
      );
    }

    return next.handle();
  }
}

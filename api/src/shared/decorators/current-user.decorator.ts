import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IAuthenticatedRequest } from '../guards/auth.guard';

// Entrega o usuario que o AuthGuard carregou do banco.
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<IAuthenticatedRequest>().user,
);

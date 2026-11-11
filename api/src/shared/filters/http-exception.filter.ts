import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

// Codigo que o MongoDB devolve quando um indice unico e violado.
const MONGO_DUPLICATE_KEY = 11000;

type ErrorDetails = { status: number; details: Record<string, unknown> };

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const { status, details } = this.describe(exception);

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `Unexpected error on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...details,
    });
  }

  private describe(exception: unknown): ErrorDetails {
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      return {
        status: exception.getStatus(),
        details:
          typeof body === 'string'
            ? { message: body }
            : (body as Record<string, unknown>),
      };
    }

    if (this.isDuplicateKey(exception)) {
      return {
        status: HttpStatus.CONFLICT,
        details: { message: 'Email is unavailable' },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      details: { message: 'Internal server error' },
    };
  }

  private isDuplicateKey(exception: unknown): boolean {
    return (
      typeof exception === 'object' &&
      exception !== null &&
      (exception as { code?: unknown }).code === MONGO_DUPLICATE_KEY
    );
  }
}

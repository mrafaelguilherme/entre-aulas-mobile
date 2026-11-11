import {
  BadRequestException,
  INestApplication,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { ObjectIdParamPipe } from './shared/pipes/object-id-param.pipe';

export type AppOptions = {
  // Liga a documentacao em /api. Fica desligada fora da demonstracao.
  docs: boolean;
};

type ValidationIssue = {
  message: string;
  path?: ReadonlyArray<PropertyKey | { key: PropertyKey }>;
};

// Agrupa as mensagens por campo: { email: ['...'], password: ['...'] }.
export function validationExceptionFactory(
  issues: ReadonlyArray<ValidationIssue>,
): BadRequestException {
  const errors: Record<string, string[]> = {};

  for (const issue of issues) {
    const path =
      (issue.path ?? [])
        .map((segment) =>
          String(typeof segment === 'object' ? segment.key : segment),
        )
        .join('.') || '_';
    (errors[path] ??= []).push(issue.message);
  }

  return new BadRequestException({ message: 'Validation failed', errors });
}

// Tudo o que a API precisa alem dos modulos. Usado em main.ts e nos testes.
export function configureApp(app: INestApplication, options: AppOptions): void {
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ObjectIdParamPipe(),
    new StandardSchemaValidationPipe({
      exceptionFactory: validationExceptionFactory,
    }),
  );

  if (options.docs) {
    setupDocs(app);
  }
}

function setupDocs(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Entre Aulas API')
    .setDescription('API REST do blog educacional Entre Aulas')
    .setVersion('2.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
}

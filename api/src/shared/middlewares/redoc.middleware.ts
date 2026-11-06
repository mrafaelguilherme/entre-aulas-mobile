import { INestApplication } from '@nestjs/common';
import redoc from 'redoc-express';

export function setupRedoc(app: INestApplication) {
  app.use(
    '/docs',
    redoc({
      title: 'Entre Aulas API',
      specUrl: '/api-json',
    }),
  );
}

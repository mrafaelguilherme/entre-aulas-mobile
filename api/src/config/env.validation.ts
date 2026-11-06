import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  MONGO_URI: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  MASTER_EMAIL: z.email(),
  MASTER_PASSWORD: z.string().min(15).max(128),
  ENABLE_API_DOCS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

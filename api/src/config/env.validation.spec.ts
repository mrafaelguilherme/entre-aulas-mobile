import { envSchema } from './env.validation';

const validEnv = {
  MONGO_URI: 'mongodb://localhost:27017/entre-aulas',
  JWT_SECRET: 'a'.repeat(32),
  MASTER_EMAIL: 'master@entreaulas.com.br',
  MASTER_PASSWORD: 'senha-de-15-chars',
};

describe('envSchema', () => {
  it('accepts a valid environment and applies the defaults', () => {
    const result = envSchema.safeParse(validEnv);

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      ENABLE_API_DOCS: false,
    });
  });

  it('rejects a JWT_SECRET shorter than 32 chars', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      JWT_SECRET: 'a'.repeat(31),
    });

    expect(result.success).toBe(false);
  });

  it('rejects the placeholder __GERAR__', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      JWT_SECRET: '__GERAR__',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a MASTER_PASSWORD shorter than 15 chars', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      MASTER_PASSWORD: 'curta-14-chars',
    });

    expect(result.success).toBe(false);
  });

  it('requires MASTER_EMAIL and MASTER_PASSWORD', () => {
    const { MONGO_URI, JWT_SECRET } = validEnv;
    const result = envSchema.safeParse({ MONGO_URI, JWT_SECRET });

    expect(result.success).toBe(false);
  });

  it('turns ENABLE_API_DOCS=true into the boolean true', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      ENABLE_API_DOCS: 'true',
    });

    expect(result.data?.ENABLE_API_DOCS).toBe(true);
  });
});

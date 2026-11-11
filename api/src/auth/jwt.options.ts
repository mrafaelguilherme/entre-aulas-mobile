import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

export const JWT_ISSUER = 'entre-aulas-api';
export const JWT_AUDIENCE = 'entre-aulas-mobile';
export const JWT_EXPIRES_IN = '1h';

// Assina e confere com um so algoritmo, e exige emissor e publico certos.
export function jwtOptions(config: ConfigService): JwtModuleOptions {
  return {
    secret: config.getOrThrow<string>('JWT_SECRET'),
    signOptions: {
      algorithm: 'HS256',
      expiresIn: JWT_EXPIRES_IN,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    },
    verifyOptions: {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    },
  };
}

import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';

// Parametros recomendados pelo OWASP para o Argon2id:
// 19 MiB de memoria, 2 iteracoes e paralelismo 1.
const ARGON2_OPTIONS: argon2.HashOptions = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

@Injectable()
export class PasswordService {
  // Hash de um texto aleatorio, calculado uma vez.
  // Serve para gastar o mesmo tempo quando o e-mail nao existe.
  private readonly dummyHash = argon2.hash(
    randomBytes(32).toString('hex'),
    ARGON2_OPTIONS,
  );

  hash(plain: string): Promise<string> {
    return argon2.hash(plain, ARGON2_OPTIONS);
  }

  async verify(storedHash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(storedHash, plain);
    } catch {
      return false;
    }
  }

  async verifyDummy(plain: string): Promise<false> {
    await argon2.verify(await this.dummyHash, plain);
    return false;
  }
}

import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();
  const plain = 'senha-de-teste-longa';

  it('hashes with Argon2id and the OWASP parameters', async () => {
    const hash = await service.hash(plain);

    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
  });

  it('verifies the right password and refuses a wrong one', async () => {
    const hash = await service.hash(plain);

    await expect(service.verify(hash, plain)).resolves.toBe(true);
    await expect(service.verify(hash, 'outra-senha-qualquer')).resolves.toBe(
      false,
    );
  });

  it('produces a different hash each time, because the salt is random', async () => {
    const first = await service.hash(plain);
    const second = await service.hash(plain);

    expect(first).not.toBe(second);
  });

  it('answers false for a malformed hash instead of throwing', async () => {
    await expect(service.verify('nao-e-um-hash', plain)).resolves.toBe(false);
  });

  it('verifyDummy always answers false', async () => {
    await expect(service.verifyDummy('qualquer')).resolves.toBe(false);
  });
});

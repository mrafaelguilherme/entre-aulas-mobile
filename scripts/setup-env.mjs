// Cria o arquivo .env a partir do .env.example.
// Cada __GERAR__ vira um segredo aleatorio diferente.
// Uso: node scripts/setup-env.mjs
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Pasta do projeto: por padrao, a pasta acima de "scripts".
// Os testes passam outra pasta como argumento.
const projectDir = process.argv[2]
  ? resolve(process.argv[2])
  : fileURLToPath(new URL('..', import.meta.url));

const examplePath = resolve(projectDir, '.env.example');
const envPath = resolve(projectDir, '.env');

if (existsSync(envPath)) {
  console.log('O arquivo .env ja existe. Nada foi alterado.');
  process.exit(0);
}

const example = readFileSync(examplePath, 'utf8');
const env = example.replaceAll('__GERAR__', () =>
  randomBytes(48).toString('base64url'),
);

writeFileSync(envPath, env);
console.log('Arquivo .env criado com segredos aleatorios.');
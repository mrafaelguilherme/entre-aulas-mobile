import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./setup-env.mjs', import.meta.url));

function createProject() {
  const dir = mkdtempSync(join(tmpdir(), 'setup-env-'));
  writeFileSync(
    join(dir, '.env.example'),
    'JWT_SECRET=__GERAR__\nMONGO_PASSWORD=__GERAR__\nMONGO_USER=entreaulas\n',
  );
  return dir;
}

function runScript(dir) {
  return execFileSync(process.execPath, [script, dir], { encoding: 'utf8' });
}

function readEnv(dir) {
  const lines = readFileSync(join(dir, '.env'), 'utf8').trim().split('\n');
  return Object.fromEntries(lines.map((line) => line.split('=')));
}

test('troca cada __GERAR__ por um segredo aleatorio de 64 caracteres', () => {
  const dir = createProject();
  runScript(dir);
  const env = readEnv(dir);

  assert.match(env.JWT_SECRET, /^[A-Za-z0-9_-]{64}$/);
  assert.match(env.MONGO_PASSWORD, /^[A-Za-z0-9_-]{64}$/);
  assert.notEqual(env.JWT_SECRET, env.MONGO_PASSWORD);
  assert.equal(env.MONGO_USER, 'entreaulas');
});

test('gera segredos diferentes a cada projeto', () => {
  const first = createProject();
  const second = createProject();
  runScript(first);
  runScript(second);

  assert.notEqual(readEnv(first).JWT_SECRET, readEnv(second).JWT_SECRET);
});

test('nao sobrescreve um .env que ja existe', () => {
  const dir = createProject();
  writeFileSync(join(dir, '.env'), 'JWT_SECRET=meu-segredo\n');
  const output = runScript(dir);

  assert.match(output, /ja existe/);
  assert.equal(readFileSync(join(dir, '.env'), 'utf8'), 'JWT_SECRET=meu-segredo\n');
});
import { randomUUID } from 'node:crypto';

// Roda antes de cada arquivo de teste, antes de qualquer import.
// O AppModule le estas variaveis ao ser carregado, entao elas precisam
// existir antes. Cada arquivo ganha um banco com nome unico.
Object.assign(process.env, {
  NODE_ENV: 'test',
  MONGO_URI: `${process.env.MONGO_BASE_URI}e2e-${randomUUID()}`,
  JWT_SECRET: 'segredo-de-teste-com-mais-de-32-caracteres',
  MASTER_EMAIL: 'master@teste.com.br',
  MASTER_PASSWORD: 'senha-do-master-de-teste',
  ENABLE_API_DOCS: 'false',
});

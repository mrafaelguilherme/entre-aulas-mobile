import { MongoMemoryServer } from 'mongodb-memory-server';

type GlobalWithMongod = typeof globalThis & { __MONGOD__?: MongoMemoryServer };

// Sobe um so MongoDB em memoria para toda a rodada de testes.
// Cada arquivo de teste usa um banco proprio dentro dele (ver env.ts).
export default async function globalSetup(): Promise<void> {
  const mongod = await MongoMemoryServer.create({
    instance: { launchTimeout: 60000 },
  });
  (globalThis as GlobalWithMongod).__MONGOD__ = mongod;
  process.env.MONGO_BASE_URI = mongod.getUri();
}

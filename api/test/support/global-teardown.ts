import { MongoMemoryServer } from 'mongodb-memory-server';

type GlobalWithMongod = typeof globalThis & { __MONGOD__?: MongoMemoryServer };

export default async function globalTeardown(): Promise<void> {
  await (globalThis as GlobalWithMongod).__MONGOD__?.stop();
}

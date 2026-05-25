import { PrismaClient } from '@prisma/client';
import { env } from './env';

let _client: PrismaClient | undefined;

export function getPublicClient(): PrismaClient {
  if (!_client) {
    _client = new PrismaClient({
      log: env.isDev ? ['warn', 'error'] : ['error'],
    });
  }
  return _client;
}

export async function disconnectAll(): Promise<void> {
  if (_client) await _client.$disconnect();
}

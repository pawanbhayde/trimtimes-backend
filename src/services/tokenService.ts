import crypto from 'crypto';
import { getPublicClient } from '../config/database';
import { signRefreshToken } from '../utils/jwt';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// 7 days in ms — matches JWT_REFRESH_EXPIRES_IN default of '7d'
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function issueRefreshToken(entityId: string, role: string): Promise<string> {
  const token = signRefreshToken(entityId, role);
  await getPublicClient().refreshToken.create({
    data: {
      tokenHash: hashToken(token),
      role,
      entityId,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  });
  return token;
}

export async function findRefreshToken(token: string) {
  return getPublicClient().refreshToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await getPublicClient().refreshToken
    .deleteMany({ where: { tokenHash: hashToken(token) } })
    .catch(() => null);
}

import jwt from 'jsonwebtoken';
import { env } from '../config/env';

// ─── Legacy (used by existing /api/:tenant/* routes) ──────────────────────────

export interface JwtPayload {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'BARBER' | 'CUSTOMER';
  tenantId?: string;
  schemaName?: string;
}

export function generateToken(payload: JwtPayload, expiresIn = env.JWT_EXPIRES_IN): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

// ─── V1 Access Tokens ─────────────────────────────────────────────────────────

export interface AccessTokenPayload {
  sub: string;         // entity UUID (tenant.id | customer.id | superAdmin.id)
  email: string;
  role: 'barber' | 'customer' | 'admin';
  tenantId?: string;   // subdomain slug — barber only
  userId?: string;     // email-prefix slug — customer only
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
}

// ─── V1 Refresh Tokens ────────────────────────────────────────────────────────

export function signRefreshToken(sub: string, role: string): string {
  return jwt.sign({ sub, role }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyRefreshToken(token: string): { sub: string; role: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string; role: string };
}

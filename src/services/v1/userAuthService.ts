import bcrypt from 'bcryptjs';
import { getPublicClient } from '../../config/database';
import { signAccessToken } from '../../utils/jwt';
import { issueRefreshToken } from '../tokenService';

const BCRYPT_ROUNDS = 12;
const ACCESS_EXPIRES_IN_SECONDS = 3600;

async function deriveUserId(emailPrefix: string): Promise<string> {
  const db = getPublicClient();
  const base = emailPrefix.toLowerCase().replace(/[^a-z0-9]/g, '');
  let candidate = base;
  let counter = 2;
  while (await db.customer.findUnique({ where: { userId: candidate } })) {
    candidate = `${base}${counter++}`;
  }
  return candidate;
}

function serviceError(code: string, status: number): Error & { statusCode: number; code: string } {
  const err = new Error(code) as Error & { statusCode: number; code: string };
  err.statusCode = status;
  err.code = code;
  return err;
}

export async function registerUser(data: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}) {
  const db = getPublicClient();

  const existing = await db.customer.findUnique({ where: { email: data.email } });
  if (existing) throw serviceError('EMAIL_EXISTS', 409);

  const emailPrefix = data.email.split('@')[0];
  const userId = await deriveUserId(emailPrefix);
  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  const customer = await db.customer.create({
    data: {
      userId,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      password: passwordHash,
    },
  });

  const accessToken = signAccessToken({
    sub: customer.id,
    email: customer.email,
    role: 'customer',
    userId: customer.userId,
  });
  const refreshToken = await issueRefreshToken(customer.id, 'customer');

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_EXPIRES_IN_SECONDS,
    user: {
      id: customer.id,
      userId: customer.userId,
      name: customer.fullName,
      email: customer.email,
      phone: customer.phone,
      role: 'customer',
    },
  };
}

export async function loginUser(email: string, password: string) {
  const db = getPublicClient();

  const customer = await db.customer.findUnique({ where: { email } });
  if (!customer) throw serviceError('INVALID_CREDENTIALS', 401);

  const valid = await bcrypt.compare(password, customer.password);
  if (!valid) throw serviceError('INVALID_CREDENTIALS', 401);

  const accessToken = signAccessToken({
    sub: customer.id,
    email: customer.email,
    role: 'customer',
    userId: customer.userId,
  });
  const refreshToken = await issueRefreshToken(customer.id, 'customer');

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_EXPIRES_IN_SECONDS,
    user: {
      id: customer.id,
      userId: customer.userId,
      name: customer.fullName,
      email: customer.email,
      phone: customer.phone,
      role: 'customer',
    },
  };
}

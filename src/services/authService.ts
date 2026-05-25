import bcrypt from 'bcryptjs';
import { Tenant } from '@prisma/client';
import { getPublicClient } from '../config/database';
import { generateToken } from '../utils/jwt';
import { createError } from '../middleware/errorHandler';

const db = () => getPublicClient();

export async function register(
  tenant: Tenant,
  data: { email: string; password: string; fullName: string; phone?: string }
) {
  const existing = await db().customer.findUnique({ where: { email: data.email } });
  if (existing) throw createError('Email already registered', 409);

  const emailPrefix = data.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  let userId = emailPrefix;
  let counter = 2;
  while (await db().customer.findUnique({ where: { userId } })) {
    userId = `${emailPrefix}${counter++}`;
  }

  const hashed = await bcrypt.hash(data.password, 12);
  const customer = await db().customer.create({
    data: {
      userId,
      email: data.email,
      password: hashed,
      fullName: data.fullName,
      phone: data.phone ?? '',
    },
    select: { id: true, userId: true, email: true, fullName: true, phone: true, createdAt: true },
  });

  const token = generateToken({
    id: customer.id,
    email: customer.email,
    role: 'CUSTOMER',
    tenantId: tenant.subdomain,
  });

  return { token, user: customer };
}

export async function login(tenant: Tenant, email: string, password: string) {
  const customer = await db().customer.findUnique({ where: { email } });
  if (!customer) throw createError('Invalid credentials', 401);

  const valid = await bcrypt.compare(password, customer.password);
  if (!valid) throw createError('Invalid credentials', 401);

  const token = generateToken({
    id: customer.id,
    email: customer.email,
    role: 'CUSTOMER',
    tenantId: tenant.subdomain,
  });

  const { password: _pw, ...safeCustomer } = customer;
  return { token, user: safeCustomer };
}

export async function getMe(_tenant: Tenant, userId: string) {
  const customer = await db().customer.findUnique({
    where: { id: userId },
    select: { id: true, userId: true, email: true, fullName: true, phone: true, createdAt: true },
  });
  if (!customer) throw createError('User not found', 404);
  return customer;
}

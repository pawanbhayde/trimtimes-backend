import bcrypt from 'bcryptjs';
import { getPublicClient } from '../../config/database';
import { signAccessToken } from '../../utils/jwt';
import { issueRefreshToken } from '../tokenService';

const BCRYPT_ROUNDS = 12;
const ACCESS_EXPIRES_IN_SECONDS = 3600;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function schemaNameFromSlug(slug: string): string {
  return 'tenant_' + slug.replace(/-/g, '_');
}

export async function listShops(status = 'ACTIVE') {
  const rows = await getPublicClient().tenant.findMany({
    where: { status: status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING' },
    select: {
      subdomain: true,
      shopName: true,
      schemaName: true,
      ownerName: true,
      bannerUrl: true,
      phone: true,
      rating: true,
      status: true,
      _count: { select: { reviews: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map((t) => ({
    id: t.subdomain,
    slug: t.subdomain,
    name: t.shopName,
    schemaName: t.schemaName,
    ownerName: t.ownerName ?? '',
    bannerUrl: t.bannerUrl ?? null,
    phone: t.phone ?? '',
    rating: t.rating,
    reviewCount: t._count.reviews,
    status: (t.status === 'ACTIVE' ? 'Active' : 'Inactive') as 'Active' | 'Inactive',
  }));
}

export async function registerShop(data: {
  shopName: string;
  slug?: string;
  ownerName: string;
  ownerEmail: string;
  password: string;
}) {
  const db = getPublicClient();
  const slug = data.slug ? data.slug : slugify(data.shopName);
  const schemaName = schemaNameFromSlug(slug);

  const emailConflict = await db.tenant.findFirst({ where: { ownerEmail: data.ownerEmail } });
  if (emailConflict) {
    const err = new Error('SHOP_EMAIL_EXISTS') as Error & { statusCode: number; code: string };
    err.statusCode = 409;
    err.code = 'SHOP_EMAIL_EXISTS';
    throw err;
  }

  const slugConflict = await db.tenant.findFirst({ where: { subdomain: slug } });
  if (slugConflict) {
    const err = new Error('SHOP_SLUG_EXISTS') as Error & { statusCode: number; code: string };
    err.statusCode = 409;
    err.code = 'SHOP_SLUG_EXISTS';
    throw err;
  }

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  const tenant = await db.tenant.create({
    data: {
      shopName: data.shopName,
      subdomain: slug,
      schemaName,
      ownerEmail: data.ownerEmail,
      ownerName: data.ownerName,
      password: passwordHash,
      status: 'PENDING',
    },
  });

  const accessToken = signAccessToken({
    sub: tenant.id,
    email: tenant.ownerEmail,
    role: 'barber',
    tenantId: tenant.subdomain,
  });
  const refreshToken = await issueRefreshToken(tenant.id, 'barber');

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_EXPIRES_IN_SECONDS,
    tenant: {
      id: tenant.subdomain,
      name: tenant.shopName,
      schemaName: tenant.schemaName,
      status: 'Active',
      createdAt: tenant.createdAt.toISOString(),
    },
    user: {
      id: tenant.id,
      name: tenant.ownerName,
      email: tenant.ownerEmail,
      role: 'barber',
    },
  };
}

export async function loginShop(email: string, password: string, tenantId: string) {
  const db = getPublicClient();

  const tenant = await db.tenant.findFirst({ where: { subdomain: tenantId } });
  if (!tenant) {
    const err = new Error('SHOP_NOT_FOUND') as Error & { statusCode: number; code: string };
    err.statusCode = 404;
    err.code = 'SHOP_NOT_FOUND';
    throw err;
  }

  if (tenant.status === 'PENDING') {
    const err = new Error('Your shop is awaiting admin approval.') as Error & { statusCode: number; code: string };
    err.statusCode = 403;
    err.code = 'SHOP_PENDING';
    throw err;
  }

  if (tenant.status !== 'ACTIVE') {
    const err = new Error('This shop has been suspended or deactivated.') as Error & { statusCode: number; code: string };
    err.statusCode = 403;
    err.code = 'SHOP_INACTIVE';
    throw err;
  }

  if (tenant.ownerEmail !== email || !tenant.password) {
    const err = new Error('INVALID_CREDENTIALS') as Error & { statusCode: number; code: string };
    err.statusCode = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const valid = await bcrypt.compare(password, tenant.password);
  if (!valid) {
    const err = new Error('INVALID_CREDENTIALS') as Error & { statusCode: number; code: string };
    err.statusCode = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const accessToken = signAccessToken({
    sub: tenant.id,
    email: tenant.ownerEmail,
    role: 'barber',
    tenantId: tenant.subdomain,
  });
  const refreshToken = await issueRefreshToken(tenant.id, 'barber');

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_EXPIRES_IN_SECONDS,
    tenant: {
      id: tenant.subdomain,
      name: tenant.shopName,
      schemaName: tenant.schemaName,
      status: tenant.status === 'ACTIVE' ? 'Active' : 'Inactive',
    },
    user: {
      id: tenant.id,
      name: tenant.ownerName ?? '',
      email: tenant.ownerEmail,
      role: 'barber',
    },
  };
}

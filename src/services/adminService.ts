import { TenantStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { getPublicClient } from '../config/database';
import { deleteTenantSchema } from '../utils/tenantManager';
import { generateToken } from '../utils/jwt';
import { createError } from '../middleware/errorHandler';

function slugify(text: string): string {
  return text.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const client = () => getPublicClient();

export async function adminLogin(email: string, password: string) {
  const admin = await client().superAdmin.findUnique({ where: { email } });
  if (!admin) throw createError('Invalid credentials', 401);

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) throw createError('Invalid credentials', 401);

  const token = generateToken({ id: admin.id, email: admin.email, role: 'SUPER_ADMIN' });
  return { token, admin: { id: admin.id, email: admin.email } };
}

export async function createTenant(data: { shopName: string; subdomain: string; ownerEmail: string }) {
  const existing = await client().tenant.findUnique({ where: { subdomain: data.subdomain } });
  if (existing) throw createError('Subdomain already taken', 409);

  const schemaName = 'tenant_' + slugify(data.subdomain).replace(/-/g, '_');

  const tenant = await client().tenant.create({
    data: {
      shopName: data.shopName,
      subdomain: data.subdomain,
      schemaName,
      ownerEmail: data.ownerEmail,
      status: 'ACTIVE',
    },
  });

  return tenant;
}

export async function listTenants() {
  return client().tenant.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function updateTenantStatus(id: string, status: TenantStatus) {
  const tenant = await client().tenant.findUnique({ where: { id } });
  if (!tenant) throw createError('Tenant not found', 404);
  return client().tenant.update({ where: { id }, data: { status } });
}

export async function deleteTenant(id: string) {
  const tenant = await client().tenant.findUnique({ where: { id } });
  if (!tenant) throw createError('Tenant not found', 404);
  // Clean up any old per-tenant schemas that may have been created previously
  await deleteTenantSchema(tenant.schemaName).catch(() => null);
  await client().tenant.delete({ where: { id } });
}

export async function getDashboardStats() {
  const [total, active, inactive, suspended, pending, totalAppointments, billedRows] = await Promise.all([
    client().tenant.count(),
    client().tenant.count({ where: { status: 'ACTIVE' } }),
    client().tenant.count({ where: { status: 'INACTIVE' } }),
    client().tenant.count({ where: { status: 'SUSPENDED' } }),
    client().tenant.count({ where: { status: 'PENDING' } }),
    client().appointment.count(),
    client().appointment.findMany({
      where: { status: { in: ['CONFIRMED', 'COMPLETED'] } },
      include: { treatment: { select: { price: true } } },
    }),
  ]);
  const totalRevenue = billedRows.reduce((s, r) => s + r.treatment.price, 0);
  return { total, active, inactive, suspended, pending, totalAppointments, totalRevenue };
}

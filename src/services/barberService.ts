import { Tenant } from '@prisma/client';
import { getPublicClient } from '../config/database';
import { createError } from '../middleware/errorHandler';

const db = () => getPublicClient();

// ─── Services (Treatments) ────────────────────────────────────────────────────

export async function listServices(tenant: Tenant) {
  return db().treatment.findMany({
    where: { tenantId: tenant.id },
    orderBy: { name: 'asc' },
  });
}

export async function createService(
  tenant: Tenant,
  data: { name: string; description?: string; duration: number; price: number }
) {
  return db().treatment.create({
    data: { tenantId: tenant.id, ...data, status: 'Active' },
  });
}

export async function updateService(
  tenant: Tenant,
  serviceId: string,
  data: Partial<{ name: string; description: string; duration: number; price: number; status: string }>
) {
  const treatment = await db().treatment.findFirst({ where: { id: serviceId, tenantId: tenant.id } });
  if (!treatment) throw createError('Service not found', 404);
  return db().treatment.update({ where: { id: serviceId }, data });
}

export async function deleteService(tenant: Tenant, serviceId: string) {
  const treatment = await db().treatment.findFirst({ where: { id: serviceId, tenantId: tenant.id } });
  if (!treatment) throw createError('Service not found', 404);
  return db().treatment.delete({ where: { id: serviceId } });
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export async function listAllAppointments(tenant: Tenant, filters: { status?: string; date?: string }) {
  return db().appointment.findMany({
    where: {
      tenantId: tenant.id,
      ...(filters.status && { status: filters.status as any }),
      ...(filters.date && {
        appointmentDate: {
          gte: new Date(filters.date),
          lt: new Date(new Date(filters.date).setDate(new Date(filters.date).getDate() + 1)),
        },
      }),
    },
    include: {
      customer: { select: { id: true, fullName: true, email: true, phone: true } },
      treatment: { select: { id: true, name: true, duration: true, price: true } },
      artisan: { select: { id: true, name: true, specialty: true } },
    },
    orderBy: [{ appointmentDate: 'asc' }, { appointmentTime: 'asc' }],
  });
}

export async function updateAppointmentStatus(
  tenant: Tenant,
  appointmentId: string,
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
) {
  const appt = await db().appointment.findFirst({ where: { id: appointmentId, tenantId: tenant.id } });
  if (!appt) throw createError('Appointment not found', 404);
  return db().appointment.update({ where: { id: appointmentId }, data: { status } });
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export async function getDashboardStats(tenant: Tenant) {
  const [totalAppointments, pending, confirmed, completed, cancelled, uniqueCustomers, totalServices] =
    await Promise.all([
      db().appointment.count({ where: { tenantId: tenant.id } }),
      db().appointment.count({ where: { tenantId: tenant.id, status: 'PENDING' } }),
      db().appointment.count({ where: { tenantId: tenant.id, status: 'CONFIRMED' } }),
      db().appointment.count({ where: { tenantId: tenant.id, status: 'COMPLETED' } }),
      db().appointment.count({ where: { tenantId: tenant.id, status: 'CANCELLED' } }),
      db().appointment.groupBy({ by: ['customerId'], where: { tenantId: tenant.id } }).then((r) => r.length),
      db().treatment.count({ where: { tenantId: tenant.id, status: 'Active' } }),
    ]);

  return {
    appointments: { total: totalAppointments, pending, confirmed, completed, cancelled },
    customers: uniqueCustomers,
    activeServices: totalServices,
  };
}

import { Tenant } from '@prisma/client';
import { getPublicClient } from '../config/database';
import { createError } from '../middleware/errorHandler';

const db = () => getPublicClient();

export async function listAvailableServices(tenant: Tenant) {
  return db().treatment.findMany({
    where: { tenantId: tenant.id, status: 'Active' },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, description: true, duration: true, price: true },
  });
}

export async function bookAppointment(
  tenant: Tenant,
  customerId: string,
  data: {
    serviceId: string; // treatmentId
    appointmentDate: string;
    appointmentTime: string;
    artisanId?: string;
    notes?: string;
  }
) {
  const treatment = await db().treatment.findFirst({
    where: { id: data.serviceId, tenantId: tenant.id, status: 'Active' },
  });
  if (!treatment) throw createError('Service not available', 404);

  const conflict = await db().appointment.findFirst({
    where: {
      tenantId: tenant.id,
      appointmentDate: new Date(data.appointmentDate),
      appointmentTime: data.appointmentTime,
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
  });
  if (conflict) throw createError('That time slot is already booked', 409);

  return db().appointment.create({
    data: {
      tenantId: tenant.id,
      customerId,
      treatmentId: data.serviceId,
      artisanId: data.artisanId ?? null,
      appointmentDate: new Date(data.appointmentDate),
      appointmentTime: data.appointmentTime,
      notes: data.notes,
      status: 'PENDING',
    },
    include: {
      treatment: { select: { name: true, duration: true, price: true } },
      artisan: { select: { name: true } },
    },
  });
}

export async function getMyAppointments(tenant: Tenant, customerId: string) {
  return db().appointment.findMany({
    where: { tenantId: tenant.id, customerId },
    include: {
      treatment: { select: { id: true, name: true, duration: true, price: true } },
      artisan: { select: { id: true, name: true } },
    },
    orderBy: [{ appointmentDate: 'desc' }, { appointmentTime: 'desc' }],
  });
}

export async function cancelAppointment(tenant: Tenant, customerId: string, appointmentId: string) {
  const appt = await db().appointment.findFirst({ where: { id: appointmentId, tenantId: tenant.id } });
  if (!appt) throw createError('Appointment not found', 404);
  if (appt.customerId !== customerId) throw createError('Forbidden', 403);
  if (appt.status === 'COMPLETED') throw createError('Cannot cancel a completed appointment', 400);
  if (appt.status === 'CANCELLED') throw createError('Appointment is already cancelled', 400);

  return db().appointment.update({
    where: { id: appointmentId },
    data: { status: 'CANCELLED' },
  });
}

export async function getProfile(_tenant: Tenant, customerId: string) {
  const customer = await db().customer.findUnique({
    where: { id: customerId },
    select: { id: true, userId: true, email: true, fullName: true, phone: true, createdAt: true },
  });
  if (!customer) throw createError('User not found', 404);
  return customer;
}

export async function updateProfile(
  _tenant: Tenant,
  customerId: string,
  data: { fullName?: string; phone?: string }
) {
  return db().customer.update({
    where: { id: customerId },
    data,
    select: { id: true, userId: true, email: true, fullName: true, phone: true, updatedAt: true },
  });
}

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { validationError, apiError } from '../../utils/apiError';
import { getPublicClient } from '../../config/database';

function serviceErr(err: unknown) {
  const e = err as { statusCode?: number; code?: string; message?: string };
  return e.statusCode && e.code ? e : null;
}

export async function bookAppointment(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { validationError(res, errors.array()); return; }

  if (req.userV1!.role !== 'customer') {
    apiError(res, 403, 'FORBIDDEN', 'Only customers can book appointments.');
    return;
  }

  try {
    const db = getPublicClient();
    const { tenantSlug, treatmentId, artisanId, appointmentDate, appointmentTime, notes } = req.body;

    const tenant = await db.tenant.findFirst({ where: { subdomain: tenantSlug, status: 'ACTIVE' } });
    if (!tenant) { apiError(res, 404, 'SHOP_NOT_FOUND', 'Shop not found.'); return; }

    const treatment = await db.treatment.findFirst({ where: { id: treatmentId, tenantId: tenant.id, status: 'Active' } });
    if (!treatment) { apiError(res, 404, 'TREATMENT_NOT_FOUND', 'Treatment not found or inactive.'); return; }

    // Artisan-aware conflict check with duration overlap detection.
    // If an artisan is selected we scope to that artisan; otherwise we check shop-wide.
    const toMins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const newStart = toMins(appointmentTime);
    const newEnd   = newStart + treatment.duration;

    const sameDayAppts = await db.appointment.findMany({
      where: {
        tenantId: tenant.id,
        appointmentDate: new Date(appointmentDate),
        status: { in: ['PENDING', 'CONFIRMED'] },
        ...(artisanId ? { artisanId } : {}),
      },
      include: { treatment: { select: { duration: true } } },
    });

    const conflict = sameDayAppts.some((a) => {
      const aStart = toMins(a.appointmentTime);
      const aEnd   = aStart + a.treatment.duration;
      return newStart < aEnd && newEnd > aStart;
    });
    if (conflict) { apiError(res, 409, 'SLOT_TAKEN', 'That time slot is already booked.'); return; }

    const appointment = await db.appointment.create({
      data: {
        tenantId: tenant.id,
        customerId: req.userV1!.sub,
        treatmentId,
        artisanId: artisanId ?? null,
        appointmentDate: new Date(appointmentDate),
        appointmentTime,
        notes: notes ?? null,
        status: 'PENDING',
      },
      include: {
        treatment: { select: { name: true, duration: true, price: true } },
        artisan: { select: { name: true } },
      },
    });

    res.status(201).json({
      id: appointment.id,
      status: appointment.status,
      appointmentDate: appointment.appointmentDate.toISOString(),
      appointmentTime: appointment.appointmentTime,
      notes: appointment.notes,
      treatment: appointment.treatment,
      artisan: appointment.artisan,
    });
  } catch (err) {
    const e = serviceErr(err);
    if (e) apiError(res, e.statusCode!, e.code!, e.message!);
    else next(err);
  }
}

export async function getMyAppointments(req: Request, res: Response, next: NextFunction) {
  try {
    const db = getPublicClient();
    const { tenant: tenantSlug } = req.query as { tenant?: string };

    let tenantId: string | undefined;
    if (tenantSlug) {
      const tenant = await db.tenant.findFirst({ where: { subdomain: tenantSlug } });
      if (!tenant) { res.json({ appointments: [] }); return; }
      tenantId = tenant.id;
    }

    const appointments = await db.appointment.findMany({
      where: {
        customerId: req.userV1!.sub,
        ...(tenantId && { tenantId }),
      },
      include: {
        tenant: { select: { subdomain: true, shopName: true } },
        treatment: { select: { name: true, duration: true, price: true } },
        artisan: { select: { name: true } },
      },
      orderBy: [{ appointmentDate: 'desc' }, { appointmentTime: 'desc' }],
    });

    res.json({
      appointments: appointments.map((a) => ({
        id: a.id,
        shopName: a.tenant.shopName,
        shopSlug: a.tenant.subdomain,
        treatment: a.treatment,
        artisan: a.artisan,
        appointmentDate: a.appointmentDate.toISOString().split('T')[0],
        appointmentTime: a.appointmentTime,
        status: a.status,
        notes: a.notes,
        createdAt: a.createdAt.toISOString(),
      })),
    });
  } catch (err) { next(err); }
}

export async function cancelMyAppointment(req: Request, res: Response, next: NextFunction) {
  try {
    const db = getPublicClient();
    const appt = await db.appointment.findFirst({
      where: { id: req.params.id, customerId: req.userV1!.sub },
    });
    if (!appt) { apiError(res, 404, 'NOT_FOUND', 'Appointment not found.'); return; }
    if (appt.status === 'COMPLETED') { apiError(res, 400, 'ALREADY_COMPLETED', 'Cannot cancel a completed appointment.'); return; }
    if (appt.status === 'CANCELLED') { apiError(res, 400, 'ALREADY_CANCELLED', 'Appointment is already cancelled.'); return; }

    await db.appointment.update({ where: { id: appt.id }, data: { status: 'CANCELLED' } });
    res.status(204).send();
  } catch (err) { next(err); }
}

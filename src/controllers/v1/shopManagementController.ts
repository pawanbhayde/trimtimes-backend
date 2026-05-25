import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { apiError, validationError } from '../../utils/apiError';
import * as svc from '../../services/v1/shopManagementService';

type ServiceError = Error & { statusCode?: number; code?: string };

function handleServiceError(err: unknown, res: Response, next: NextFunction) {
  const e = err as ServiceError;
  if (e.statusCode && e.code) {
    apiError(res, e.statusCode, e.code, e.message);
  } else {
    next(err);
  }
}

// ─── Public ───────────────────────────────────────────────────────────────────

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.getShopProfile(req.params.slug);
    res.json(data);
  } catch (err) { handleServiceError(err, res, next); }
}

export async function getTreatments(req: Request, res: Response, next: NextFunction) {
  try {
    const treatments = await svc.getShopTreatments(req.params.slug);
    res.json({ treatments });
  } catch (err) { handleServiceError(err, res, next); }
}

export async function getHours(req: Request, res: Response, next: NextFunction) {
  try {
    const hours = await svc.getShopHours(req.params.slug);
    res.json({ hours });
  } catch (err) { handleServiceError(err, res, next); }
}

export async function getLocation(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.getShopLocation(req.params.slug);
    res.json(data);
  } catch (err) { handleServiceError(err, res, next); }
}

export async function getArtisans(req: Request, res: Response, next: NextFunction) {
  try {
    const artisans = await svc.getShopArtisans(req.params.slug);
    res.json({ artisans });
  } catch (err) { handleServiceError(err, res, next); }
}

export async function getReviews(req: Request, res: Response, next: NextFunction) {
  try {
    const reviews = await svc.getShopReviews(req.params.slug);
    res.json({ reviews });
  } catch (err) { handleServiceError(err, res, next); }
}

export async function getAvailableSlots(req: Request, res: Response, next: NextFunction) {
  try {
    const { date, treatmentId, artisanId } = req.query as {
      date?: string;
      treatmentId?: string;
      artisanId?: string;
    };

    if (!date || !treatmentId) {
      res.status(400).json({ error: { code: 'MISSING_PARAMS', message: '`date` and `treatmentId` are required.' } });
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: { code: 'INVALID_DATE', message: '`date` must be YYYY-MM-DD.' } });
      return;
    }

    const result = await svc.getAvailableSlots(
      req.params.slug,
      date,
      treatmentId,
      artisanId ?? null,
    );

    res.json(result);
  } catch (err) { handleServiceError(err, res, next); }
}

// ─── Shop Appointments (barber view) ─────────────────────────────────────────

export async function listShopAppointments(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, date } = req.query as { status?: string; date?: string };
    const appointments = await svc.listShopAppointments(req.userV1!.sub, { status, date });
    res.json({ appointments });
  } catch (err) { handleServiceError(err, res, next); }
}

export async function updateAppointmentStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const appt = await svc.updateShopAppointmentStatus(req.userV1!.sub, req.params.id, req.body.status);
    res.json(appt);
  } catch (err) { handleServiceError(err, res, next); }
}

// ─── Authenticated ────────────────────────────────────────────────────────────

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { validationError(res, errors.array()); return; }
  try {
    const data = await svc.updateProfile(req.userV1!.sub, req.body);
    res.json(data);
  } catch (err) { handleServiceError(err, res, next); }
}

export async function createTreatment(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { validationError(res, errors.array()); return; }
  try {
    const data = await svc.createTreatment(req.userV1!.sub, req.body);
    res.status(201).json(data);
  } catch (err) { handleServiceError(err, res, next); }
}

export async function updateTreatment(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { validationError(res, errors.array()); return; }
  try {
    const data = await svc.updateTreatment(req.userV1!.sub, req.params.id, req.body);
    res.json(data);
  } catch (err) { handleServiceError(err, res, next); }
}

export async function deleteTreatment(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteTreatment(req.userV1!.sub, req.params.id);
    res.status(204).send();
  } catch (err) { handleServiceError(err, res, next); }
}

export async function upsertHours(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { validationError(res, errors.array()); return; }
  try {
    const hours = await svc.upsertHours(req.userV1!.sub, req.body.hours);
    res.json({ hours });
  } catch (err) { handleServiceError(err, res, next); }
}

export async function updateLocation(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { validationError(res, errors.array()); return; }
  try {
    const data = await svc.updateLocation(req.userV1!.sub, req.body);
    res.json(data);
  } catch (err) { handleServiceError(err, res, next); }
}

export async function createArtisan(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { validationError(res, errors.array()); return; }
  try {
    const data = await svc.createArtisan(req.userV1!.sub, req.body);
    res.status(201).json(data);
  } catch (err) { handleServiceError(err, res, next); }
}

export async function updateArtisan(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { validationError(res, errors.array()); return; }
  try {
    const data = await svc.updateArtisan(req.userV1!.sub, req.params.id, req.body);
    res.json(data);
  } catch (err) { handleServiceError(err, res, next); }
}

export async function deleteArtisan(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteArtisan(req.userV1!.sub, req.params.id);
    res.status(204).send();
  } catch (err) { handleServiceError(err, res, next); }
}

export async function patchReview(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { validationError(res, errors.array()); return; }
  try {
    const data = await svc.toggleReviewFeatured(req.userV1!.sub, req.params.id, req.body.isFeatured);
    res.json(data);
  } catch (err) { handleServiceError(err, res, next); }
}

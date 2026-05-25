import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import * as barberService from '../services/barberService';

function handleValidation(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return false;
  }
  return true;
}

export async function listServices(req: Request, res: Response, next: NextFunction) {
  try {
    const services = await barberService.listServices(req.tenant!);
    res.json({ success: true, data: services });
  } catch (err) { next(err); }
}

export async function createService(req: Request, res: Response, next: NextFunction) {
  if (!handleValidation(req, res)) return;
  try {
    const service = await barberService.createService(req.tenant!, req.body);
    res.status(201).json({ success: true, data: service });
  } catch (err) { next(err); }
}

export async function updateService(req: Request, res: Response, next: NextFunction) {
  if (!handleValidation(req, res)) return;
  try {
    const service = await barberService.updateService(req.tenant!, req.params.id, req.body);
    res.json({ success: true, data: service });
  } catch (err) { next(err); }
}

export async function deleteService(req: Request, res: Response, next: NextFunction) {
  try {
    await barberService.deleteService(req.tenant!, req.params.id);
    res.json({ success: true, message: 'Service deleted' });
  } catch (err) { next(err); }
}

export async function listAppointments(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, date } = req.query as { status?: string; date?: string };
    const appointments = await barberService.listAllAppointments(req.tenant!, { status, date });
    res.json({ success: true, data: appointments });
  } catch (err) { next(err); }
}

export async function updateAppointment(req: Request, res: Response, next: NextFunction) {
  if (!handleValidation(req, res)) return;
  try {
    const appt = await barberService.updateAppointmentStatus(
      req.tenant!,
      req.params.id,
      req.body.status
    );
    res.json({ success: true, data: appt });
  } catch (err) { next(err); }
}

export async function getDashboardStats(req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await barberService.getDashboardStats(req.tenant!);
    res.json({ success: true, data: stats });
  } catch (err) { next(err); }
}

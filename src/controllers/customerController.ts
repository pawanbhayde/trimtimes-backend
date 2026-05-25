import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import * as customerService from '../services/customerService';

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
    const services = await customerService.listAvailableServices(req.tenant!);
    res.json({ success: true, data: services });
  } catch (err) { next(err); }
}

export async function bookAppointment(req: Request, res: Response, next: NextFunction) {
  if (!handleValidation(req, res)) return;
  try {
    const appt = await customerService.bookAppointment(req.tenant!, req.user!.id, req.body);
    res.status(201).json({ success: true, data: appt });
  } catch (err) { next(err); }
}

export async function listMyAppointments(req: Request, res: Response, next: NextFunction) {
  try {
    const appointments = await customerService.getMyAppointments(req.tenant!, req.user!.id);
    res.json({ success: true, data: appointments });
  } catch (err) { next(err); }
}

export async function cancelAppointment(req: Request, res: Response, next: NextFunction) {
  try {
    const appt = await customerService.cancelAppointment(req.tenant!, req.user!.id, req.params.id);
    res.json({ success: true, data: appt });
  } catch (err) { next(err); }
}

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await customerService.getProfile(req.tenant!, req.user!.id);
    res.json({ success: true, data: profile });
  } catch (err) { next(err); }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  if (!handleValidation(req, res)) return;
  try {
    const profile = await customerService.updateProfile(req.tenant!, req.user!.id, req.body);
    res.json({ success: true, data: profile });
  } catch (err) { next(err); }
}

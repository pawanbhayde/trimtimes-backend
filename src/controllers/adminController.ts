import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import * as adminService from '../services/adminService';
import { TenantStatus } from '@prisma/client';

function handleValidation(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return false;
  }
  return true;
}

export async function login(req: Request, res: Response, next: NextFunction) {
  if (!handleValidation(req, res)) return;
  try {
    const result = await adminService.adminLogin(req.body.email, req.body.password);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function createTenant(req: Request, res: Response, next: NextFunction) {
  if (!handleValidation(req, res)) return;
  try {
    const tenant = await adminService.createTenant(req.body);
    res.status(201).json({ success: true, data: tenant });
  } catch (err) { next(err); }
}

export async function listTenants(req: Request, res: Response, next: NextFunction) {
  try {
    const tenants = await adminService.listTenants();
    res.json({ success: true, data: tenants });
  } catch (err) { next(err); }
}

export async function updateTenant(req: Request, res: Response, next: NextFunction) {
  if (!handleValidation(req, res)) return;
  try {
    const tenant = await adminService.updateTenantStatus(req.params.id, req.body.status as TenantStatus);
    res.json({ success: true, data: tenant });
  } catch (err) { next(err); }
}

export async function deleteTenant(req: Request, res: Response, next: NextFunction) {
  try {
    await adminService.deleteTenant(req.params.id);
    res.json({ success: true, message: 'Tenant deleted successfully' });
  } catch (err) { next(err); }
}

export async function getStats(req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await adminService.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (err) { next(err); }
}

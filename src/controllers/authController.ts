import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import * as authService from '../services/authService';

function handleValidation(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return false;
  }
  return true;
}

export async function register(req: Request, res: Response, next: NextFunction) {
  if (!handleValidation(req, res)) return;
  try {
    const result = await authService.register(req.tenant!, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  if (!handleValidation(req, res)) return;
  try {
    const result = await authService.login(req.tenant!, req.body.email, req.body.password);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function logout(_req: Request, res: Response) {
  // JWT is stateless — the client drops the token.
  // Implement a token blacklist (Redis) here if needed.
  res.json({ success: true, message: 'Logged out successfully' });
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.getMe(req.tenant!, req.user!.id);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}

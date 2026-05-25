import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { apiError, validationError } from '../../utils/apiError';
import * as shopService from '../../services/v1/shopAuthService';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/v1/auth',
};

function serviceErr(err: unknown): { statusCode: number; code: string; message: string } | null {
  const e = err as { statusCode?: number; code?: string; message?: string };
  if (e.statusCode && e.code) {
    return { statusCode: e.statusCode, code: e.code, message: e.message ?? e.code };
  }
  return null;
}

export async function listShops(req: Request, res: Response, next: NextFunction) {
  try {
    const status = (req.query.status as string | undefined)?.toUpperCase() ?? 'ACTIVE';
    const shops = await shopService.listShops(status);
    res.json({ shops });
  } catch (err) { next(err); }
}

export async function registerShop(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { validationError(res, errors.array()); return; }

  try {
    const result = await shopService.registerShop(req.body);
    res.cookie('refresh_token', result.refreshToken, REFRESH_COOKIE_OPTIONS);
    const { refreshToken: _, ...body } = result;
    res.status(201).json(body);
  } catch (err) {
    const e = serviceErr(err);
    if (e) {
      const msg =
        e.code === 'SHOP_EMAIL_EXISTS' ? 'This email is already registered to a shop.' :
        e.code === 'SHOP_SLUG_EXISTS' ? 'This shop URL is already taken.' :
        'Failed to provision shop. Please try again.';
      apiError(res, e.statusCode, e.code, msg);
    } else { next(err); }
  }
}

export async function loginShop(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { validationError(res, errors.array()); return; }

  try {
    const { email, password, tenantId } = req.body;
    const result = await shopService.loginShop(email, password, tenantId);
    res.cookie('refresh_token', result.refreshToken, REFRESH_COOKIE_OPTIONS);
    const { refreshToken: _, ...body } = result;
    res.json(body);
  } catch (err) {
    const e = serviceErr(err);
    if (e) {
      const msg =
        e.code === 'SHOP_NOT_FOUND' ? 'No shop found with that ID.' :
        e.code === 'SHOP_INACTIVE' ? 'This shop account is not active.' :
        'The email or password you entered is incorrect.';
      apiError(res, e.statusCode, e.code, msg);
    } else { next(err); }
  }
}

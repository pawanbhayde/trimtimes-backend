import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { apiError, validationError } from '../../utils/apiError';
import * as userService from '../../services/v1/userAuthService';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/v1/auth',
};

export async function registerUser(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { validationError(res, errors.array()); return; }

  try {
    const result = await userService.registerUser(req.body);
    res.cookie('refresh_token', result.refreshToken, REFRESH_COOKIE_OPTIONS);
    const { refreshToken: _, ...body } = result;
    res.status(201).json(body);
  } catch (err) {
    const e = err as { statusCode?: number; code?: string };
    if (e.statusCode === 409 && e.code === 'EMAIL_EXISTS') {
      apiError(res, 409, 'EMAIL_EXISTS', 'An account with this email already exists.');
    } else { next(err); }
  }
}

export async function loginUser(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { validationError(res, errors.array()); return; }

  try {
    const { email, password } = req.body;
    const result = await userService.loginUser(email, password);
    res.cookie('refresh_token', result.refreshToken, REFRESH_COOKIE_OPTIONS);
    const { refreshToken: _, ...body } = result;
    res.json(body);
  } catch (err) {
    const e = err as { statusCode?: number; code?: string };
    if (e.statusCode === 401) {
      apiError(res, 401, 'INVALID_CREDENTIALS', 'The email or password you entered is incorrect.');
    } else { next(err); }
  }
}

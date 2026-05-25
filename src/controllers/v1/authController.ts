import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getPublicClient } from '../../config/database';
import { verifyRefreshToken, signAccessToken } from '../../utils/jwt';
import { findRefreshToken, revokeRefreshToken } from '../../services/tokenService';
import { apiError } from '../../utils/apiError';

const ACCESS_EXPIRES_IN_SECONDS = 3600;

export async function refresh(req: Request, res: Response, next: NextFunction) {
  const token: string | undefined = req.cookies?.refresh_token;
  if (!token) {
    apiError(res, 401, 'REFRESH_TOKEN_INVALID', 'Refresh token cookie is missing.');
    return;
  }

  try {
    // Verify JWT signature + expiry first
    let payload: { sub: string; role: string };
    try {
      payload = verifyRefreshToken(token);
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        apiError(res, 401, 'REFRESH_TOKEN_EXPIRED', 'Refresh token has expired. Please log in again.');
      } else {
        apiError(res, 401, 'REFRESH_TOKEN_INVALID', 'Invalid refresh token.');
      }
      return;
    }

    // Check it hasn't been revoked (logout)
    const stored = await findRefreshToken(token);
    if (!stored || stored.expiresAt < new Date()) {
      apiError(res, 401, 'REFRESH_TOKEN_INVALID', 'Refresh token is invalid or has been revoked.');
      return;
    }

    const db = getPublicClient();
    const role = payload.role as 'barber' | 'customer' | 'admin';

    if (role === 'barber') {
      const tenant = await db.tenant.findUnique({ where: { id: payload.sub } });
      if (!tenant) { apiError(res, 401, 'REFRESH_TOKEN_INVALID', 'Associated shop no longer exists.'); return; }
      const accessToken = signAccessToken({ sub: tenant.id, email: tenant.ownerEmail, role: 'barber', tenantId: tenant.subdomain });
      res.json({ accessToken, expiresIn: ACCESS_EXPIRES_IN_SECONDS });

    } else if (role === 'customer') {
      const customer = await db.customer.findUnique({ where: { id: payload.sub } });
      if (!customer) { apiError(res, 401, 'REFRESH_TOKEN_INVALID', 'Associated account no longer exists.'); return; }
      const accessToken = signAccessToken({ sub: customer.id, email: customer.email, role: 'customer', userId: customer.userId });
      res.json({ accessToken, expiresIn: ACCESS_EXPIRES_IN_SECONDS });

    } else if (role === 'admin') {
      const admin = await db.superAdmin.findUnique({ where: { id: payload.sub } });
      if (!admin) { apiError(res, 401, 'REFRESH_TOKEN_INVALID', 'Associated admin no longer exists.'); return; }
      const accessToken = signAccessToken({ sub: admin.id, email: admin.email, role: 'admin' });
      res.json({ accessToken, expiresIn: ACCESS_EXPIRES_IN_SECONDS });

    } else {
      apiError(res, 401, 'REFRESH_TOKEN_INVALID', 'Unknown token role.');
    }
  } catch (err) { next(err); }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const token: string | undefined = req.cookies?.refresh_token;
    if (token) await revokeRefreshToken(token);
    res.clearCookie('refresh_token', { path: '/api/v1/auth' });
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.userV1!;
    const db = getPublicClient();

    if (user.role === 'barber') {
      const tenant = await db.tenant.findUnique({ where: { id: user.sub } });
      if (!tenant) { apiError(res, 404, 'NOT_FOUND', 'Shop not found.'); return; }
      res.json({
        user: { id: tenant.id, name: tenant.ownerName ?? '', email: tenant.ownerEmail, role: 'barber' },
        tenant: {
          id: tenant.subdomain,
          name: tenant.shopName,
          schemaName: tenant.schemaName,
          status: tenant.status === 'ACTIVE' ? 'Active' : 'Inactive',
        },
      });

    } else if (user.role === 'customer') {
      const customer = await db.customer.findUnique({ where: { id: user.sub } });
      if (!customer) { apiError(res, 404, 'NOT_FOUND', 'User not found.'); return; }
      res.json({
        user: {
          id: customer.id,
          userId: customer.userId,
          name: customer.fullName,
          email: customer.email,
          phone: customer.phone,
          role: 'customer',
        },
      });

    } else if (user.role === 'admin') {
      const admin = await db.superAdmin.findUnique({ where: { id: user.sub } });
      if (!admin) { apiError(res, 404, 'NOT_FOUND', 'Admin not found.'); return; }
      res.json({ user: { id: admin.id, email: admin.email, role: 'admin' } });

    } else {
      apiError(res, 403, 'FORBIDDEN', 'Unknown role.');
    }
  } catch (err) { next(err); }
}

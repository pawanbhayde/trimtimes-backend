import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyAccessToken } from '../utils/jwt';

export function authenticateV1(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authorization token required', field: null } });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.userV1 = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: { code: 'TOKEN_EXPIRED', message: 'Access token has expired', field: null } });
    } else {
      res.status(401).json({ error: { code: 'TOKEN_INVALID', message: 'Invalid access token', field: null } });
    }
  }
}

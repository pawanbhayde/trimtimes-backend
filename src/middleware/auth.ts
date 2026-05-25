import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import jwt from 'jsonwebtoken';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Authorization token required' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId,
      schemaName: payload.schemaName,
    };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, message: 'Token has expired' });
    } else {
      res.status(401).json({ success: false, message: 'Invalid token' });
    }
  }
}

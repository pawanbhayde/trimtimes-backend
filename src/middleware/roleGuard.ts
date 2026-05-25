import { Request, Response, NextFunction } from 'express';

type Role = 'SUPER_ADMIN' | 'BARBER' | 'CUSTOMER';

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }
    if (!allowedRoles.includes(req.user.role as Role)) {
      res.status(403).json({ success: false, message: 'Forbidden: insufficient permissions' });
      return;
    }
    next();
  };
}

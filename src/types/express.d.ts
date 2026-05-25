import { Tenant } from '@prisma/client';
import { AccessTokenPayload } from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      // Populated by tenantContext middleware for all /api/:tenant/* routes
      tenant?: Tenant;

      // Populated by legacy auth middleware
      user?: {
        id: string;
        email: string;
        role: 'SUPER_ADMIN' | 'BARBER' | 'CUSTOMER';
        schemaName?: string;
        tenantId?: string;
      };

      // Populated by v1 authenticateV1 middleware
      userV1?: AccessTokenPayload;
    }
  }
}

export {};

import { Request, Response, NextFunction } from 'express';
import { getPublicClient } from '../config/database';

// Resolves and validates the tenant on every tenant-scoped route.
// Tenant identifier is taken from (in order of priority):
//   1. URL param   :tenant       e.g. /api/downtown-cuts/auth/login
//   2. Header      x-tenant-id   e.g. x-tenant-id: downtown-cuts
//   3. Subdomain   Host header   e.g. downtown-cuts.yourdomain.com

export async function tenantContext(req: Request, res: Response, next: NextFunction): Promise<void> {
  const identifier =
    (req.params.tenant as string | undefined) ||
    (req.headers['x-tenant-id'] as string | undefined) ||
    extractSubdomain(req.headers.host);

  if (!identifier) {
    res.status(400).json({ success: false, message: 'Tenant identifier is required' });
    return;
  }

  const client = getPublicClient();

  const tenant = await client.tenant.findFirst({
    where: { subdomain: identifier },
  }).catch(() => null);

  if (!tenant) {
    res.status(404).json({ success: false, message: 'Tenant not found' });
    return;
  }

  if (tenant.status !== 'ACTIVE') {
    res.status(403).json({ success: false, message: `Tenant account is ${tenant.status.toLowerCase()}` });
    return;
  }

  req.tenant = tenant;
  next();
}

function extractSubdomain(host: string | undefined): string | undefined {
  if (!host) return undefined;
  const parts = host.split('.');
  return parts.length >= 3 ? parts[0] : undefined;
}

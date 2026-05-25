import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/roleGuard';
import * as ctrl from '../../controllers/adminController';

const router = Router();

// POST /api/admin/login
router.post(
  '/login',
  [body('email').isEmail(), body('password').notEmpty()],
  ctrl.login
);

// All routes below require super admin JWT
router.use(authenticate, requireRole('SUPER_ADMIN'));

// POST /api/admin/tenants
router.post(
  '/tenants',
  [
    body('shopName').notEmpty().trim(),
    body('subdomain').notEmpty().trim().toLowerCase()
      .matches(/^[a-z0-9-]+$/).withMessage('Subdomain may only contain lowercase letters, numbers and hyphens'),
    body('ownerEmail').isEmail(),
  ],
  ctrl.createTenant
);

// GET /api/admin/tenants
router.get('/tenants', ctrl.listTenants);

// PATCH /api/admin/tenants/:id
router.patch(
  '/tenants/:id',
  [
    param('id').isUUID(),
    body('status').isIn(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING']),
  ],
  ctrl.updateTenant
);

// DELETE /api/admin/tenants/:id
router.delete('/tenants/:id', ctrl.deleteTenant);

// GET /api/admin/stats
router.get('/stats', ctrl.getStats);

export default router;

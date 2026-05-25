import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/roleGuard';
import * as ctrl from '../../controllers/barberController';

const router = Router();

router.use(authenticate, requireRole('BARBER'));

// GET  /api/:tenant/barber/services
router.get('/services', ctrl.listServices);

// POST /api/:tenant/barber/services
router.post(
  '/services',
  [
    body('name').notEmpty().trim(),
    body('duration').isInt({ min: 1 }),
    body('price').isFloat({ min: 0 }),
    body('description').optional().trim(),
  ],
  ctrl.createService
);

// PATCH /api/:tenant/barber/services/:id
router.patch(
  '/services/:id',
  [
    body('name').optional().notEmpty().trim(),
    body('duration').optional().isInt({ min: 1 }),
    body('price').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(['ACTIVE', 'INACTIVE']),
  ],
  ctrl.updateService
);

// DELETE /api/:tenant/barber/services/:id
router.delete('/services/:id', ctrl.deleteService);

// GET  /api/:tenant/barber/appointments
router.get('/appointments', ctrl.listAppointments);

// PATCH /api/:tenant/barber/appointments/:id
router.patch(
  '/appointments/:id',
  [body('status').isIn(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'])],
  ctrl.updateAppointment
);

// GET /api/:tenant/barber/dashboard/stats
router.get('/dashboard/stats', ctrl.getDashboardStats);

export default router;

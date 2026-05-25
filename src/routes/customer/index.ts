import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/roleGuard';
import * as ctrl from '../../controllers/customerController';

const router = Router();

router.use(authenticate, requireRole('CUSTOMER'));

// GET  /api/:tenant/customer/services
router.get('/services', ctrl.listServices);

// POST /api/:tenant/customer/appointments
router.post(
  '/appointments',
  [
    body('serviceId').isUUID(),
    body('appointmentDate').isISO8601().toDate(),
    body('appointmentTime').matches(/^\d{2}:\d{2}$/).withMessage('Use HH:MM format'),
    body('notes').optional().trim(),
  ],
  ctrl.bookAppointment
);

// GET  /api/:tenant/customer/appointments
router.get('/appointments', ctrl.listMyAppointments);

// PATCH /api/:tenant/customer/appointments/:id  (cancel)
router.patch('/appointments/:id', ctrl.cancelAppointment);

// GET  /api/:tenant/customer/profile
router.get('/profile', ctrl.getProfile);

// PATCH /api/:tenant/customer/profile
router.patch(
  '/profile',
  [
    body('fullName').optional().notEmpty().trim(),
    body('phone').optional().isMobilePhone('any'),
  ],
  ctrl.updateProfile
);

export default router;

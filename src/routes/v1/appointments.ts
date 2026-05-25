import { Router } from 'express';
import { body } from 'express-validator';
import { authenticateV1 } from '../../middleware/authenticateV1';
import * as ctrl from '../../controllers/v1/appointmentController';

const router = Router();

// POST /api/v1/appointments         — book a new appointment (customer auth)
router.post(
  '/',
  authenticateV1,
  [
    body('tenantSlug').notEmpty().withMessage('tenantSlug is required.'),
    body('treatmentId').isUUID().withMessage('treatmentId must be a valid UUID.'),
    body('artisanId').optional({ nullable: true }).isUUID().withMessage('artisanId must be a valid UUID.'),
    body('appointmentDate').isISO8601().withMessage('appointmentDate must be a valid date (YYYY-MM-DD).'),
    body('appointmentTime').matches(/^\d{2}:\d{2}$/).withMessage('appointmentTime must be HH:mm format.'),
  ],
  ctrl.bookAppointment,
);

// GET  /api/v1/appointments/my      — get my appointments (customer auth)
router.get('/my', authenticateV1, ctrl.getMyAppointments);

// DELETE /api/v1/appointments/:id   — cancel my appointment (customer auth)
router.delete('/:id', authenticateV1, ctrl.cancelMyAppointment);

export default router;

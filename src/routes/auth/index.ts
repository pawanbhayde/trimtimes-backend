import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../../middleware/auth';
import * as ctrl from '../../controllers/authController';

const router = Router();

// POST /api/:tenant/auth/register
router.post(
  '/register',
  [
    body('email').isEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('fullName').notEmpty().trim(),
    body('phone').optional().isMobilePhone('any'),
  ],
  ctrl.register
);

// POST /api/:tenant/auth/login
router.post(
  '/login',
  [body('email').isEmail(), body('password').notEmpty()],
  ctrl.login
);

// POST /api/:tenant/auth/logout
router.post('/logout', authenticate, ctrl.logout);

// GET /api/:tenant/auth/me
router.get('/me', authenticate, ctrl.getMe);

export default router;

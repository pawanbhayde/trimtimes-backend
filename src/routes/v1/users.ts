import { Router } from 'express';
import { body } from 'express-validator';
import * as ctrl from '../../controllers/v1/userController';

const router = Router();

// POST /api/v1/users/register
router.post(
  '/register',
  [
    body('fullName').isLength({ min: 2 }).withMessage('Full name must be at least 2 characters.'),
    body('email').isEmail().withMessage('A valid email is required.'),
    body('phone').notEmpty().withMessage('Phone number is required.'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  ],
  ctrl.registerUser,
);

// POST /api/v1/users/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('A valid email is required.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  ctrl.loginUser,
);

export default router;

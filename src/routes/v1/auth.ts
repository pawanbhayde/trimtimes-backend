import { Router } from 'express';
import { authenticateV1 } from '../../middleware/authenticateV1';
import * as ctrl from '../../controllers/v1/authController';

const router = Router();

// POST /api/v1/auth/refresh   — reads httpOnly refresh_token cookie
router.post('/refresh', ctrl.refresh);

// POST /api/v1/auth/logout    — requires Bearer access token
router.post('/logout', authenticateV1, ctrl.logout);

// GET  /api/v1/auth/me        — requires Bearer access token
router.get('/me', authenticateV1, ctrl.me);

export default router;

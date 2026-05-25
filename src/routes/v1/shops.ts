import { Router } from 'express';
import { body } from 'express-validator';
import { authenticateV1 } from '../../middleware/authenticateV1';
import * as authCtrl from '../../controllers/v1/shopController';
import * as mgmtCtrl from '../../controllers/v1/shopManagementController';

const router = Router();

// ─── Auth (no JWT) ─────────────────────────────────────────────────────────────

// GET  /api/v1/shops
router.get('/', authCtrl.listShops);

// POST /api/v1/shops/register
router.post(
  '/register',
  [
    body('shopName').isLength({ min: 2 }).withMessage('Shop name must be at least 2 characters.'),
    body('ownerName').notEmpty().withMessage('Owner name is required.'),
    body('ownerEmail').isEmail().withMessage('A valid email is required.'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
    body('slug')
      .optional()
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Slug may only contain lowercase letters, numbers and hyphens.'),
  ],
  authCtrl.registerShop,
);

// POST /api/v1/shops/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('A valid email is required.'),
    body('password').notEmpty().withMessage('Password is required.'),
    body('tenantId').notEmpty().withMessage('tenantId (shop slug) is required.'),
  ],
  authCtrl.loginShop,
);

// ─── Public shop profile reads (no JWT) ────────────────────────────────────────

// GET /api/v1/shops/:slug/profile
router.get('/:slug/profile', mgmtCtrl.getProfile);

// GET /api/v1/shops/:slug/treatments
router.get('/:slug/treatments', mgmtCtrl.getTreatments);

// GET /api/v1/shops/:slug/hours
router.get('/:slug/hours', mgmtCtrl.getHours);

// GET /api/v1/shops/:slug/location
router.get('/:slug/location', mgmtCtrl.getLocation);

// GET /api/v1/shops/:slug/artisans
router.get('/:slug/artisans', mgmtCtrl.getArtisans);

// GET /api/v1/shops/:slug/reviews
router.get('/:slug/reviews', mgmtCtrl.getReviews);

// GET /api/v1/shops/:slug/available-slots?date=YYYY-MM-DD&treatmentId=&artisanId=
router.get('/:slug/available-slots', mgmtCtrl.getAvailableSlots);

// ─── Shop appointments (barber JWT) ────────────────────────────────────────────

// GET  /api/v1/shops/appointments
router.get('/appointments', authenticateV1, mgmtCtrl.listShopAppointments);

// PATCH /api/v1/shops/appointments/:id/status
router.patch(
  '/appointments/:id/status',
  authenticateV1,
  [body('status').isIn(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']).withMessage('Invalid status.')],
  mgmtCtrl.updateAppointmentStatus,
);

// ─── Authenticated shop management (JWT required, tenant from JWT) ─────────────

// PUT /api/v1/shops/profile
router.put(
  '/profile',
  authenticateV1,
  [
    body('name').optional().isLength({ min: 2 }).withMessage('Name must be at least 2 characters.'),
    body('email').optional().isEmail().withMessage('A valid email address is required.'),
    body('bannerUrl').optional().isURL().withMessage('Banner URL must be a valid URL.'),
  ],
  mgmtCtrl.updateProfile,
);

// POST /api/v1/shops/treatments
router.post(
  '/treatments',
  authenticateV1,
  [
    body('name').notEmpty().withMessage('Treatment name is required.'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number.'),
    body('duration').isInt({ min: 1 }).withMessage('Duration must be a positive integer (minutes).'),
    body('status').optional().isIn(['Active', 'Inactive']).withMessage('Status must be Active or Inactive.'),
  ],
  mgmtCtrl.createTreatment,
);

// PUT /api/v1/shops/treatments/:id
router.put(
  '/treatments/:id',
  authenticateV1,
  [
    body('name').optional().notEmpty().withMessage('Name cannot be empty.'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a non-negative number.'),
    body('duration').optional().isInt({ min: 1 }).withMessage('Duration must be a positive integer.'),
    body('status').optional().isIn(['Active', 'Inactive']).withMessage('Status must be Active or Inactive.'),
  ],
  mgmtCtrl.updateTreatment,
);

// DELETE /api/v1/shops/treatments/:id
router.delete('/treatments/:id', authenticateV1, mgmtCtrl.deleteTreatment);

// PUT /api/v1/shops/hours
router.put(
  '/hours',
  authenticateV1,
  [
    body('hours').isArray({ min: 7, max: 7 }).withMessage('Provide exactly 7 days.'),
    body('hours.*.day')
      .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
      .withMessage('Each day must be a full weekday name.'),
    body('hours.*.isOpen').isBoolean().withMessage('isOpen must be a boolean.'),
    body('hours.*.openTime').matches(/^\d{2}:\d{2}$/).withMessage('openTime must be HH:mm format.'),
    body('hours.*.closeTime').matches(/^\d{2}:\d{2}$/).withMessage('closeTime must be HH:mm format.'),
  ],
  mgmtCtrl.upsertHours,
);

// PUT /api/v1/shops/location
router.put(
  '/location',
  authenticateV1,
  [
    body('mapEmbedUrl')
      .optional({ nullable: true })
      .custom((v) => v === null || v === '' || String(v).startsWith('https://www.google.com/maps/embed'))
      .withMessage('mapEmbedUrl must be a Google Maps embed URL or null.'),
    body('latitude').optional({ nullable: true }).isFloat().withMessage('latitude must be a number.'),
    body('longitude').optional({ nullable: true }).isFloat().withMessage('longitude must be a number.'),
  ],
  mgmtCtrl.updateLocation,
);

// POST /api/v1/shops/artisans
router.post(
  '/artisans',
  authenticateV1,
  [
    body('name').notEmpty().withMessage('Artisan name is required.'),
    body('avatarUrl').optional().isURL().withMessage('avatarUrl must be a valid URL.'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean.'),
  ],
  mgmtCtrl.createArtisan,
);

// PUT /api/v1/shops/artisans/:id
router.put(
  '/artisans/:id',
  authenticateV1,
  [
    body('name').optional().notEmpty().withMessage('Name cannot be empty.'),
    body('avatarUrl').optional().isURL().withMessage('avatarUrl must be a valid URL.'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean.'),
  ],
  mgmtCtrl.updateArtisan,
);

// DELETE /api/v1/shops/artisans/:id
router.delete('/artisans/:id', authenticateV1, mgmtCtrl.deleteArtisan);

// PATCH /api/v1/shops/reviews/:id
router.patch(
  '/reviews/:id',
  authenticateV1,
  [body('isFeatured').isBoolean().withMessage('isFeatured must be a boolean.')],
  mgmtCtrl.patchReview,
);

export default router;

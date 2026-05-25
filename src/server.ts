import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';

import { validateEnv, env } from './config/env';
import { tenantContext } from './middleware/tenantContext';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { disconnectAll } from './config/database';

// Legacy routes
import adminRoutes from './routes/admin';
import authRoutes from './routes/auth';
import barberRoutes from './routes/barber';
import customerRoutes from './routes/customer';

// V1 routes
import v1ShopRoutes from './routes/v1/shops';
import v1UserRoutes from './routes/v1/users';
import v1AuthRoutes from './routes/v1/auth';
import v1AppointmentRoutes from './routes/v1/appointments';

validateEnv();

const app = express();

// ─── Security & Utility Middleware ────────────────────────────────────────────
app.use(helmet());

// FRONTEND_URL may be a comma-separated list, e.g.:
//   "http://localhost:3000,https://trimtimes.vercel.app"
const allowedOrigins = env.FRONTEND_URL
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
}));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(env.isDev ? 'dev' : 'combined'));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── V1 Routes (/api/v1) ──────────────────────────────────────────────────────
app.use('/api/v1/shops', v1ShopRoutes);
app.use('/api/v1/users', v1UserRoutes);
app.use('/api/v1/auth', v1AuthRoutes);
app.use('/api/v1/appointments', v1AppointmentRoutes);

// ─── Legacy Routes ────────────────────────────────────────────────────────────
app.use('/api/admin', adminRoutes);
app.use('/api/:tenant/auth', tenantContext, authRoutes);
app.use('/api/:tenant/barber', tenantContext, barberRoutes);
app.use('/api/:tenant/customer', tenantContext, customerRoutes);

// ─── 404 & Error Handlers ─────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start Server (skip in Vercel serverless — app is exported as handler) ────
if (!process.env.VERCEL) {
  const server = app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  process.on('SIGTERM', async () => {
    server.close(async () => {
      await disconnectAll();
      process.exit(0);
    });
  });
}

export default app;

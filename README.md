# TrimTimes — Backend API

REST API for the TrimTimes multi-tenant barber appointment system. Built with Node.js, Express, Prisma ORM, and PostgreSQL.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework | Express.js |
| ORM | Prisma v5 |
| Database | PostgreSQL (NeonDB) |
| Auth | JWT (access + refresh tokens) |
| Password hashing | bcryptjs |
| Validation | express-validator |

---

## Architecture

All data lives in a **single PostgreSQL database** (public schema). Tenants are identified by a `tenant_id` foreign key on every shared table. Tenant identity is resolved per-request via subdomain, URL parameter, or `x-tenant-id` header.

```
public schema
├── super_admins       — platform admin accounts
├── tenants            — registered barber shops
├── customers          — end-users who book appointments
├── refresh_tokens     — token rotation store
├── treatments         — services offered per shop
├── artisans           — staff members per shop
├── shop_hours         — weekly open/close schedule per shop
├── shop_locations     — address + map embed per shop
├── reviews            — customer reviews per shop
└── appointments       — bookings (linked to tenant, customer, treatment, artisan)
```

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env — fill in DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
```

### 3. Generate Prisma client
```bash
npm run prisma:generate
```

### 4. Run database migrations
```bash
npm run prisma:migrate
```

### 5. Seed demo data (optional)
```bash
npm run seed
# Creates: 1 super admin, demo shops, artisans, treatments, appointments
```

### 6. Start development server
```bash
npm run dev
# Runs on http://localhost:4000
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime (e.g. `1h`) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime (e.g. `7d`) |
| `PORT` | HTTP port (default `4000`) |
| `NODE_ENV` | `development` or `production` |
| `FRONTEND_URL` | Allowed CORS origin |

---

## npm Scripts

```bash
npm run dev              # Start with hot-reload (tsx + nodemon)
npm run build            # Compile TypeScript to dist/
npm run start            # Run compiled output
npm run prisma:generate  # Regenerate Prisma client
npm run prisma:migrate   # Apply database migrations
npm run prisma:studio    # Open Prisma Studio GUI
npm run seed             # Seed demo data
```

---

## API Reference

Base URL: `http://localhost:4000`

### Health Check

```
GET /health
```
Returns `{ status: "ok", timestamp: "..." }`.

---

### Super Admin — `/api/admin`

No tenant context required. All routes except login require a `SUPER_ADMIN` Bearer token.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/admin/login` | — | Login, returns JWT |
| GET | `/api/admin/tenants` | Bearer | List all shops |
| POST | `/api/admin/tenants` | Bearer | Create a new shop |
| PATCH | `/api/admin/tenants/:id` | Bearer | Update shop status (`ACTIVE` / `INACTIVE` / `SUSPENDED` / `PENDING`) |
| DELETE | `/api/admin/tenants/:id` | Bearer | Delete a shop |
| GET | `/api/admin/stats` | Bearer | Platform-level stats (total shops, bookings, revenue) |

**Login body:**
```json
{ "email": "admin@example.com", "password": "pass1234" }
```

**Create tenant body:**
```json
{ "shopName": "Downtown Cuts", "subdomain": "downtown-cuts", "ownerEmail": "owner@example.com" }
```

---

### Shop Auth — `/api/v1/shops`

Public routes for shop registration and login.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/shops` | — | List all active shops |
| POST | `/api/v1/shops/register` | — | Register a new shop account |
| POST | `/api/v1/shops/login` | — | Shop login, returns access + refresh tokens |

**Login body:**
```json
{ "email": "owner@shop.com", "password": "secret", "tenantId": "shop-slug" }
```

---

### Shop Public Reads — `/api/v1/shops/:slug`

No auth required. Used by the public shop page and booking wizard.

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/shops/:slug/profile` | Shop name, description, rating, contact |
| GET | `/api/v1/shops/:slug/treatments` | All treatments (services) |
| GET | `/api/v1/shops/:slug/hours` | Weekly open/close schedule |
| GET | `/api/v1/shops/:slug/location` | Address and map embed URL |
| GET | `/api/v1/shops/:slug/artisans` | Staff members |
| GET | `/api/v1/shops/:slug/reviews` | Customer reviews |
| GET | `/api/v1/shops/:slug/available-slots` | Available time slots for a date (see below) |

**Available slots query params:**

| Param | Required | Description |
|---|---|---|
| `date` | Yes | `YYYY-MM-DD` |
| `treatmentId` | Yes | UUID of the treatment (used for duration) |
| `artisanId` | No | UUID — scopes slot check to one artisan; omit for shop-wide |

Slot generation logic:
1. Checks the shop's open hours for that day — returns `{ shopClosed: true }` if closed.
2. Generates 30-minute candidate slots within open hours that can fit the treatment duration.
3. Removes any slot whose time range overlaps an existing `PENDING` or `CONFIRMED` appointment (artisan-scoped if `artisanId` is given, otherwise shop-wide).
4. Returns remaining open slots as `["09:00", "09:30", ...]`.

---

### Shop Management — `/api/v1/shops` (JWT required)

All routes require a valid shop Bearer token. The tenant is resolved from the JWT payload.

**Appointments**

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/shops/appointments` | List shop appointments (filter: `?status=&date=YYYY-MM-DD`) |
| PATCH | `/api/v1/shops/appointments/:id/status` | Update appointment status (`PENDING` / `CONFIRMED` / `COMPLETED` / `CANCELLED`) |

**Profile**

| Method | Path | Description |
|---|---|---|
| PUT | `/api/v1/shops/profile` | Update shop name, description, phone, email, banner |

**Treatments**

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/shops/treatments` | Create a treatment |
| PUT | `/api/v1/shops/treatments/:id` | Update a treatment |
| DELETE | `/api/v1/shops/treatments/:id` | Delete a treatment |

**Hours**

| Method | Path | Description |
|---|---|---|
| PUT | `/api/v1/shops/hours` | Save the full weekly schedule (7 days, `isOpen`, `openTime`, `closeTime`) |

**Location**

| Method | Path | Description |
|---|---|---|
| PUT | `/api/v1/shops/location` | Save address fields and Google Maps embed URL |

**Artisans**

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/shops/artisans` | Add a staff member |
| PUT | `/api/v1/shops/artisans/:id` | Update a staff member |
| DELETE | `/api/v1/shops/artisans/:id` | Remove a staff member |

**Reviews**

| Method | Path | Description |
|---|---|---|
| PATCH | `/api/v1/shops/reviews/:id` | Toggle `isFeatured` on a review |

---

### Customer Auth — `/api/v1/users`

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/users/register` | Register a new customer account |
| POST | `/api/v1/users/login` | Login, returns access + refresh tokens |

---

### Token Management — `/api/v1/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/refresh` | httpOnly cookie | Issue a new access token |
| POST | `/api/v1/auth/logout` | Bearer | Revoke refresh token |
| GET | `/api/v1/auth/me` | Bearer | Get current user profile |

---

### Customer Appointments — `/api/v1/appointments`

All routes require a customer Bearer token.

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/appointments` | Book an appointment |
| GET | `/api/v1/appointments/my` | Get all my appointments |
| DELETE | `/api/v1/appointments/:id` | Cancel an appointment |

**Book body:**
```json
{
  "tenantSlug": "downtown-cuts",
  "treatmentId": "<uuid>",
  "artisanId": "<uuid>",
  "appointmentDate": "2026-06-01",
  "appointmentTime": "10:00",
  "notes": "Skin fade please"
}
```

Booking enforces artisan-aware conflict detection: if `artisanId` is provided the system checks only that artisan's calendar; otherwise it checks shop-wide. A `409 SLOT_TAKEN` is returned if the time range overlaps any existing `PENDING` or `CONFIRMED` appointment.

---

## Authentication Flow

```
1. POST /login  →  { accessToken, refreshToken (httpOnly cookie) }
2. Attach to requests:  Authorization: Bearer <accessToken>
3. On 401 TOKEN_EXPIRED  →  POST /api/v1/auth/refresh  →  new accessToken
4. POST /api/v1/auth/logout  →  refresh token revoked
```

JWT payload shape:
```json
{ "sub": "<entity-id>", "email": "...", "role": "shop | customer | SUPER_ADMIN" }
```

---

## Assumptions

- Multi-tenancy is implemented via **shared tables + `tenant_id` row isolation** (not PostgreSQL schema-per-tenant). Each shop's data is logically isolated through foreign key scoping — no cross-tenant query is possible through the API layer.
- Shop registration creates a record in `PENDING` status. A super admin must set it to `ACTIVE` before the shop can accept bookings.
- Appointment time slots are generated in **30-minute increments** within a shop's open hours. The treatment duration determines how many slots are consumed per booking.
- Customers are global (not per-shop) — one account can book at any active shop.
- Refresh tokens are stored as bcrypt hashes in the `refresh_tokens` table for security.

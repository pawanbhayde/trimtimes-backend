# Barber Appointment System — Backend

Multi-tenant REST API for barber shop appointment management. Each shop (tenant) gets a fully isolated PostgreSQL schema — complete data separation at the database level with no row-level filters required.

## Architecture

```
public schema (shared)
  └── tenants         — registry of all barber shops
  └── super_admins    — platform admin accounts

tenant_<shop>_<id> schema (per shop)
  └── users           — barbers + customers for that shop
  └── services        — menu of services
  └── appointments    — bookings
```

Every tenant-scoped request resolves the shop's schema name, then uses a cached `PrismaClient` instance pointing to `?schema=<schema_name>`. PostgreSQL's `search_path` ensures all queries stay inside that schema.

## Tech Stack

- **Node.js / Express / TypeScript**
- **Prisma ORM** — `prisma/schema.prisma` (global), `prisma/tenant.prisma` (per-tenant types)
- **PostgreSQL** — schema-based multi-tenancy
- **JWT** — stateless authentication
- **bcryptjs** — password hashing

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env — set DATABASE_URL, JWT_SECRET
```

### 3. Generate Prisma clients
```bash
npm run prisma:generate
# This runs `prisma generate` twice:
#   once for the global schema  → node_modules/@prisma/client
#   once for tenant models      → src/generated/prisma-tenant
```

### 4. Run database migrations (global schema only)
```bash
npm run prisma:migrate
# Creates the `tenants` and `super_admins` tables in the public schema
```

### 5. Seed demo data
```bash
npm run seed
# Creates: 1 super admin, 3 demo shops with barbers, customers, services, appointments
```

### 6. Start development server
```bash
npm run dev
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | — |
| `JWT_SECRET` | Secret for signing JWTs | — |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `PORT` | HTTP port | `5000` |
| `NODE_ENV` | Environment | `development` |
| `FRONTEND_URL` | CORS allowed origin | `http://localhost:3000` |

## API Reference

### Tenant Identification

For tenant-scoped routes supply the shop's subdomain via either:
- **URL param**: `/api/downtown-cuts/auth/login`
- **Header**: `x-tenant-id: downtown-cuts`

---

### Admin Routes — `POST /api/admin/login`

No tenant context needed.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/admin/login` | — | Super admin login |
| POST | `/api/admin/tenants` | SUPER_ADMIN | Create new tenant + provision schema |
| GET | `/api/admin/tenants` | SUPER_ADMIN | List all tenants |
| PATCH | `/api/admin/tenants/:id` | SUPER_ADMIN | Update tenant status |
| DELETE | `/api/admin/tenants/:id` | SUPER_ADMIN | Delete tenant + drop schema |
| GET | `/api/admin/stats` | SUPER_ADMIN | Platform dashboard stats |

---

### Auth Routes — `/api/:tenant/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/:tenant/auth/register` | — | Customer self-registration |
| POST | `/api/:tenant/auth/login` | — | Barber / customer login |
| POST | `/api/:tenant/auth/logout` | Bearer | Logout (client drops token) |
| GET | `/api/:tenant/auth/me` | Bearer | Get current user profile |

---

### Barber Routes — `/api/:tenant/barber` (role: BARBER)

| Method | Path | Description |
|---|---|---|
| GET | `/api/:tenant/barber/services` | List all services |
| POST | `/api/:tenant/barber/services` | Create service |
| PATCH | `/api/:tenant/barber/services/:id` | Update service |
| DELETE | `/api/:tenant/barber/services/:id` | Delete service |
| GET | `/api/:tenant/barber/appointments` | List appointments (filter by `?status=` `&date=YYYY-MM-DD`) |
| PATCH | `/api/:tenant/barber/appointments/:id` | Update appointment status |
| GET | `/api/:tenant/barber/dashboard/stats` | Shop stats |

---

### Customer Routes — `/api/:tenant/customer` (role: CUSTOMER)

| Method | Path | Description |
|---|---|---|
| GET | `/api/:tenant/customer/services` | Browse available services |
| POST | `/api/:tenant/customer/appointments` | Book appointment |
| GET | `/api/:tenant/customer/appointments` | My appointments |
| PATCH | `/api/:tenant/customer/appointments/:id` | Cancel appointment |
| GET | `/api/:tenant/customer/profile` | Get profile |
| PATCH | `/api/:tenant/customer/profile` | Update profile |

---

## Authentication Flow

1. Call login endpoint → receive `{ token, user }`
2. Store the JWT client-side
3. Send on all protected requests:
   ```
   Authorization: Bearer <token>
   x-tenant-id: <subdomain>   (or use URL param)
   ```
4. JWT payload contains: `{ id, email, role, tenantId, schemaName }`

## Tenant Creation Flow (Super Admin)

1. `POST /api/admin/tenants` with `{ shopName, subdomain, ownerEmail }`
2. API validates subdomain uniqueness
3. Generates a unique `schemaName` (e.g. `tenant_downtown_cuts_a1b2c3`)
4. Inserts tenant record in `public.tenants`
5. Runs DDL to create the PostgreSQL schema + tables + enum types
6. Returns the new tenant object

Use the returned `subdomain` for all subsequent shop requests.

## Demo Credentials (after seeding)

| Role | Email | Password | Tenant |
|---|---|---|---|
| Super Admin | admin@barbersystem.com | admin123 | — |
| Barber | barber@downtown-cuts.com | password123 | downtown-cuts |
| Barber | barber@elite-grooming.com | password123 | elite-grooming |
| Barber | barber@classic-blades.com | password123 | classic-blades |
| Customer | customer1@...test | password123 | any shop |

## Scripts

```bash
npm run dev            # Start with hot-reload (tsx + nodemon)
npm run build          # Compile to dist/
npm run start          # Run compiled output
npm run prisma:generate  # Generate both Prisma clients
npm run prisma:migrate   # Run global schema migrations
npm run prisma:studio    # Open Prisma Studio (global schema)
npm run seed           # Seed demo data
```

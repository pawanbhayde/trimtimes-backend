import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

function slugify(text: string): string {
  return text.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function main() {
  console.log('Seeding database…');

  // ── Super Admin ──────────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('admin123', 12);
  await db.superAdmin.upsert({
    where: { email: 'admin@barbersystem.com' },
    update: {},
    create: { email: 'admin@barbersystem.com', password: adminPassword },
  });
  console.log('  ✓ Super admin: admin@barbersystem.com / admin123');

  // ── Demo Customers (global) ──────────────────────────────────────────────────
  const customerData = [
    { userId: 'alice', fullName: 'Alice Johnson', email: 'alice@demo.test', phone: '555-0101' },
    { userId: 'bob', fullName: 'Bob Williams', email: 'bob@demo.test', phone: '555-0102' },
    { userId: 'carol', fullName: 'Carol Davis', email: 'carol@demo.test', phone: '555-0103' },
  ];

  const hashedPw = await bcrypt.hash('password123', 12);
  const customers = await Promise.all(
    customerData.map((c) =>
      db.customer.upsert({
        where: { email: c.email },
        update: {},
        create: { ...c, password: hashedPw },
      })
    )
  );
  console.log('  ✓ Demo customers: alice/bob/carol@demo.test / password123');

  // ── Demo Tenants ─────────────────────────────────────────────────────────────
  const tenants = [
    { shopName: 'Downtown Cuts', subdomain: 'downtown-cuts', ownerEmail: 'owner@downtown-cuts.com', ownerName: 'James Craig' },
    { shopName: 'Elite Grooming', subdomain: 'elite-grooming', ownerEmail: 'owner@elite-grooming.com', ownerName: 'Marcus Lee' },
    { shopName: 'Classic Blades', subdomain: 'classic-blades', ownerEmail: 'owner@classic-blades.com', ownerName: 'David Park' },
  ];

  for (const t of tenants) {
    const slug = slugify(t.subdomain);
    const schemaName = 'tenant_' + slug.replace(/-/g, '_');
    const password = await bcrypt.hash('password123', 12);

    const existing = await db.tenant.findUnique({ where: { subdomain: t.subdomain } });
    if (existing) {
      console.log(`  ↻ Tenant "${t.shopName}" already exists — skipping`);
      continue;
    }

    const tenant = await db.tenant.create({
      data: {
        shopName: t.shopName,
        subdomain: t.subdomain,
        schemaName,
        ownerEmail: t.ownerEmail,
        ownerName: t.ownerName,
        password,
        status: 'ACTIVE',
        rating: 4.8,
      },
    });

    // Treatments
    const treatments = await Promise.all([
      db.treatment.create({ data: { tenantId: tenant.id, name: 'Classic Haircut', description: 'Traditional scissor cut', duration: 30, price: 25, status: 'Active' } }),
      db.treatment.create({ data: { tenantId: tenant.id, name: 'Fade & Taper', description: 'Modern fade with clipper', duration: 45, price: 35, status: 'Active' } }),
      db.treatment.create({ data: { tenantId: tenant.id, name: 'Beard Trim', description: 'Shape and trim beard', duration: 20, price: 15, status: 'Active' } }),
      db.treatment.create({ data: { tenantId: tenant.id, name: 'Hot Towel Shave', description: 'Classic straight-razor shave', duration: 40, price: 30, status: 'Active' } }),
    ]);

    // Artisans
    const artisan = await db.artisan.create({
      data: { tenantId: tenant.id, name: t.ownerName, specialty: 'Fade & Classic Cuts', isActive: true },
    });

    // Appointments
    const now = new Date();
    const day = (offset: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);

    const apptData = [
      { customer: customers[0], treatment: treatments[0], date: day(-3), time: '09:00', status: 'COMPLETED' as const },
      { customer: customers[1], treatment: treatments[1], date: day(-1), time: '10:30', status: 'COMPLETED' as const },
      { customer: customers[2], treatment: treatments[2], date: day(0),  time: '11:00', status: 'CONFIRMED' as const },
      { customer: customers[0], treatment: treatments[3], date: day(0),  time: '13:00', status: 'PENDING' as const },
      { customer: customers[1], treatment: treatments[0], date: day(1),  time: '09:30', status: 'PENDING' as const },
    ];

    for (const a of apptData) {
      await db.appointment.create({
        data: {
          tenantId: tenant.id,
          customerId: a.customer.id,
          treatmentId: a.treatment.id,
          artisanId: artisan.id,
          appointmentDate: a.date,
          appointmentTime: a.time,
          status: a.status,
        },
      });
    }

    console.log(`  ✓ Seeded tenant "${t.shopName}"`);
  }

  console.log('\nSeed complete!');
  console.log('  Super admin : admin@barbersystem.com / admin123');
  console.log('  Shop login  : owner@<subdomain>.com / password123');
  console.log('  Customers   : alice/bob/carol@demo.test / password123');
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => db.$disconnect());

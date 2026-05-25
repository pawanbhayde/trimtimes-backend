import { getPublicClient } from '../../config/database';

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function notFound(msg = 'Resource not found.'): Error & { statusCode: number; code: string } {
  const e = new Error(msg) as Error & { statusCode: number; code: string };
  e.statusCode = 404;
  e.code = 'NOT_FOUND';
  return e;
}

function forbidden(msg = 'You do not have permission to modify this resource.'): Error & { statusCode: number; code: string } {
  const e = new Error(msg) as Error & { statusCode: number; code: string };
  e.statusCode = 403;
  e.code = 'FORBIDDEN';
  return e;
}

async function findTenantBySlug(slug: string) {
  const tenant = await getPublicClient().tenant.findFirst({ where: { subdomain: slug } });
  if (!tenant) throw notFound('No shop found with that slug.');
  return tenant;
}

// ─── Public Reads ─────────────────────────────────────────────────────────────

export async function getShopProfile(slug: string) {
  const db = getPublicClient();
  const tenant = await findTenantBySlug(slug);

  const agg = await db.review.aggregate({
    where: { tenantId: tenant.id },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return {
    id: tenant.subdomain,
    name: tenant.shopName,
    slug: tenant.subdomain,
    description: tenant.description ?? '',
    phone: tenant.phone ?? '',
    email: tenant.email ?? '',
    ownerName: tenant.ownerName ?? '',
    bannerUrl: tenant.bannerUrl ?? '',
    rating: agg._avg.rating !== null ? Math.round(agg._avg.rating * 10) / 10 : tenant.rating,
    reviewCount: agg._count.rating,
  };
}

export async function getShopTreatments(slug: string) {
  const tenant = await findTenantBySlug(slug);
  const rows = await getPublicClient().treatment.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description ?? '',
    price: t.price,
    duration: t.duration,
    status: t.status,
  }));
}

export async function getShopHours(slug: string) {
  const tenant = await findTenantBySlug(slug);
  const rows = await getPublicClient().shopHours.findMany({
    where: { tenantId: tenant.id },
  });

  // Sort into canonical weekday order and fill gaps
  const map = Object.fromEntries(rows.map((r) => [r.day, r]));
  return DAYS_ORDER.map((day) =>
    map[day]
      ? { day, isOpen: map[day].isOpen, openTime: map[day].openTime, closeTime: map[day].closeTime }
      : { day, isOpen: false, openTime: '09:00', closeTime: '17:00' },
  );
}

export async function getShopLocation(slug: string) {
  const tenant = await findTenantBySlug(slug);
  const loc = await getPublicClient().shopLocation.findUnique({ where: { tenantId: tenant.id } });
  return {
    street: loc?.street ?? '',
    city: loc?.city ?? '',
    state: loc?.state ?? '',
    zip: loc?.zip ?? '',
    country: loc?.country ?? '',
    latitude: loc?.latitude ?? null,
    longitude: loc?.longitude ?? null,
    mapEmbedUrl: loc?.mapEmbedUrl ?? null,
  };
}

export async function getShopArtisans(slug: string) {
  const tenant = await findTenantBySlug(slug);
  const rows = await getPublicClient().artisan.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map((a) => ({
    id: a.id,
    name: a.name,
    specialty: a.specialty ?? '',
    bio: a.bio ?? '',
    avatarUrl: a.avatarUrl ?? '',
    isActive: a.isActive,
  }));
}

export async function getShopReviews(slug: string) {
  const tenant = await findTenantBySlug(slug);
  const rows = await getPublicClient().review.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    id: r.id,
    customerName: r.customerName,
    rating: r.rating,
    comment: r.comment ?? '',
    createdAt: r.createdAt.toISOString(),
    isFeatured: r.isFeatured,
  }));
}

// ─── Shop Appointments (barber view) ─────────────────────────────────────────

export async function listShopAppointments(
  tenantId: string,
  filters: { status?: string; date?: string },
) {
  const db = getPublicClient();
  const rows = await db.appointment.findMany({
    where: {
      tenantId,
      ...(filters.status && filters.status !== 'All' && { status: filters.status as any }),
      ...(filters.date && {
        appointmentDate: {
          gte: new Date(filters.date),
          lt: new Date(new Date(filters.date).setDate(new Date(filters.date).getDate() + 1)),
        },
      }),
    },
    include: {
      customer: { select: { fullName: true, email: true, phone: true } },
      treatment: { select: { name: true, price: true, duration: true } },
      artisan: { select: { name: true } },
    },
    orderBy: [{ appointmentDate: 'asc' }, { appointmentTime: 'asc' }],
  });

  return rows.map((a) => ({
    id: a.id,
    customerName: a.customer.fullName,
    customerEmail: a.customer.email,
    customerPhone: a.customer.phone,
    treatmentName: a.treatment.name,
    treatmentPrice: a.treatment.price,
    artisanName: a.artisan?.name ?? null,
    appointmentDate: a.appointmentDate.toISOString().split('T')[0],
    appointmentTime: a.appointmentTime,
    status: a.status,
    notes: a.notes,
    createdAt: a.createdAt.toISOString(),
  }));
}

export async function updateShopAppointmentStatus(
  tenantId: string,
  appointmentId: string,
  status: string,
) {
  const db = getPublicClient();
  const existing = await db.appointment.findFirst({ where: { id: appointmentId, tenantId } });
  if (!existing) throw notFound('Appointment not found.');
  const updated = await db.appointment.update({
    where: { id: appointmentId },
    data: { status: status as any },
    include: {
      customer: { select: { fullName: true, email: true, phone: true } },
      treatment: { select: { name: true, price: true, duration: true } },
      artisan: { select: { name: true } },
    },
  });
  return {
    id: updated.id,
    customerName: updated.customer.fullName,
    customerEmail: updated.customer.email,
    customerPhone: updated.customer.phone,
    treatmentName: updated.treatment.name,
    treatmentPrice: updated.treatment.price,
    artisanName: updated.artisan?.name ?? null,
    appointmentDate: updated.appointmentDate.toISOString().split('T')[0],
    appointmentTime: updated.appointmentTime,
    status: updated.status,
    notes: updated.notes,
  };
}

// ─── Authenticated Mutations ───────────────────────────────────────────────────

export async function updateProfile(tenantId: string, data: {
  name?: string;
  description?: string;
  phone?: string;
  email?: string;
  ownerName?: string;
  bannerUrl?: string;
}) {
  const db = getPublicClient();
  const tenant = await db.tenant.update({
    where: { id: tenantId },
    data: {
      ...(data.name !== undefined && { shopName: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.ownerName !== undefined && { ownerName: data.ownerName }),
      ...(data.bannerUrl !== undefined && { bannerUrl: data.bannerUrl }),
    },
  });

  const agg = await db.review.aggregate({
    where: { tenantId: tenant.id },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return {
    id: tenant.subdomain,
    name: tenant.shopName,
    slug: tenant.subdomain,
    description: tenant.description ?? '',
    phone: tenant.phone ?? '',
    email: tenant.email ?? '',
    ownerName: tenant.ownerName ?? '',
    bannerUrl: tenant.bannerUrl ?? '',
    rating: agg._avg.rating !== null ? Math.round(agg._avg.rating * 10) / 10 : tenant.rating,
    reviewCount: agg._count.rating,
  };
}

export async function createTreatment(tenantId: string, data: {
  name: string;
  description?: string;
  price: number;
  duration: number;
  status?: string;
}) {
  const t = await getPublicClient().treatment.create({
    data: {
      tenantId,
      name: data.name,
      description: data.description,
      price: data.price,
      duration: data.duration,
      status: data.status ?? 'Active',
    },
  });
  return { id: t.id, name: t.name, description: t.description ?? '', price: t.price, duration: t.duration, status: t.status };
}

export async function updateTreatment(tenantId: string, treatmentId: string, data: {
  name?: string;
  description?: string;
  price?: number;
  duration?: number;
  status?: string;
}) {
  const db = getPublicClient();
  const existing = await db.treatment.findFirst({ where: { id: treatmentId, tenantId } });
  if (!existing) throw notFound('Treatment not found.');

  const t = await db.treatment.update({
    where: { id: treatmentId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.price !== undefined && { price: data.price }),
      ...(data.duration !== undefined && { duration: data.duration }),
      ...(data.status !== undefined && { status: data.status }),
    },
  });
  return { id: t.id, name: t.name, description: t.description ?? '', price: t.price, duration: t.duration, status: t.status };
}

export async function deleteTreatment(tenantId: string, treatmentId: string) {
  const db = getPublicClient();
  const existing = await db.treatment.findFirst({ where: { id: treatmentId, tenantId } });
  if (!existing) throw notFound('Treatment not found.');
  await db.treatment.delete({ where: { id: treatmentId } });
}

export async function upsertHours(tenantId: string, hours: Array<{
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}>) {
  const db = getPublicClient();
  await db.$transaction(
    hours.map((h) =>
      db.shopHours.upsert({
        where: { tenantId_day: { tenantId, day: h.day } },
        update: { isOpen: h.isOpen, openTime: h.openTime, closeTime: h.closeTime },
        create: { tenantId, day: h.day, isOpen: h.isOpen, openTime: h.openTime, closeTime: h.closeTime },
      }),
    ),
  );

  const rows = await db.shopHours.findMany({ where: { tenantId } });
  const map = Object.fromEntries(rows.map((r) => [r.day, r]));
  return DAYS_ORDER.map((day) => ({
    day,
    isOpen: map[day]?.isOpen ?? false,
    openTime: map[day]?.openTime ?? '09:00',
    closeTime: map[day]?.closeTime ?? '17:00',
  }));
}

export async function updateLocation(tenantId: string, data: {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  mapEmbedUrl?: string | null;
}) {
  const loc = await getPublicClient().shopLocation.upsert({
    where: { tenantId },
    update: data,
    create: { tenantId, ...data },
  });
  return {
    street: loc.street ?? '',
    city: loc.city ?? '',
    state: loc.state ?? '',
    zip: loc.zip ?? '',
    country: loc.country ?? '',
    latitude: loc.latitude ?? null,
    longitude: loc.longitude ?? null,
    mapEmbedUrl: loc.mapEmbedUrl ?? null,
  };
}

export async function createArtisan(tenantId: string, data: {
  name: string;
  specialty?: string;
  bio?: string;
  avatarUrl?: string;
  isActive?: boolean;
}) {
  const a = await getPublicClient().artisan.create({
    data: {
      tenantId,
      name: data.name,
      specialty: data.specialty,
      bio: data.bio,
      avatarUrl: data.avatarUrl,
      isActive: data.isActive ?? true,
    },
  });
  return { id: a.id, name: a.name, specialty: a.specialty ?? '', bio: a.bio ?? '', avatarUrl: a.avatarUrl ?? '', isActive: a.isActive };
}

export async function updateArtisan(tenantId: string, artisanId: string, data: {
  name?: string;
  specialty?: string;
  bio?: string;
  avatarUrl?: string;
  isActive?: boolean;
}) {
  const db = getPublicClient();
  const existing = await db.artisan.findFirst({ where: { id: artisanId, tenantId } });
  if (!existing) throw notFound('Artisan not found.');

  const a = await db.artisan.update({
    where: { id: artisanId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.specialty !== undefined && { specialty: data.specialty }),
      ...(data.bio !== undefined && { bio: data.bio }),
      ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
  return { id: a.id, name: a.name, specialty: a.specialty ?? '', bio: a.bio ?? '', avatarUrl: a.avatarUrl ?? '', isActive: a.isActive };
}

export async function deleteArtisan(tenantId: string, artisanId: string) {
  const db = getPublicClient();
  const existing = await db.artisan.findFirst({ where: { id: artisanId, tenantId } });
  if (!existing) throw notFound('Artisan not found.');
  await db.artisan.delete({ where: { id: artisanId } });
}

export async function toggleReviewFeatured(tenantId: string, reviewId: string, isFeatured: boolean) {
  const db = getPublicClient();
  const existing = await db.review.findFirst({ where: { id: reviewId, tenantId } });
  if (!existing) throw notFound('Review not found.');

  const r = await db.review.update({
    where: { id: reviewId },
    data: { isFeatured },
  });
  return {
    id: r.id,
    customerName: r.customerName,
    rating: r.rating,
    comment: r.comment ?? '',
    createdAt: r.createdAt.toISOString(),
    isFeatured: r.isFeatured,
  };
}

// ─── Available Slots ──────────────────────────────────────────────────────────

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function toTimeString(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/**
 * Returns available 30-min time slots for a given date, treatment, and optional artisan.
 *
 * Logic:
 *  1. Determine the day of week and look up shop hours — return shopClosed if not open.
 *  2. Generate all 30-min candidate slots within open hours that fit the treatment duration.
 *  3. Fetch existing PENDING/CONFIRMED appointments for that date.
 *     - Filtered by artisanId if provided, otherwise shop-wide.
 *  4. Remove any candidate slot whose time range overlaps with a booked appointment range.
 */
export async function getAvailableSlots(
  slug: string,
  date: string,          // YYYY-MM-DD
  treatmentId: string,
  artisanId: string | null,
): Promise<{ slots: string[]; shopClosed: boolean }> {
  const db = getPublicClient();
  const tenant = await findTenantBySlug(slug);

  // 1. Get treatment duration
  const treatment = await db.treatment.findFirst({
    where: { id: treatmentId, tenantId: tenant.id },
    select: { duration: true },
  });
  if (!treatment) throw notFound('Treatment not found.');
  const newDuration = treatment.duration;

  // 2. Determine the day name from the date string (avoids TZ shift issues)
  const [year, month, day] = date.split('-').map(Number);
  const dayName = DAY_NAMES[new Date(year, month - 1, day).getDay()];

  // 3. Check shop hours for that day
  const shopDay = await db.shopHours.findUnique({
    where: { tenantId_day: { tenantId: tenant.id, day: dayName } },
  });
  if (!shopDay || !shopDay.isOpen) {
    return { slots: [], shopClosed: true };
  }

  // 4. Generate all 30-min slots within open hours that can fit the treatment
  const openMins  = toMinutes(shopDay.openTime);
  const closeMins = toMinutes(shopDay.closeTime);

  const candidates: number[] = [];
  for (let m = openMins; m + newDuration <= closeMins; m += 30) {
    candidates.push(m);
  }
  if (candidates.length === 0) return { slots: [], shopClosed: false };

  // 5. Fetch existing booked appointments for that date (artisan-scoped or shop-wide)
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
  const endOfDay   = new Date(year, month - 1, day, 23, 59, 59, 999);

  const booked = await db.appointment.findMany({
    where: {
      tenantId: tenant.id,
      appointmentDate: { gte: startOfDay, lte: endOfDay },
      status: { in: ['PENDING', 'CONFIRMED'] },
      ...(artisanId ? { artisanId } : {}),
    },
    include: { treatment: { select: { duration: true } } },
  });

  // 6. Build booked time ranges [startMin, endMin)
  const bookedRanges = booked.map((a) => ({
    start: toMinutes(a.appointmentTime),
    end:   toMinutes(a.appointmentTime) + a.treatment.duration,
  }));

  // 7. Keep only slots whose range [slotStart, slotStart+newDuration) doesn't overlap any booked range
  const available = candidates.filter((slotStart) => {
    const slotEnd = slotStart + newDuration;
    return !bookedRanges.some((r) => slotStart < r.end && slotEnd > r.start);
  });

  return { slots: available.map(toTimeString), shopClosed: false };
}

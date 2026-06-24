import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { eq } from 'drizzle-orm'
import { db } from './lib/db.ts'
import * as schema from './db/schema.ts'

const ADMIN_EMAIL = Deno.env.get('SEED_EMAIL') || 'admin@example.com'
const ADMIN_PASSWORD = Deno.env.get('SEED_PASSWORD') || 'admin123'
const ADMIN_NAME = Deno.env.get('SEED_NAME') || 'Admin'

const BUSINESS_EMAIL = 'business@example.com'
const BUSINESS_PASSWORD = 'business123'
const BUSINESS_NAME = 'Loja Central'

const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  baseURL: Deno.env.get('BETTER_AUTH_URL') || 'http://localhost:8000',
  emailAndPassword: { enabled: true },
})

async function signUpOrGetUser(
  email: string,
  password: string,
  name: string,
): Promise<string> {
  const res = await auth.handler(
    new Request('http://localhost:8000/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    }),
  )

  const body = await res.json()
  if (body.user?.id) return body.user.id

  // User may already exist — check if they have a credential account
  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1)

  if (existing.length === 0) {
    console.error(`Could not find or create user ${email}. Aborting.`)
    Deno.exit(1)
  }

  const userId = existing[0].id

  // Verify credential account exists (cascade delete + re-sign-up if missing)
  const accounts = await db
    .select({ id: schema.account.id })
    .from(schema.account)
    .where(eq(schema.account.userId, userId))
    .limit(1)

  if (accounts.length === 0) {
    console.log(`   No credential account for ${email} \u2014 re-creating...`)
    await db.delete(schema.businesses).where(
      eq(schema.businesses.userId, userId),
    )
    await db.delete(schema.users).where(eq(schema.users.id, userId))
    const retryRes = await auth.handler(
      new Request('http://localhost:8000/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      }),
    )
    const retryBody = await retryRes.json()
    if (!retryBody.user?.id) {
      console.error(`Re-create failed: ${JSON.stringify(retryBody)}`)
      Deno.exit(1)
    }
    return retryBody.user.id
  }

  return userId
}

async function upsertBusiness(
  values: typeof schema.businesses.$inferInsert,
): Promise<void> {
  await db.insert(schema.businesses).values(values).onConflictDoNothing()
}

async function upsertCoupon(
  values: typeof schema.coupons.$inferInsert,
): Promise<string> {
  await db.insert(schema.coupons).values(values).onConflictDoNothing()
  return values.id
}

async function upsertCouponAnalytics(
  values: typeof schema.couponAnalytics.$inferInsert,
): Promise<void> {
  await db.insert(schema.couponAnalytics).values(values).onConflictDoNothing()
}

async function main() {
  console.log('Seeding database...')

  // ── Admin user ──
  const adminId = await signUpOrGetUser(ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME)
  await db
    .update(schema.users)
    .set({ role: 'admin', status: 'approved' })
    .where(eq(schema.users.id, adminId))
  console.log(
    `Admin ready \u2014 id: ${adminId}  email: ${ADMIN_EMAIL}  password: ${ADMIN_PASSWORD}`,
  )

  // ── Business owner user ──
  const businessUserId = await signUpOrGetUser(
    BUSINESS_EMAIL,
    BUSINESS_PASSWORD,
    BUSINESS_NAME,
  )
  await db
    .update(schema.users)
    .set({ role: 'business', status: 'approved' })
    .where(eq(schema.users.id, businessUserId))
  console.log(`Business user ready: ${BUSINESS_EMAIL}`)

  // ── Sample businesses ──
  const bizId = 'seed-biz-central-cafe'
  await upsertBusiness({
    id: bizId,
    userId: businessUserId,
    name: 'Caf\u00e9 Central',
    companyName: 'Caf\u00e9 Central Ltda',
    cnpj: '11222333000181',
    category: 'alimentacao',
    description: 'Um caf\u00e9 aconchegante no centro da cidade.',
    logoUrl: '/uploads/default-logo.png',
    socialLinks: { instagram: '@cafecentral' },
    openingHours: { weekdays: '08:00-18:00', weekends: '09:00-13:00' },
    isActive: true,
  })

  const bizId2 = 'seed-biz-central-livros'
  await upsertBusiness({
    id: bizId2,
    userId: businessUserId,
    name: 'Livraria Central',
    companyName: 'Livraria Central S.A.',
    cnpj: '22333444000192',
    category: 'cultura',
    description: 'Livros e mais livros para todos os gostos.',
    logoUrl: '/uploads/default-logo.png',
    socialLinks: { instagram: '@livrariacentral' },
    openingHours: { weekdays: '09:00-20:00', saturday: '10:00-18:00' },
    isActive: true,
  })
  console.log('Sample businesses created.')

  // ── Sample coupons ──
  const couponId1 = 'demo-coupon-10off'
  await upsertCoupon({
    id: couponId1,
    businessId: bizId,
    title: '10% de desconto',
    description: 'Ganhe 10% de desconto em qualquer compra.',
    behavior: { type: 'percentage_discount', percent: 10 },
    restrictions: { globalCap: 100, minimumPurchaseValueCents: 1000 },
    isActive: true,
  })
  await upsertCouponAnalytics({
    id: crypto.randomUUID(),
    couponId: couponId1,
    views: 0,
    redemptions: 0,
    validations: 0,
  })

  const couponId2 = 'demo-coupon-fixo5'
  await upsertCoupon({
    id: couponId2,
    businessId: bizId2,
    title: 'R$ 5,00 de desconto',
    description: 'Desconto fixo de R$ 5,00 em qualquer livro.',
    behavior: { type: 'fixed_amount', amountCents: 500 },
    restrictions: { globalCap: 50, minimumPurchaseValueCents: 2000 },
    isActive: true,
  })
  await upsertCouponAnalytics({
    id: crypto.randomUUID(),
    couponId: couponId2,
    views: 0,
    redemptions: 0,
    validations: 0,
  })
  console.log('Sample coupons created.')

  console.log('Seed complete.')
}

await main()

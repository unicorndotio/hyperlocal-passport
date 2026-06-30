import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { eq, sql } from 'drizzle-orm'
import { db } from './lib/db.ts'
import * as schema from './db/schema.ts'

const ADMIN_EMAIL = Deno.env.get('SEED_EMAIL') || 'admin@example.com'
const ADMIN_PASSWORD = Deno.env.get('SEED_PASSWORD') || 'admin123'
const ADMIN_NAME = Deno.env.get('SEED_NAME') || 'Admin'

const BUSINESS_EMAIL = 'business@example.com'
const BUSINESS_PASSWORD = 'business123'
const BUSINESS_NAME = 'Loja Central'

const RESIDENT_EMAIL = 'morador@example.com'
const RESIDENT_PASSWORD = 'morador123'
const RESIDENT_NAME = 'Ana Souza'

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
    console.log(`   No credential account for ${email} — re-creating...`)
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

async function upsertMerchantPost(
  values: typeof schema.merchantPosts.$inferInsert,
): Promise<void> {
  await db.insert(schema.merchantPosts).values(values).onConflictDoNothing()
}

async function upsertRedemption(
  values: typeof schema.redemptions.$inferInsert,
): Promise<void> {
  await db.insert(schema.redemptions).values(values).onConflictDoNothing()
}

async function upsertTransaction(
  values: typeof schema.transactions.$inferInsert,
): Promise<void> {
  await db.insert(schema.transactions).values(values).onConflictDoNothing()
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
    `Admin ready — id: ${adminId}  email: ${ADMIN_EMAIL}  password: ${ADMIN_PASSWORD}`,
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

  // ── Approved resident user ──
  const residentId = await signUpOrGetUser(
    RESIDENT_EMAIL,
    RESIDENT_PASSWORD,
    RESIDENT_NAME,
  )
  await db
    .update(schema.users)
    .set({
      role: 'resident',
      status: 'approved',
      cpf: '123.456.789-00',
      phone: '(48) 99999-1234',
      address: 'Rua das Palmeiras, 42 – Jurerê Internacional',
    })
    .where(eq(schema.users.id, residentId))
  console.log(
    `Resident ready — email: ${RESIDENT_EMAIL}  password: ${RESIDENT_PASSWORD}`,
  )

  // ── Sample businesses ──
  const bizId = 'seed-biz-central-cafe'
  await upsertBusiness({
    id: bizId,
    userId: businessUserId,
    name: 'Café Central',
    companyName: 'Café Central Ltda',
    cnpj: '11222333000181',
    category: 'alimentacao',
    description: 'Um café aconchegante no centro da cidade.',
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
  // Coupons are given explicit createdAt timestamps spread across two weeks
  // so they interleave with merchant posts in the feed instead of bunching together.

  const couponId1 = 'demo-coupon-10off'
  await upsertCoupon({
    id: couponId1,
    businessId: bizId,
    title: '10% de desconto',
    description: 'Ganhe 10% de desconto em qualquer compra.',
    behavior: { type: 'percentage_discount', percent: 10 },
    restrictions: { globalCap: 100, minimumPurchaseValueCents: 1000 },
    isActive: true,
    createdAt: new Date('2026-06-17T09:00:00Z'),
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
    createdAt: new Date('2026-06-19T14:00:00Z'),
  })
  await upsertCouponAnalytics({
    id: crypto.randomUUID(),
    couponId: couponId2,
    views: 0,
    redemptions: 0,
    validations: 0,
  })

  // Additional coupons to populate the feed (coupon_released events)
  const couponId3 = 'demo-coupon-cafe-bogo'
  await upsertCoupon({
    id: couponId3,
    businessId: bizId,
    title: 'Leve 2, Pague 1',
    description: 'Compre 2 cafés e ganhe o segundo de graça.',
    behavior: {
      type: 'bogo',
      buyQuantity: 2,
      freeQuantity: 1,
      unitPriceCents: 800,
    },
    restrictions: { globalCap: 30, minimumPurchaseValueCents: 1600 },
    isActive: true,
    createdAt: new Date('2026-06-23T10:00:00Z'),
  })
  await upsertCouponAnalytics({
    id: crypto.randomUUID(),
    couponId: couponId3,
    views: 0,
    redemptions: 0,
    validations: 0,
  })

  const couponId4 = 'demo-coupon-livro-20off'
  await upsertCoupon({
    id: couponId4,
    businessId: bizId2,
    title: '20% em romances',
    description: 'Desconto de 20% em toda a seção de romances nacionais.',
    behavior: { type: 'percentage_discount', percent: 20 },
    restrictions: { globalCap: 40, minimumPurchaseValueCents: 3000 },
    isActive: true,
    createdAt: new Date('2026-06-29T11:00:00Z'),
  })
  await upsertCouponAnalytics({
    id: crypto.randomUUID(),
    couponId: couponId4,
    views: 0,
    redemptions: 0,
    validations: 0,
  })

  console.log('Sample coupons created.')

  // ── Merchant posts (feed_events MV source) ──
  // Dates are spread across the same two-week window as the coupons above so
  // the feed shows an interleaved mix:
  //   Jun 17 – coupon: 10% Café Central
  //   Jun 18 – post:   Festival de Inverno
  //   Jun 19 – coupon: R$5 Livraria
  //   Jun 21 – post:   Lançamento Catarinenses
  //   Jun 23 – coupon: Leve 2 Pague 1
  //   Jun 25 – post:   Cardápio de verão
  //   Jun 27 – post:   Clube do Livro
  //   Jun 29 – coupon: 20% romances
  await upsertMerchantPost({
    id: 'seed-post-cafe-festival',
    businessId: bizId,
    title: 'Festival de Inverno no Café Central 🎉',
    body:
      'Este fim de semana temos música ao vivo, bebidas quentes especiais e a nossa nova linha de bolos artesanais. Venha nos visitar!',
    imageUrl: null,
    isVisible: true,
    createdAt: new Date('2026-06-18T10:00:00Z'),
    updatedAt: new Date('2026-06-18T10:00:00Z'),
  })

  await upsertMerchantPost({
    id: 'seed-post-livraria-lancamento',
    businessId: bizId2,
    title: 'Lançamento: Coleção de Autores Catarinenses',
    body:
      'Chegaram os novos títulos da coleção de escritores de Santa Catarina. Venha descobrir histórias da nossa terra! Sessão de autógrafos no sábado às 15h.',
    imageUrl: null,
    isVisible: true,
    createdAt: new Date('2026-06-21T14:00:00Z'),
    updatedAt: new Date('2026-06-21T14:00:00Z'),
  })

  await upsertMerchantPost({
    id: 'seed-post-cafe-novidades',
    businessId: bizId,
    title: 'Novo cardápio de verão disponível ☀️',
    body:
      'Preparamos vitaminas, açaí e sucos naturais especiais para os dias quentes. Tudo feito na hora com frutas frescas.',
    imageUrl: null,
    isVisible: true,
    createdAt: new Date('2026-06-25T09:00:00Z'),
    updatedAt: new Date('2026-06-25T09:00:00Z'),
  })

  await upsertMerchantPost({
    id: 'seed-post-livraria-clube',
    businessId: bizId2,
    title: 'Clube do Livro de Julho — inscrições abertas 📚',
    body:
      'Participe do nosso clube mensal de leituras. Este mês lemos "O Cortiço" de Aluísio Azevedo. Encontro presencial na loja no dia 12/07 às 18h.',
    imageUrl: null,
    isVisible: true,
    createdAt: new Date('2026-06-27T16:00:00Z'),
    updatedAt: new Date('2026-06-27T16:00:00Z'),
  })

  // Draft post (not visible — exercises the moderation gate)
  await upsertMerchantPost({
    id: 'seed-post-cafe-draft',
    businessId: bizId,
    title: 'Rascunho: Promoção de Aniversário',
    body: 'Ainda em elaboração...',
    imageUrl: null,
    isVisible: false,
    createdAt: new Date('2026-06-30T08:00:00Z'),
    updatedAt: new Date('2026-06-30T08:00:00Z'),
  })

  console.log('Sample merchant posts created.')

  // ── Used redemptions + transactions (savings history data) ──
  // Three past used redemptions for the resident, each with a matching transaction.

  // Redemption 1: 10% off at Café Central — purchase R$ 45,00 → discount R$ 4,50
  const redemption1Id = 'seed-redemption-r1'
  await upsertRedemption({
    id: redemption1Id,
    couponId: couponId1,
    businessId: bizId,
    userId: residentId,
    status: 'used',
    redeemedAt: new Date('2026-06-20T11:00:00Z'),
    usedAt: new Date('2026-06-20T11:15:00Z'),
  })
  await upsertTransaction({
    id: 'seed-tx-1',
    redemptionId: redemption1Id,
    couponId: couponId1,
    businessId: bizId,
    userId: residentId,
    totalAmountCents: 4500,
    discountAppliedCents: 450,
    finalAmountCents: 4050,
    timestamp: new Date('2026-06-20T11:15:00Z'),
  })

  // Redemption 2: R$ 5,00 off at Livraria Central — purchase R$ 38,00 → discount R$ 5,00
  const redemption2Id = 'seed-redemption-r2'
  await upsertRedemption({
    id: redemption2Id,
    couponId: couponId2,
    businessId: bizId2,
    userId: residentId,
    status: 'used',
    redeemedAt: new Date('2026-06-22T15:00:00Z'),
    usedAt: new Date('2026-06-22T15:30:00Z'),
  })
  await upsertTransaction({
    id: 'seed-tx-2',
    redemptionId: redemption2Id,
    couponId: couponId2,
    businessId: bizId2,
    userId: residentId,
    totalAmountCents: 3800,
    discountAppliedCents: 500,
    finalAmountCents: 3300,
    timestamp: new Date('2026-06-22T15:30:00Z'),
  })

  // Redemption 3: another 10% off at Café Central — purchase R$ 22,00 → discount R$ 2,20
  const redemption3Id = 'seed-redemption-r3'
  await upsertRedemption({
    id: redemption3Id,
    couponId: couponId1,
    businessId: bizId,
    userId: residentId,
    status: 'used',
    redeemedAt: new Date('2026-06-26T09:30:00Z'),
    usedAt: new Date('2026-06-26T09:45:00Z'),
  })
  await upsertTransaction({
    id: 'seed-tx-3',
    redemptionId: redemption3Id,
    couponId: couponId1,
    businessId: bizId,
    userId: residentId,
    totalAmountCents: 2200,
    discountAppliedCents: 220,
    finalAmountCents: 1980,
    timestamp: new Date('2026-06-26T09:45:00Z'),
  })

  // Active redemption (pending — shows in resident's passport wallet)
  await upsertRedemption({
    id: 'seed-redemption-active',
    couponId: couponId2,
    businessId: bizId2,
    userId: residentId,
    status: 'active',
    redeemedAt: new Date('2026-06-30T08:00:00Z'),
    usedAt: null,
  })

  console.log(
    'Sample redemptions and transactions created.',
  )
  console.log(
    `  Resident savings: R$ 11,70 across 3 transactions (Café Central: R$ 6,70, Livraria: R$ 5,00)`,
  )

  // ── Refresh feed_events materialized view ──
  // The MV unions merchant_posts + coupons. It must be refreshed after seeding
  // or newly inserted rows won't appear in the feed.
  await db.execute(
    sql`REFRESH MATERIALIZED VIEW CONCURRENTLY feed_events`,
  )
  console.log('feed_events materialized view refreshed.')

  console.log('Seed complete.')
}

await main()

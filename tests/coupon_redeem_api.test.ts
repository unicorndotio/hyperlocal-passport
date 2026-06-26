import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { stub } from 'https://deno.land/std@0.224.0/testing/mock.ts'
import { db } from '../lib/db.ts'
import * as schema from '../db/schema.ts'
import { eq } from 'drizzle-orm'
import { handler as redeemHandler } from '../routes/api/coupons/[id]/redeem.ts'
import { auth } from '../lib/auth.ts'

type RedeemCtx = { req: Request; params: { id: string } }

function redeemReq(couponId: string, method = 'POST'): Request {
  return new Request(`http://localhost:8000/api/coupons/${couponId}/redeem`, {
    method,
  })
}

function resolveSession(userId: string, role: string) {
  return Promise.resolve({
    user: {
      id: userId,
      role,
      email: `${role}@example.com`,
      name: role,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    session: {
      id: 'sess_' + userId,
      userId,
      expiresAt: new Date(Date.now() + 3600000),
      token: 'token_' + userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
}

async function createTestCoupon(
  couponId: string,
  businessId: string,
  overrides: Record<string, unknown> = {},
) {
  const coupon: Record<string, unknown> = {
    id: couponId,
    businessId,
    title: 'Test Coupon',
    behavior: { type: 'percentage_discount', percent: 10 },
    restrictions: {},
    isActive: true,
    ...overrides,
  }
  await db.insert(schema.coupons).values(coupon as any)
}

async function ensureBizUser(
  userId: string,
  email?: string,
  name?: string,
) {
  await db.insert(schema.users).values({
    id: userId,
    email: email || `${userId}@test.com`,
    name: name || 'Test User',
  }).onConflictDoNothing({ target: schema.users.id })
}

async function ensureBusiness(
  businessId: string,
  userId: string,
  name?: string,
) {
  const cnpj = Date.now().toString(36).slice(-6) +
    Math.random().toString(36).slice(2, 10)
  await db.insert(schema.businesses).values({
    id: businessId,
    userId,
    name: name || 'Test Business',
    companyName: name ? `${name} Ltd` : 'Test Business Ltd',
    cnpj,
    category: 'Test',
    logoUrl: 'http://localhost/logo.png',
    isActive: true,
  }).onConflictDoNothing({ target: schema.businesses.id })
}

async function cleanup(couponId: string) {
  // Delete FK-dependent rows first: redemptions -> analytics -> coupon
  await db.delete(schema.redemptions).where(
    eq(schema.redemptions.couponId, couponId),
  )
  await db.delete(schema.couponAnalytics).where(
    eq(schema.couponAnalytics.couponId, couponId),
  )
  await db.delete(schema.coupons).where(eq(schema.coupons.id, couponId))
}

Deno.test({
  name: 'Coupon Redeem API - unauthorized',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const couponId = 'coupon_unauth_' + Math.random().toString(36).slice(2)
    const getSessionStub = stub(
      auth.api,
      'getSession',
      () => Promise.resolve(null),
    )
    try {
      const res = await (redeemHandler as unknown as {
        POST: (ctx: RedeemCtx) => Promise<Response>
      }).POST({ req: redeemReq(couponId), params: { id: couponId } })
      assertEquals(res.status, 401)
    } finally {
      getSessionStub.restore()
      await cleanup(couponId)
    }
  },
})

Deno.test({
  name: 'Coupon Redeem API - coupon not found',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const userId = 'user_nf_' + Math.random().toString(36).slice(2)
    const getSessionStub = stub(
      auth.api,
      'getSession',
      () => resolveSession(userId, 'resident'),
    )
    try {
      const res = await (redeemHandler as unknown as {
        POST: (ctx: RedeemCtx) => Promise<Response>
      }).POST({ req: redeemReq('nonexistent'), params: { id: 'nonexistent' } })
      assertEquals(res.status, 404)
    } finally {
      getSessionStub.restore()
    }
  },
})

Deno.test({
  name: 'Coupon Redeem API - coupon inactive',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const userId = 'user_inact_' + Math.random().toString(36).slice(2)
    const couponId = 'coupon_inact_' + Math.random().toString(36).slice(2)
    const businessId = 'biz_inact_' + Math.random().toString(36).slice(2)

    await ensureBizUser(userId)
    await ensureBusiness(businessId, userId)
    await createTestCoupon(couponId, businessId, { isActive: false })

    const getSessionStub = stub(
      auth.api,
      'getSession',
      () => resolveSession(userId, 'resident'),
    )
    try {
      const res = await (redeemHandler as unknown as {
        POST: (ctx: RedeemCtx) => Promise<Response>
      }).POST({ req: redeemReq(couponId), params: { id: couponId } })
      assertEquals(res.status, 400)
    } finally {
      getSessionStub.restore()
      await cleanup(couponId)
    }
  },
})

Deno.test({
  name: 'Coupon Redeem API - coupon expired',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const userId = 'user_exp_' + Math.random().toString(36).slice(2)
    const couponId = 'coupon_exp_' + Math.random().toString(36).slice(2)
    const businessId = 'biz_exp_' + Math.random().toString(36).slice(2)

    await ensureBizUser(userId)
    await ensureBusiness(businessId, userId)
    await createTestCoupon(couponId, businessId, {
      isActive: true,
      restrictions: { validUntil: Date.now() - 10000 },
    })

    const getSessionStub = stub(
      auth.api,
      'getSession',
      () => resolveSession(userId, 'resident'),
    )
    try {
      const res = await (redeemHandler as unknown as {
        POST: (ctx: RedeemCtx) => Promise<Response>
      }).POST({ req: redeemReq(couponId), params: { id: couponId } })
      assertEquals(res.status, 400)
    } finally {
      getSessionStub.restore()
      await cleanup(couponId)
    }
  },
})

Deno.test({
  name: 'Coupon Redeem API - global limit reached',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const userId = 'user_gl_' + Math.random().toString(36).slice(2)
    const couponId = 'coupon_gl_' + Math.random().toString(36).slice(2)
    const businessId = 'biz_gl_' + Math.random().toString(36).slice(2)
    const cap = 5

    await ensureBizUser(userId)
    await ensureBusiness(businessId, userId)
    await createTestCoupon(couponId, businessId, {
      isActive: true,
      restrictions: { globalCap: cap },
    })

    // Preset the analytics counter at the cap so redemption is blocked
    await db.insert(schema.couponAnalytics).values({
      id: crypto.randomUUID(),
      couponId,
      redemptions: cap,
    })

    const getSessionStub = stub(
      auth.api,
      'getSession',
      () => resolveSession(userId, 'resident'),
    )
    try {
      const res = await (redeemHandler as unknown as {
        POST: (ctx: RedeemCtx) => Promise<Response>
      }).POST({ req: redeemReq(couponId), params: { id: couponId } })
      assertEquals(res.status, 400)
    } finally {
      getSessionStub.restore()
      await cleanup(couponId)
    }
  },
})

Deno.test({
  name: 'Coupon Redeem API - user monthly limit reached',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const userId = 'user_ml_' + Math.random().toString(36).slice(2)
    const couponId = 'coupon_ml_' + Math.random().toString(36).slice(2)
    const businessId = 'biz_ml_' + Math.random().toString(36).slice(2)

    await ensureBizUser(userId)
    await ensureBusiness(businessId, userId)
    await createTestCoupon(couponId, businessId, {
      isActive: true,
      restrictions: { userCap: 1 },
    })

    // Insert one redemption so monthly count = 1 (at userCap)
    await db.insert(schema.redemptions).values({
      id: crypto.randomUUID(),
      couponId,
      businessId,
      userId,
      status: 'active',
    })

    const getSessionStub = stub(
      auth.api,
      'getSession',
      () => resolveSession(userId, 'resident'),
    )
    try {
      const res = await (redeemHandler as unknown as {
        POST: (ctx: RedeemCtx) => Promise<Response>
      }).POST({ req: redeemReq(couponId), params: { id: couponId } })
      assertEquals(res.status, 400)
    } finally {
      getSessionStub.restore()
      await cleanup(couponId)
    }
  },
})

Deno.test({
  name: 'Coupon Redeem API - success',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const userId = 'user_succ_' + Math.random().toString(36).slice(2)
    const couponId = 'coupon_succ_' + Math.random().toString(36).slice(2)
    const businessId = 'biz_succ_' + Math.random().toString(36).slice(2)

    await ensureBizUser(userId)
    await ensureBusiness(businessId, userId)
    await createTestCoupon(couponId, businessId, {
      restrictions: { globalCap: 5 },
    })

    const getSessionStub = stub(
      auth.api,
      'getSession',
      () => resolveSession(userId, 'resident'),
    )
    try {
      const res = await (redeemHandler as unknown as {
        POST: (ctx: RedeemCtx) => Promise<Response>
      }).POST({ req: redeemReq(couponId), params: { id: couponId } })
      assertEquals(res.status, 201)
      const data = await res.json()
      assertEquals(data.couponId, couponId)
      assertEquals(data.userId, userId)
      assertEquals(data.status, 'active')

      // Verify analytics counter was incremented
      const [analytics] = await db.select().from(schema.couponAnalytics)
        .where(eq(schema.couponAnalytics.couponId, couponId))
      assertEquals(analytics.redemptions, 1)
    } finally {
      getSessionStub.restore()
      await cleanup(couponId)
    }
  },
})

Deno.test({
  name: 'Coupon Redeem API - analytics counter increments atomically',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const userId = 'user_aci_' + Math.random().toString(36).slice(2)
    const couponId = 'coupon_aci_' + Math.random().toString(36).slice(2)
    const businessId = 'biz_aci_' + Math.random().toString(36).slice(2)

    await ensureBizUser(userId)
    await ensureBusiness(businessId, userId)
    await createTestCoupon(couponId, businessId, {
      restrictions: { globalCap: 10 },
    })

    const getSessionStub = stub(
      auth.api,
      'getSession',
      () => resolveSession(userId, 'resident'),
    )
    try {
      const res1 = await (redeemHandler as unknown as {
        POST: (ctx: RedeemCtx) => Promise<Response>
      }).POST({ req: redeemReq(couponId), params: { id: couponId } })
      assertEquals(res1.status, 201)

      const res2 = await (redeemHandler as unknown as {
        POST: (ctx: RedeemCtx) => Promise<Response>
      }).POST({ req: redeemReq(couponId), params: { id: couponId } })
      assertEquals(res2.status, 201)

      const [analytics] = await db.select().from(schema.couponAnalytics)
        .where(eq(schema.couponAnalytics.couponId, couponId))
      assertEquals(analytics.redemptions, 2)
    } finally {
      getSessionStub.restore()
      await cleanup(couponId)
    }
  },
})

Deno.test({
  name: 'Coupon Redeem API - monthly limit uses UTC-consistent boundary',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const userId = 'user_utc_' + Math.random().toString(36).slice(2)
    const couponId = 'coupon_utc_' + Math.random().toString(36).slice(2)
    const businessId = 'biz_utc_' + Math.random().toString(36).slice(2)

    await ensureBizUser(userId)
    await ensureBusiness(businessId, userId)
    await createTestCoupon(couponId, businessId, {
      isActive: true,
      restrictions: { userCap: 1 },
    })

    // Seed a redemption with redeemedAt at the 1st of the current UTC month
    // to verify the month-boundary query uses UTC consistently
    const now = new Date()
    const startOfMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    )
    await db.insert(schema.redemptions).values({
      id: crypto.randomUUID(),
      couponId,
      businessId,
      userId,
      status: 'active',
      redeemedAt: startOfMonth,
    })

    const getSessionStub = stub(
      auth.api,
      'getSession',
      () => resolveSession(userId, 'resident'),
    )
    try {
      const res = await (redeemHandler as unknown as {
        POST: (ctx: RedeemCtx) => Promise<Response>
      }).POST({ req: redeemReq(couponId), params: { id: couponId } })
      assertEquals(
        res.status,
        400,
        'Monthly cap should block second redemption',
      )
    } finally {
      getSessionStub.restore()
      await cleanup(couponId)
    }
  },
})

Deno.test({
  name: 'Coupon Redeem API - concurrent redemptions respect global cap',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const couponId = 'coupon_conc_' + Math.random().toString(36).slice(2)
    const businessId = 'biz_conc_' + Math.random().toString(36).slice(2)
    const cap = 1

    await ensureBizUser('conc_user')
    await ensureBusiness(businessId, 'conc_user', 'Concurrent Business')
    await createTestCoupon(couponId, businessId, {
      isActive: true,
      restrictions: { globalCap: cap },
      title: 'Concurrent',
      behavior: { type: 'percentage_discount', percent: 10 },
    })

    const userId = 'conc_user'
    const sessionStub = stub(
      auth.api,
      'getSession',
      () => resolveSession(userId, 'resident'),
    )
    try {
      // Fire both requests concurrently
      const [res1, res2] = await Promise.all([
        (redeemHandler as unknown as {
          POST: (ctx: RedeemCtx) => Promise<Response>
        }).POST({ req: redeemReq(couponId), params: { id: couponId } }),
        (redeemHandler as unknown as {
          POST: (ctx: RedeemCtx) => Promise<Response>
        }).POST({ req: redeemReq(couponId), params: { id: couponId } }),
      ])

      const statuses = [res1.status, res2.status]
      const okCount = statuses.filter((s) => s === 201).length
      const failCount = statuses.filter((s) => s === 409 || s === 400).length

      assertEquals(
        okCount,
        1,
        'Exactly one concurrent redemption should succeed',
      )
      assertEquals(
        failCount,
        1,
        'Exactly one concurrent redemption should fail',
      )

      // Final counter should be exactly 1
      const [analytics] = await db.select().from(schema.couponAnalytics)
        .where(eq(schema.couponAnalytics.couponId, couponId))
      assertEquals(analytics?.redemptions, cap)
    } finally {
      sessionStub.restore()
      await cleanup(couponId)
    }
  },
})

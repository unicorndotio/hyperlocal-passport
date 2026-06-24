import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { stub } from 'https://deno.land/std@0.224.0/testing/mock.ts'
import { handler as analyticsHandler } from '../routes/api/businesses/[id]/analytics.ts'
import { auth } from '../lib/auth.ts'
import { db } from '../lib/db.ts'
import * as schema from '../db/schema.ts'
import { eq } from 'drizzle-orm'

type AnalyticsCtx = { req: Request; params: { id: string } }

function analyticsReq(
  businessId: string,
  queryParams = '',
): Request {
  return new Request(
    `http://localhost:8000/api/businesses/${businessId}/analytics${queryParams}`,
  )
}

function makeSession(userId: string, role: string) {
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

async function cleanupAll() {
  await db.delete(schema.couponAnalytics)
  await db.delete(schema.transactions)
  await db.delete(schema.redemptions)
  await db.delete(schema.coupons)
  await db.delete(schema.businesses)
  await db.delete(schema.users)
}

Deno.test({
  name: 'Analytics API - unauthorized returns 401',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    await cleanupAll()
    const businessId = 'biz_unauth_' + Math.random().toString(36).slice(2)
    const getSessionStub = stub(
      auth.api,
      'getSession',
      () => Promise.resolve(null),
    )
    try {
      const res = await (analyticsHandler as unknown as {
        GET: (ctx: AnalyticsCtx) => Promise<Response>
      }).GET({ req: analyticsReq(businessId), params: { id: businessId } })
      assertEquals(res.status, 401)
    } finally {
      getSessionStub.restore()
    }
  },
})

Deno.test({
  name: 'Analytics API - business not found returns 404',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    await cleanupAll()
    const userId = 'user_nf_' + Math.random().toString(36).slice(2)
    const getSessionStub = stub(
      auth.api,
      'getSession',
      () => makeSession(userId, 'business'),
    )
    try {
      const res = await (analyticsHandler as unknown as {
        GET: (ctx: AnalyticsCtx) => Promise<Response>
      }).GET({
        req: analyticsReq('nonexistent'),
        params: { id: 'nonexistent' },
      })
      assertEquals(res.status, 404)
    } finally {
      getSessionStub.restore()
    }
  },
})

Deno.test({
  name: 'Analytics API - non-owner returns 403',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    await cleanupAll()
    const businessId = 'biz_forbid_' + Math.random().toString(36).slice(2)
    const ownerUserId = 'owner_' + Math.random().toString(36).slice(2)
    const otherUserId = 'other_' + Math.random().toString(36).slice(2)

    await db.insert(schema.users).values({
      id: ownerUserId,
      email: ownerUserId + '@test.com',
      name: 'Owner',
    })
    await db.insert(schema.businesses).values({
      id: businessId,
      userId: ownerUserId,
      name: 'Forbidden Business',
      companyName: 'Forbidden Business Ltda',
      cnpj: Date.now().toString(36).slice(-8) +
        Math.random().toString(36).slice(2, 8),
      category: 'Test',
      logoUrl: 'http://localhost/logo.png',
    })

    const getSessionStub = stub(
      auth.api,
      'getSession',
      () => makeSession(otherUserId, 'business'),
    )
    try {
      const res = await (analyticsHandler as unknown as {
        GET: (ctx: AnalyticsCtx) => Promise<Response>
      }).GET({ req: analyticsReq(businessId), params: { id: businessId } })
      assertEquals(res.status, 403)
    } finally {
      getSessionStub.restore()
    }
  },
})

Deno.test({
  name: 'Analytics API - admin can access any business',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    await cleanupAll()
    const businessId = 'biz_admin_' + Math.random().toString(36).slice(2)
    const ownerUserId = 'owner_admin_' + Math.random().toString(36).slice(2)

    await db.insert(schema.users).values({
      id: ownerUserId,
      email: ownerUserId + '@test.com',
      name: 'Owner',
    })
    await db.insert(schema.businesses).values({
      id: businessId,
      userId: ownerUserId,
      name: 'Admin Access Business',
      companyName: 'Admin Access Business Ltda',
      cnpj: Date.now().toString(36).slice(-8) +
        Math.random().toString(36).slice(2, 8),
      category: 'Test',
      logoUrl: 'http://localhost/logo.png',
    })

    const getSessionStub = stub(
      auth.api,
      'getSession',
      () => makeSession('admin_user', 'admin'),
    )
    try {
      const res = await (analyticsHandler as unknown as {
        GET: (ctx: AnalyticsCtx) => Promise<Response>
      }).GET({ req: analyticsReq(businessId), params: { id: businessId } })
      assertEquals(res.status, 200)
      const body = await res.json()
      assertEquals(body.totals.views, 0)
      assertEquals(body.coupons.length, 0)
    } finally {
      getSessionStub.restore()
    }
  },
})

Deno.test({
  name:
    'Analytics API - returns per-coupon funnel data with correct counter values',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    await cleanupAll()
    const userId = 'user_funnel_' + Math.random().toString(36).slice(2)
    const businessId = 'biz_funnel_' + Math.random().toString(36).slice(2)
    const coupon1Id = 'c_f1_' + Math.random().toString(36).slice(2)
    const coupon2Id = 'c_f2_' + Math.random().toString(36).slice(2)

    // Setup user, business, and coupons
    await db.insert(schema.users).values({
      id: userId,
      email: userId + '@test.com',
      name: 'Funnel Test User',
    })

    await db.insert(schema.businesses).values({
      id: businessId,
      userId,
      name: 'Funnel Test Business',
      companyName: 'Funnel Test Business Ltda',
      cnpj: Date.now().toString(36).slice(-8) +
        Math.random().toString(36).slice(2, 8),
      category: 'Test',
      logoUrl: 'http://localhost/logo.png',
    })

    await db.insert(schema.coupons).values({
      id: coupon1Id,
      businessId,
      title: '10% OFF',
      behavior: { type: 'percentage_discount', percent: 10 },
      restrictions: {},
      isActive: true,
    })

    await db.insert(schema.coupons).values({
      id: coupon2Id,
      businessId,
      title: 'R$ 5 OFF',
      behavior: { type: 'fixed_amount', amountCents: 500 },
      restrictions: {},
      isActive: true,
    })

    // Setup analytics counters
    await db.insert(schema.couponAnalytics).values({
      id: crypto.randomUUID(),
      couponId: coupon1Id,
      views: 100,
      redemptions: 30,
      validations: 20,
    })

    await db.insert(schema.couponAnalytics).values({
      id: crypto.randomUUID(),
      couponId: coupon2Id,
      views: 50,
      redemptions: 15,
      validations: 10,
    })

    const getSessionStub = stub(
      auth.api,
      'getSession',
      () => makeSession(userId, 'business'),
    )
    try {
      const res = await (analyticsHandler as unknown as {
        GET: (ctx: AnalyticsCtx) => Promise<Response>
      }).GET({ req: analyticsReq(businessId), params: { id: businessId } })
      assertEquals(res.status, 200)
      const body = await res.json()

      assertEquals(body.totals.views, 150)
      assertEquals(body.totals.redemptions, 45)
      assertEquals(body.totals.validations, 30)
      assertEquals(typeof body.totals.conversionRate, 'number')

      assertEquals(body.coupons.length, 2)

      const c1 = body.coupons.find(
        (c: CouponAnalytics) => c.couponId === coupon1Id,
      )
      assertExists(c1)
      assertEquals(c1.views, 100)
      assertEquals(c1.redemptions, 30)
      assertEquals(c1.validations, 20)
      assertEquals(c1.couponTitle, '10% OFF')

      const c2 = body.coupons.find(
        (c: CouponAnalytics) => c.couponId === coupon2Id,
      )
      assertExists(c2)
      assertEquals(c2.views, 50)
      assertEquals(c2.redemptions, 15)
      assertEquals(c2.validations, 10)
      assertEquals(c2.couponTitle, 'R$ 5 OFF')
    } finally {
      getSessionStub.restore()
    }
  },
})

Deno.test({
  name:
    'Analytics API - returns empty counters for coupons with no views/redemptions',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    await cleanupAll()
    const userId = 'user_empty_' + Math.random().toString(36).slice(2)
    const businessId = 'biz_empty_' + Math.random().toString(36).slice(2)
    const couponId = 'c_empty_' + Math.random().toString(36).slice(2)

    await db.insert(schema.users).values({
      id: userId,
      email: userId + '@test.com',
      name: 'Empty Counters User',
    })

    await db.insert(schema.businesses).values({
      id: businessId,
      userId,
      name: 'Empty Counters Business',
      companyName: 'Empty Counters Business Ltda',
      cnpj: Date.now().toString(36).slice(-8) +
        Math.random().toString(36).slice(2, 8),
      category: 'Test',
      logoUrl: 'http://localhost/logo.png',
    })

    await db.insert(schema.coupons).values({
      id: couponId,
      businessId,
      title: 'No Data Yet',
      behavior: { type: 'percentage_discount', percent: 10 },
      restrictions: {},
      isActive: true,
    })

    const getSessionStub = stub(
      auth.api,
      'getSession',
      () => makeSession(userId, 'business'),
    )
    try {
      const res = await (analyticsHandler as unknown as {
        GET: (ctx: AnalyticsCtx) => Promise<Response>
      }).GET({ req: analyticsReq(businessId), params: { id: businessId } })
      assertEquals(res.status, 200)
      const body = await res.json()

      assertEquals(body.totals.views, 0)
      assertEquals(body.totals.redemptions, 0)
      assertEquals(body.totals.validations, 0)

      assertEquals(body.coupons.length, 1)
      assertEquals(body.coupons[0].views, 0)
      assertEquals(body.coupons[0].redemptions, 0)
      assertEquals(body.coupons[0].validations, 0)
    } finally {
      getSessionStub.restore()
    }
  },
})

Deno.test({
  name: 'Analytics API - includes transaction history with pagination',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    await cleanupAll()
    const userId = 'user_tx_' + Math.random().toString(36).slice(2)
    const businessId = 'biz_tx_' + Math.random().toString(36).slice(2)
    const couponId = 'c_tx_' + Math.random().toString(36).slice(2)

    await db.insert(schema.users).values({
      id: userId,
      email: userId + '@test.com',
      name: 'Transaction Test User',
    })

    await db.insert(schema.businesses).values({
      id: businessId,
      userId,
      name: 'Transaction Test Business',
      companyName: 'Transaction Test Business Ltda',
      cnpj: Date.now().toString(36).slice(-8) +
        Math.random().toString(36).slice(2, 8),
      category: 'Test',
      logoUrl: 'http://localhost/logo.png',
    })

    await db.insert(schema.coupons).values({
      id: couponId,
      businessId,
      title: 'Test Coupon',
      behavior: { type: 'percentage_discount', percent: 10 },
      restrictions: {},
      isActive: true,
    })

    // Insert users and redemptions for FK requirements
    for (let i = 0; i < 5; i++) {
      await db.insert(schema.users).values({
        id: 'user_' + i,
        email: 'user_' + i + '@test.com',
        name: 'Transaction User ' + i,
      })
    }
    const redemptionIds: string[] = []
    for (let i = 0; i < 5; i++) {
      const rId = 'r_' + i + '_' + Math.random().toString(36).slice(2)
      redemptionIds.push(rId)
      await db.insert(schema.redemptions).values({
        id: rId,
        couponId,
        businessId,
        userId: 'user_' + i,
      })
    }

    const baseTime = Date.now() - 60000
    const txIds: string[] = []
    for (let i = 0; i < 5; i++) {
      const txId = 'tx_' + i + '_' + Math.random().toString(36).slice(2)
      txIds.push(txId)
      await db.insert(schema.transactions).values({
        id: txId,
        redemptionId: redemptionIds[i],
        couponId,
        businessId,
        userId: 'user_' + i,
        totalAmountCents: 10000 + i * 1000,
        discountAppliedCents: 1000 + i * 100,
        finalAmountCents: 9000 + i * 900,
        timestamp: new Date(baseTime + i * 1000),
      })
    }

    const getSessionStub = stub(
      auth.api,
      'getSession',
      () => makeSession(userId, 'business'),
    )
    try {
      const res1 = await (analyticsHandler as unknown as {
        GET: (ctx: AnalyticsCtx) => Promise<Response>
      }).GET({
        req: analyticsReq(businessId, '?limit=2&page=1'),
        params: { id: businessId },
      })
      assertEquals(res1.status, 200)
      const body1 = await res1.json()

      assertEquals(body1.transactions.length, 2)
      assertEquals(body1.pagination.page, 1)
      assertEquals(body1.pagination.limit, 2)
      assertEquals(body1.pagination.total, 5)
      assertEquals(body1.pagination.totalPages, 3)

      assertExists(
        body1.transactions[0].timestamp > body1.transactions[1].timestamp,
      )

      const res2 = await (analyticsHandler as unknown as {
        GET: (ctx: AnalyticsCtx) => Promise<Response>
      }).GET({
        req: analyticsReq(businessId, '?limit=2&page=3'),
        params: { id: businessId },
      })
      assertEquals(res2.status, 200)
      const body2 = await res2.json()
      assertEquals(body2.transactions.length, 1)
      assertEquals(body2.pagination.page, 3)

      assertEquals(
        body1.transactions[0].couponTitle,
        'Test Coupon',
      )
    } finally {
      getSessionStub.restore()
    }
  },
})

Deno.test({
  name: 'Analytics API - no coupons returns empty array',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    await cleanupAll()
    const userId = 'user_noc_' + Math.random().toString(36).slice(2)
    const businessId = 'biz_noc_' + Math.random().toString(36).slice(2)

    await db.insert(schema.users).values({
      id: userId,
      email: userId + '@test.com',
      name: 'No Coupons User',
    })

    await db.insert(schema.businesses).values({
      id: businessId,
      userId,
      name: 'No Coupons Business',
      companyName: 'No Coupons Business Ltda',
      cnpj: Date.now().toString(36).slice(-8) +
        Math.random().toString(36).slice(2, 8),
      category: 'Test',
      logoUrl: 'http://localhost/logo.png',
    })

    const getSessionStub = stub(
      auth.api,
      'getSession',
      () => makeSession(userId, 'business'),
    )
    try {
      const res = await (analyticsHandler as unknown as {
        GET: (ctx: AnalyticsCtx) => Promise<Response>
      }).GET({ req: analyticsReq(businessId), params: { id: businessId } })
      assertEquals(res.status, 200)
      const body = await res.json()

      assertEquals(body.coupons.length, 0)
      assertEquals(body.transactions.length, 0)
      assertEquals(body.totals.views, 0)
      assertEquals(body.totals.redemptions, 0)
      assertEquals(body.totals.validations, 0)
    } finally {
      getSessionStub.restore()
    }
  },
})

interface CouponAnalytics {
  couponId: string
  couponTitle: string
  views: number
  redemptions: number
  validations: number
}

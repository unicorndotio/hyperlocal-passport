import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { stub } from 'https://deno.land/std@0.224.0/testing/mock.ts'
import { handler as analyticsHandler } from '../routes/api/businesses/[id]/analytics.ts'
import { auth } from '../lib/auth.ts'
import { kv } from '../lib/kv.ts'
import type { Coupon, Transaction } from '../lib/coupon.ts'
import {
  redemptionCountKey,
  validationCountKey,
  viewCountKey,
} from '../lib/analytics.ts'

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

Deno.test('Analytics API - unauthorized returns 401', async () => {
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
})

Deno.test('Analytics API - business not found returns 404', async () => {
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
})

Deno.test('Analytics API - non-owner returns 403', async () => {
  const businessId = 'biz_forbid_' + Math.random().toString(36).slice(2)
  const ownerUserId = 'owner_' + Math.random().toString(36).slice(2)
  const otherUserId = 'other_' + Math.random().toString(36).slice(2)

  await kv.set(['businesses', businessId], {
    id: businessId,
    userId: ownerUserId,
    name: 'Forbidden Business',
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
    await kv.delete(['businesses', businessId])
  }
})

Deno.test('Analytics API - admin can access any business', async () => {
  const businessId = 'biz_admin_' + Math.random().toString(36).slice(2)
  const ownerUserId = 'owner_admin_' + Math.random().toString(36).slice(2)

  await kv.set(['businesses', businessId], {
    id: businessId,
    userId: ownerUserId,
    name: 'Admin Access Business',
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
    await kv.delete(['businesses', businessId])
  }
})

Deno.test('Analytics API - returns per-coupon funnel data with correct counter values', async () => {
  const userId = 'user_funnel_' + Math.random().toString(36).slice(2)
  const businessId = 'biz_funnel_' + Math.random().toString(36).slice(2)
  const coupon1Id = 'c_f1_' + Math.random().toString(36).slice(2)
  const coupon2Id = 'c_f2_' + Math.random().toString(36).slice(2)

  // Setup business
  await kv.set(['businesses', businessId], {
    id: businessId,
    userId,
    name: 'Funnel Test Business',
  })

  // Setup coupons
  const coupon1: Coupon = {
    id: coupon1Id,
    businessId,
    title: '10% OFF',
    behavior: { type: 'percentage_discount', percent: 10 },
    restrictions: {},
    isActive: true,
    createdAt: new Date().toISOString(),
  }
  const coupon2: Coupon = {
    id: coupon2Id,
    businessId,
    title: 'R$ 5 OFF',
    behavior: { type: 'fixed_amount', amountCents: 500 },
    restrictions: {},
    isActive: true,
    createdAt: new Date().toISOString(),
  }
  await kv.set(['coupons', coupon1Id], coupon1)
  await kv.set(['coupons', coupon2Id], coupon2)

  // Setup analytics counters - use .sum() for views (Deno.KvU64), .set() for others
  await kv.atomic().sum(viewCountKey(coupon1Id), 100n).commit()
  await kv.set(redemptionCountKey(coupon1Id), 30)
  await kv.set(validationCountKey(coupon1Id), 20)

  await kv.atomic().sum(viewCountKey(coupon2Id), 50n).commit()
  await kv.set(redemptionCountKey(coupon2Id), 15)
  await kv.set(validationCountKey(coupon2Id), 10)

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

    // Check totals
    assertEquals(body.totals.views, 150)
    assertEquals(body.totals.redemptions, 45)
    assertEquals(body.totals.validations, 30)
    assertEquals(typeof body.totals.conversionRate, 'number')

    // Check coupon analytics
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
    await kv.delete(['businesses', businessId])
    await kv.delete(['coupons', coupon1Id])
    await kv.delete(['coupons', coupon2Id])
    await kv.delete(viewCountKey(coupon1Id))
    await kv.delete(redemptionCountKey(coupon1Id))
    await kv.delete(validationCountKey(coupon1Id))
    await kv.delete(viewCountKey(coupon2Id))
    await kv.delete(redemptionCountKey(coupon2Id))
    await kv.delete(validationCountKey(coupon2Id))
  }
})

Deno.test('Analytics API - returns empty counters for coupons with no views/redemptions', async () => {
  const userId = 'user_empty_' + Math.random().toString(36).slice(2)
  const businessId = 'biz_empty_' + Math.random().toString(36).slice(2)
  const couponId = 'c_empty_' + Math.random().toString(36).slice(2)

  await kv.set(['businesses', businessId], {
    id: businessId,
    userId,
    name: 'Empty Counters Business',
  })

  const coupon: Coupon = {
    id: couponId,
    businessId,
    title: 'No Data Yet',
    behavior: { type: 'percentage_discount', percent: 10 },
    restrictions: {},
    isActive: true,
    createdAt: new Date().toISOString(),
  }
  await kv.set(['coupons', couponId], coupon)

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
    await kv.delete(['businesses', businessId])
    await kv.delete(['coupons', couponId])
  }
})

Deno.test('Analytics API - includes transaction history with pagination', async () => {
  const userId = 'user_tx_' + Math.random().toString(36).slice(2)
  const businessId = 'biz_tx_' + Math.random().toString(36).slice(2)
  const couponId = 'c_tx_' + Math.random().toString(36).slice(2)

  await kv.set(['businesses', businessId], {
    id: businessId,
    userId,
    name: 'Transaction Test Business',
  })

  const coupon: Coupon = {
    id: couponId,
    businessId,
    title: 'Test Coupon',
    behavior: { type: 'percentage_discount', percent: 10 },
    restrictions: {},
    isActive: true,
    createdAt: new Date().toISOString(),
  }
  await kv.set(['coupons', couponId], coupon)

  // Create 5 transactions at different timestamps
  const baseTime = Date.now() - 60000
  for (let i = 0; i < 5; i++) {
    const tx: Transaction = {
      id: 'tx_' + i + '_' + Math.random().toString(36).slice(2),
      redemptionId: 'r_' + i,
      couponId,
      businessId,
      userId: 'user_' + i,
      totalAmountCents: 10000 + i * 1000,
      discountAppliedCents: 1000 + i * 100,
      finalAmountCents: 9000 + i * 900,
      timestamp: baseTime + i * 1000,
    }
    await kv.set(
      ['business_transactions', businessId, tx.timestamp],
      tx,
    )
  }

  const getSessionStub = stub(
    auth.api,
    'getSession',
    () => makeSession(userId, 'business'),
  )
  try {
    // Test with limit=2, page=1
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

    // Transactions should be sorted newest first
    assertExists(
      body1.transactions[0].timestamp > body1.transactions[1].timestamp,
    )

    // Test with limit=2, page=3 (last page, 1 item)
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

    // Verify coupon title is included in transactions
    assertEquals(
      body1.transactions[0].couponTitle,
      'Test Coupon',
    )
  } finally {
    getSessionStub.restore()
    await kv.delete(['businesses', businessId])
    await kv.delete(['coupons', couponId])
    for (let i = 0; i < 5; i++) {
      await kv.delete([
        'business_transactions',
        businessId,
        baseTime + i * 1000,
      ])
    }
  }
})

Deno.test('Analytics API - no coupons returns empty array', async () => {
  const userId = 'user_noc_' + Math.random().toString(36).slice(2)
  const businessId = 'biz_noc_' + Math.random().toString(36).slice(2)

  await kv.set(['businesses', businessId], {
    id: businessId,
    userId,
    name: 'No Coupons Business',
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
    await kv.delete(['businesses', businessId])
  }
})

interface CouponAnalytics {
  couponId: string
  couponTitle: string
  views: number
  redemptions: number
  validations: number
}

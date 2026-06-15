import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { stub } from 'https://deno.land/std@0.224.0/testing/mock.ts'
import { handler as redeemHandler } from '../routes/api/coupons/[id]/redeem.ts'
import { auth } from '../lib/auth.ts'
import { kv } from '../lib/kv.ts'
import { redemptionCountKey } from '../lib/analytics.ts'
import type { Coupon } from '../lib/coupon.ts'

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

async function cleanup(couponId: string) {
  await kv.delete(['coupons', couponId])
}

Deno.test('Coupon Redeem API - unauthorized', async () => {
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
})

Deno.test('Coupon Redeem API - coupon not found', async () => {
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
})

Deno.test('Coupon Redeem API - coupon inactive', async () => {
  const userId = 'user_inact_' + Math.random().toString(36).slice(2)
  const couponId = 'coupon_inact_' + Math.random().toString(36).slice(2)
  await kv.set(['coupons', couponId], {
    id: couponId,
    businessId: 'biz',
    isActive: false,
    behavior: { type: 'percentage_discount', percent: 10 },
    restrictions: {},
    title: 'Inactive',
    createdAt: new Date().toISOString(),
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
})

Deno.test('Coupon Redeem API - coupon expired', async () => {
  const userId = 'user_exp_' + Math.random().toString(36).slice(2)
  const couponId = 'coupon_exp_' + Math.random().toString(36).slice(2)
  await kv.set(['coupons', couponId], {
    id: couponId,
    businessId: 'biz',
    isActive: true,
    behavior: { type: 'percentage_discount', percent: 10 },
    restrictions: { validUntil: Date.now() - 10000 },
    title: 'Expired',
    createdAt: new Date().toISOString(),
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
})

Deno.test('Coupon Redeem API - global limit reached', async () => {
  const userId = 'user_gl_' + Math.random().toString(36).slice(2)
  const couponId = 'coupon_gl_' + Math.random().toString(36).slice(2)
  const cap = 5
  await kv.set(['coupons', couponId], {
    id: couponId,
    businessId: 'biz',
    isActive: true,
    behavior: { type: 'percentage_discount', percent: 10 },
    restrictions: { globalCap: cap },
    title: 'Full',
    createdAt: new Date().toISOString(),
  })
  // Preset the analytics counter at the cap so redemption is blocked
  await kv.set(redemptionCountKey(couponId), cap)
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
    await kv.delete(redemptionCountKey(couponId))
    await cleanup(couponId)
  }
})

Deno.test('Coupon Redeem API - user monthly limit reached', async () => {
  const userId = 'user_ml_' + Math.random().toString(36).slice(2)
  const couponId = 'coupon_ml_' + Math.random().toString(36).slice(2)
  const now = new Date()
  const yearMonth = `${now.getFullYear()}-${now.getMonth() + 1}`
  await kv.set(['coupons', couponId], {
    id: couponId,
    businessId: 'biz',
    isActive: true,
    behavior: { type: 'percentage_discount', percent: 10 },
    restrictions: { userCap: 1 },
    title: 'Limited',
    createdAt: new Date().toISOString(),
  })
  // Set monthly counter to already at limit
  await kv.set(['user_coupon_monthly_count', userId, couponId, yearMonth], 1)
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
    await kv.delete(['user_coupon_monthly_count', userId, couponId, yearMonth])
    await cleanup(couponId)
  }
})

Deno.test('Coupon Redeem API - success', async () => {
  const userId = 'user_succ_' + Math.random().toString(36).slice(2)
  const couponId = 'coupon_succ_' + Math.random().toString(36).slice(2)
  const coupon: Coupon = {
    id: couponId,
    businessId: 'biz_' + Math.random().toString(36).slice(2),
    title: 'Redeemable',
    behavior: { type: 'percentage_discount', percent: 10 },
    restrictions: { globalCap: 5 },
    isActive: true,
    createdAt: new Date().toISOString(),
  }
  await kv.set(['coupons', couponId], coupon)
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
    const updatedCount = await kv.get<number>(redemptionCountKey(couponId))
    assertEquals(updatedCount.value, 1)
  } finally {
    getSessionStub.restore()
    await cleanup(couponId)
  }
})

Deno.test('Coupon Redeem API - analytics counter increments atomically', async () => {
  const userId = 'user_aci_' + Math.random().toString(36).slice(2)
  const couponId = 'coupon_aci_' + Math.random().toString(36).slice(2)
  const coupon: Coupon = {
    id: couponId,
    businessId: 'biz',
    title: 'Atomic',
    behavior: { type: 'fixed_amount', amountCents: 100 },
    restrictions: { globalCap: 10 },
    isActive: true,
    createdAt: new Date().toISOString(),
  }
  await kv.set(['coupons', couponId], coupon)
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

    const count = await kv.get<number>(redemptionCountKey(couponId))
    assertEquals(count.value, 2)
  } finally {
    getSessionStub.restore()
    await cleanup(couponId)
  }
})

Deno.test('Coupon Redeem API - concurrent redemptions respect global cap', async () => {
  const couponId = 'coupon_conc_' + Math.random().toString(36).slice(2)
  const cap = 1
  const coupon: Coupon = {
    id: couponId,
    businessId: 'biz',
    title: 'Concurrent',
    behavior: { type: 'percentage_discount', percent: 10 },
    restrictions: { globalCap: cap },
    isActive: true,
    createdAt: new Date().toISOString(),
  }
  await kv.set(['coupons', couponId], coupon)

  const userId = 'user_conc_' + Math.random().toString(36).slice(2)
  const sessionStub = stub(
    auth.api,
    'getSession',
    () => resolveSession(userId, 'resident'),
  )
  try {
    // Fire both requests concurrently — same userId, no userCap set, so only globalCap races
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

    assertEquals(okCount, 1, 'Exactly one concurrent redemption should succeed')
    assertEquals(failCount, 1, 'Exactly one concurrent redemption should fail')

    // Final counter should be exactly 1
    const count = await kv.get<number>(redemptionCountKey(couponId))
    assertEquals(count.value, cap)
  } finally {
    sessionStub.restore()
    await kv.delete(redemptionCountKey(couponId))
    await cleanup(couponId)
  }
})

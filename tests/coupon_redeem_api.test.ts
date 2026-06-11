import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { stub } from 'https://deno.land/std@0.224.0/testing/mock.ts'
import { handler as redeemHandler } from '../routes/api/coupons/[id]/redeem.ts'
import { auth } from '../lib/auth.ts'
import { kv } from '../lib/kv.ts'
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
    globalClaimedCount: 0,
    type: 'basic',
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
    validUntil: Date.now() - 10000,
    globalClaimedCount: 0,
    type: 'basic',
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
  await kv.set(['coupons', couponId], {
    id: couponId,
    businessId: 'biz',
    isActive: true,
    globalLimit: 5,
    globalClaimedCount: 5,
    type: 'basic',
    title: 'Full',
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

Deno.test('Coupon Redeem API - user monthly limit reached', async () => {
  const userId = 'user_ml_' + Math.random().toString(36).slice(2)
  const couponId = 'coupon_ml_' + Math.random().toString(36).slice(2)
  const now = new Date()
  const yearMonth = `${now.getFullYear()}-${now.getMonth() + 1}`
  await kv.set(['coupons', couponId], {
    id: couponId,
    businessId: 'biz',
    isActive: true,
    userMonthlyLimit: 1,
    globalClaimedCount: 0,
    type: 'basic',
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
    type: 'special',
    title: 'Redeemable',
    globalLimit: 5,
    globalClaimedCount: 0,
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
  } finally {
    getSessionStub.restore()
    await cleanup(couponId)
  }
})

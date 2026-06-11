import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { stub as mockStub } from 'https://deno.land/std@0.224.0/testing/mock.ts'
import { auth } from '../lib/auth.ts'
import { handler as businessCouponsHandler } from '../routes/api/businesses/[id]/coupons.ts'
import { handler as couponHandler } from '../routes/api/coupons/[id].ts'
import { kv } from '../lib/kv.ts'

type CouponCtx = { req: Request; params: Record<string, string> }
type CouponHandler = {
  GET: (ctx: CouponCtx) => Promise<Response>
  POST: (ctx: CouponCtx) => Promise<Response>
  PATCH: (ctx: CouponCtx) => Promise<Response>
  DELETE: (ctx: CouponCtx) => Promise<Response>
}

function adminSession() {
  return Promise.resolve({
    user: {
      id: 'admin_user',
      role: 'admin',
      email: 'admin@example.com',
      name: 'Admin',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    session: {
      id: 'sess_admin',
      userId: 'admin_user',
      expiresAt: new Date(Date.now() + 3600000),
      token: 'token_admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
}

function nullSession() {
  return Promise.resolve(null)
}

function residentSession() {
  return Promise.resolve({
    user: {
      id: 'resident_user',
      role: 'resident',
      email: 'resident@example.com',
      name: 'Resident',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    session: {
      id: 'sess_res',
      userId: 'resident_user',
      expiresAt: new Date(Date.now() + 3600000),
      token: 'token_res',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
}

Deno.test('Coupon API CRUD - Integration', async (t) => {
  const getSessionStub = mockStub(auth.api, 'getSession', adminSession)

  try {
    const businessId = 'test_biz_' + Math.random().toString(36).slice(2)
    let couponId: string

    await t.step('POST /api/businesses/:id/coupons - Create', async () => {
      const req = new Request(
        `http://localhost:8000/api/businesses/${businessId}/coupons`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Test Coupon',
            type: 'basic',
            discountPercent: 10,
          }),
        },
      )
      const res = await (businessCouponsHandler as unknown as CouponHandler)
        .POST({ req, params: { id: businessId } })
      assertEquals(res.status, 201)
      const data = await res.json()
      couponId = data.id
      assertExists(couponId)
    })

    await t.step('GET /api/coupons/:id - Get', async () => {
      const req = new Request(`http://localhost:8000/api/coupons/${couponId}`)
      const res = await (couponHandler as unknown as CouponHandler).GET({
        req,
        params: { id: couponId },
      })
      assertEquals(res.status, 200)
      const data = await res.json()
      assertEquals(data.title, 'Test Coupon')
    })

    await t.step('PATCH /api/coupons/:id - Update', async () => {
      const req = new Request(`http://localhost:8000/api/coupons/${couponId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Coupon' }),
      })
      const res = await (couponHandler as unknown as CouponHandler).PATCH({
        req,
        params: { id: couponId },
      })
      assertEquals(res.status, 200)
      const data = await res.json()
      assertEquals(data.title, 'Updated Coupon')
    })

    await t.step('DELETE /api/coupons/:id - Delete', async () => {
      const req = new Request(`http://localhost:8000/api/coupons/${couponId}`, {
        method: 'DELETE',
      })
      const res = await (couponHandler as unknown as CouponHandler).DELETE({
        req,
        params: { id: couponId },
      })
      assertEquals(res.status, 204)

      const check = await kv.get(['coupons', couponId])
      assertEquals(check.value, null)
    })
  } finally {
    getSessionStub.restore()
  }
})

Deno.test('Coupon API - error branches', async (t) => {
  const businessId = 'err_biz_' + Math.random().toString(36).slice(2)
  const couponId = 'err_cpn_' + Math.random().toString(36).slice(2)

  // Set up a coupon owned by a business user
  await kv.set(['businesses', businessId], {
    id: businessId,
    userId: 'biz_owner',
    name: 'Test Biz',
    isActive: true,
  })
  await kv.set(['coupons', couponId], {
    id: couponId,
    businessId,
    isActive: true,
    type: 'basic',
    title: 'Test',
    globalClaimedCount: 0,
    createdAt: new Date().toISOString(),
  })

  await t.step('GET returns 404 for non-existent coupon', async () => {
    const stubSession = mockStub(auth.api, 'getSession', adminSession)
    try {
      const req = new Request('http://localhost:8000/api/coupons/nonexistent')
      const res = await (couponHandler as unknown as CouponHandler).GET({
        req,
        params: { id: 'nonexistent' },
      })
      assertEquals(res.status, 404)
    } finally {
      stubSession.restore()
    }
  })

  await t.step('PATCH returns 401 without session', async () => {
    const stubSession = mockStub(auth.api, 'getSession', nullSession)
    try {
      const req = new Request(`http://localhost:8000/api/coupons/${couponId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'x' }),
      })
      const res = await (couponHandler as unknown as CouponHandler).PATCH({
        req,
        params: { id: couponId },
      })
      assertEquals(res.status, 401)
    } finally {
      stubSession.restore()
    }
  })

  await t.step('PATCH returns 404 for non-existent coupon', async () => {
    const stubSession = mockStub(auth.api, 'getSession', adminSession)
    try {
      const req = new Request('http://localhost:8000/api/coupons/nonexistent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'x' }),
      })
      const res = await (couponHandler as unknown as CouponHandler).PATCH({
        req,
        params: { id: 'nonexistent' },
      })
      assertEquals(res.status, 404)
    } finally {
      stubSession.restore()
    }
  })

  await t.step('PATCH returns 403 for non-owner resident', async () => {
    // Resident without a business should be forbidden
    const stubSession = mockStub(auth.api, 'getSession', residentSession)
    try {
      const req = new Request(`http://localhost:8000/api/coupons/${couponId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'x' }),
      })
      const res = await (couponHandler as unknown as CouponHandler).PATCH({
        req,
        params: { id: couponId },
      })
      assertEquals(res.status, 403)
    } finally {
      stubSession.restore()
    }
  })

  await t.step('PATCH returns 400 for invalid JSON', async () => {
    const stubSession = mockStub(auth.api, 'getSession', adminSession)
    try {
      const req = new Request(`http://localhost:8000/api/coupons/${couponId}`, {
        method: 'PATCH',
        body: 'not-json',
      })
      const res = await (couponHandler as unknown as CouponHandler).PATCH({
        req,
        params: { id: couponId },
      })
      assertEquals(res.status, 400)
    } finally {
      stubSession.restore()
    }
  })

  await t.step('DELETE returns 401 without session', async () => {
    const stubSession = mockStub(auth.api, 'getSession', nullSession)
    try {
      const req = new Request(`http://localhost:8000/api/coupons/${couponId}`, {
        method: 'DELETE',
      })
      const res = await (couponHandler as unknown as CouponHandler).DELETE({
        req,
        params: { id: couponId },
      })
      assertEquals(res.status, 401)
    } finally {
      stubSession.restore()
    }
  })

  await t.step('DELETE returns 404 for non-existent coupon', async () => {
    const stubSession = mockStub(auth.api, 'getSession', adminSession)
    try {
      const req = new Request('http://localhost:8000/api/coupons/nonexistent', {
        method: 'DELETE',
      })
      const res = await (couponHandler as unknown as CouponHandler).DELETE({
        req,
        params: { id: 'nonexistent' },
      })
      assertEquals(res.status, 404)
    } finally {
      stubSession.restore()
    }
  })

  await t.step('DELETE returns 403 for non-owner resident', async () => {
    const stubSession = mockStub(auth.api, 'getSession', residentSession)
    try {
      const req = new Request(`http://localhost:8000/api/coupons/${couponId}`, {
        method: 'DELETE',
      })
      const res = await (couponHandler as unknown as CouponHandler).DELETE({
        req,
        params: { id: couponId },
      })
      assertEquals(res.status, 403)
    } finally {
      stubSession.restore()
    }
  })

  // Cleanup
  await kv.delete(['businesses', businessId])
  await kv.delete(['coupons', couponId])
})

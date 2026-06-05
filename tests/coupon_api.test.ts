import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { stub } from 'https://deno.land/std@0.224.0/testing/mock.ts'
import { auth } from '../lib/auth.ts'
import { handler as businessCouponsHandler } from '../routes/api/businesses/[id]/coupons.ts'
import { handler as couponHandler } from '../routes/api/coupons/[id].ts'
import { kv } from '../lib/kv.ts'

Deno.test('Coupon API CRUD - Integration', async (t) => {
  // Stub Auth as Admin
  const getSessionStub = stub(auth.api, 'getSession', () => {
    return Promise.resolve({
      user: { id: 'admin_user', role: 'admin' },
      session: {
        id: 'sess_admin',
        userId: 'admin_user',
        expiresAt: new Date(Date.now() + 3600000),
      },
    } as unknown)
  })

  try {
    const businessId = 'test_biz_' + Math.random().toString(36).slice(2)
  let couponId: string

  await t.step('POST /api/businesses/:id/coupons - Create', async () => {
    const req = new Request(
      `http://localhost:8000/api/businesses/${businessId}/coupons`,
      {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Coupon',
          discountPercent: 10,
          type: 'basic',
          globalLimit: 100,
          userMonthlyLimit: 1,
        }),
        headers: { 'Content-Type': 'application/json' },
      },
    )

    // ctx for Fresh 2 handlers
    const res = await (businessCouponsHandler as unknown as {
      POST: (ctx: unknown) => Promise<Response>
    }).POST({
      req,
      params: { id: businessId },
    })

    assertEquals(res.status, 201)
    const body = await res.json()
    assertEquals(body.title, 'Test Coupon')
    assertEquals(body.businessId, businessId)
    assertExists(body.id)
    couponId = body.id
  })

  await t.step('GET /api/businesses/:id/coupons - List', async () => {
    const req = new Request(
      `http://localhost:8000/api/businesses/${businessId}/coupons`,
    )
    const res = await (businessCouponsHandler as unknown as {
      GET: (ctx: unknown) => Promise<Response>
    }).GET({
      req,
      params: { id: businessId },
    })

    assertEquals(res.status, 200)
    const body = await res.json()
    assertEquals(Array.isArray(body), true)
    assertEquals(body.length, 1)
    assertEquals(body[0].id, couponId)
  })

  await t.step('GET /api/coupons/:id - Get Single', async () => {
    const req = new Request(`http://localhost:8000/api/coupons/${couponId}`)
    const res = await (couponHandler as unknown as {
      GET: (ctx: unknown) => Promise<Response>
    }).GET({
      req,
      params: { id: couponId },
    })

    assertEquals(res.status, 200)
    const body = await res.json()
    assertEquals(body.id, couponId)
  })

  await t.step('PUT /api/coupons/:id - Update', async () => {
    const req = new Request(`http://localhost:8000/api/coupons/${couponId}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: 'Updated Coupon',
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await (couponHandler as unknown as {
      PUT: (ctx: unknown) => Promise<Response>
    }).PUT({
      req,
      params: { id: couponId },
    })

    assertEquals(res.status, 200)
    const body = await res.json()
    assertEquals(body.title, 'Updated Coupon')
  })

  await t.step('DELETE /api/coupons/:id - Delete', async () => {
    const req = new Request(`http://localhost:8000/api/coupons/${couponId}`, {
      method: 'DELETE',
    })
    const res = await (couponHandler as unknown as {
      DELETE: (ctx: unknown) => Promise<Response>
    }).DELETE({
      req,
      params: { id: couponId },
    })

    assertEquals(res.status, 204)

    // Verify it's gone
    const checkReq = new Request(
      `http://localhost:8000/api/coupons/${couponId}`,
    )
    const checkRes = await (couponHandler as unknown as {
      GET: (ctx: unknown) => Promise<Response>
    }).GET({
      req: checkReq,
      params: { id: couponId },
    })
    assertEquals(checkRes.status, 404)
  })

    // Cleanup
    await kv.delete(['coupons', couponId!])
  } finally {
    getSessionStub.restore()
  }
})

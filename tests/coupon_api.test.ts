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
  const getSessionStub = stub(
    auth.api,
    'getSession',
    () => {
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
    },
  )

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
      const res = await (businessCouponsHandler as unknown as {
        POST: (ctx: {
          req: Request
          params: Record<string, string>
        }) => Promise<Response>
      }).POST({
        req,
        params: { id: businessId },
      })
      assertEquals(res.status, 201)
      const data = await res.json()
      couponId = data.id
      assertExists(couponId)
    })

    await t.step('GET /api/coupons/:id - Get', async () => {
      const req = new Request(`http://localhost:8000/api/coupons/${couponId}`)
      const res = await (couponHandler as unknown as {
        GET: (ctx: {
          req: Request
          params: Record<string, string>
        }) => Promise<Response>
      }).GET({
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
      const res = await (couponHandler as unknown as {
        PATCH: (ctx: {
          req: Request
          params: Record<string, string>
        }) => Promise<Response>
      }).PATCH({
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
      const res = await (couponHandler as unknown as {
        DELETE: (ctx: {
          req: Request
          params: Record<string, string>
        }) => Promise<Response>
      }).DELETE({
        req,
        params: { id: couponId },
      })
      assertEquals(res.status, 204)

      // Verify deleted
      const check = await kv.get(['coupons', couponId])
      assertEquals(check.value, null)
    })
  } finally {
    getSessionStub.restore()
  }
})

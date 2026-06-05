import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { stub } from 'https://deno.land/std@0.224.0/testing/mock.ts'
import { handler as redeemHandler } from '../routes/api/coupons/[id]/redeem.ts'
import { auth } from '../lib/auth.ts'
import { kv } from '../lib/kv.ts'
import type { Coupon } from '../lib/coupon.ts'

Deno.test('Coupon Redeem API', async (t) => {
  const userId = 'user_' + Math.random().toString(36).slice(2)
  const businessId = 'biz_' + Math.random().toString(36).slice(2)
  const couponId = 'coupon_' + Math.random().toString(36).slice(2)

  // Setup mock coupon
  const coupon: Coupon = {
    id: couponId,
    businessId,
    type: 'special',
    title: 'Redeemable',
    globalLimit: 5,
    globalClaimedCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
  }
  await kv.set(['coupons', couponId], coupon)

  // Stub auth.api.getSession
  const getSessionStub = stub(
    auth.api,
    'getSession',
    () => {
      return Promise.resolve({
        user: {
          id: userId,
          role: 'resident',
          email: 'resident@example.com',
          name: 'Resident',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        session: {
          id: 'sess_1',
          userId,
          expiresAt: new Date(Date.now() + 3600000),
          token: 'token_1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })
    },
  )

  try {
    await t.step('POST /api/coupons/:id/redeem - Success', async () => {
      const req = new Request(
        `http://localhost:8000/api/coupons/${couponId}/redeem`,
        {
          method: 'POST',
        },
      )
      const res = await (redeemHandler as unknown as {
        POST: (
          ctx: { req: Request; params: { id: string } },
        ) => Promise<Response>
      }).POST({
        req,
        params: { id: couponId },
      })

      assertEquals(res.status, 201)
      const data = await res.json()
      assertEquals(data.couponId, couponId)
      assertEquals(data.userId, userId)
      assertEquals(data.status, 'active')
    })
  } finally {
    getSessionStub.restore()
    await kv.delete(['coupons', couponId])
    // Clean up redemptions would be better but they have random IDs in some cases
  }
})

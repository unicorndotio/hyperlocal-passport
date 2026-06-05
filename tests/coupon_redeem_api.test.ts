import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { stub } from 'https://deno.land/std@0.224.0/testing/mock.ts'
import { handler as redeemHandler } from '../routes/api/coupons/[id]/redeem.ts'
import { auth } from '../lib/auth.ts'
import { kv } from '../lib/kv.ts'
import { Coupon } from '../lib/coupon.ts'

Deno.test('Coupon Redemption API', async (t) => {
  const userId = 'user_' + Math.random().toString(36).slice(2)
  const businessId = 'biz_' + Math.random().toString(36).slice(2)
  const couponId = 'coupon_' + Math.random().toString(36).slice(2)

  // Setup coupon in KV
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
  const getSessionStub = stub(auth.api, 'getSession', () => {
    return Promise.resolve({
      user: { id: userId, role: 'resident' },
      session: {
        id: 'sess_1',
        userId,
        expiresAt: new Date(Date.now() + 3600000),
      },
    } as any)
  })

  try {
    await t.step('POST /api/coupons/:id/redeem - Success', async () => {
      const req = new Request(
        `http://localhost:8000/api/coupons/${couponId}/redeem`,
        {
          method: 'POST',
        },
      )
      const res = await (redeemHandler as any).POST({
        req,
        params: { id: couponId },
      })

      assertEquals(res.status, 201)
      const body = await res.json()
      assertExists(body.id) // Redemption code
      assertEquals(body.couponId, couponId)
      assertEquals(body.userId, userId)
      assertEquals(body.status, 'active')

      // Verify KV updates
      const updatedCoupon = await kv.get<Coupon>(['coupons', couponId])
      assertEquals(updatedCoupon.value!.globalClaimedCount, 1)
    })

    await t.step(
      'POST /api/coupons/:id/redeem - Global Limit Reached',
      async () => {
        // Set count to limit
        const c = (await kv.get<Coupon>(['coupons', couponId])).value!
        await kv.set(['coupons', couponId], { ...c, globalClaimedCount: 5 })

        const req = new Request(
          `http://localhost:8000/api/coupons/${couponId}/redeem`,
          {
            method: 'POST',
          },
        )
        const res = await (redeemHandler as any).POST({
          req,
          params: { id: couponId },
        })

        assertEquals(res.status, 400)
        const text = await res.text()
        assertEquals(text, 'Global limit reached')
      },
    )

    await t.step('POST /api/coupons/:id/redeem - Expired', async () => {
      const c = (await kv.get<Coupon>(['coupons', couponId])).value!
      await kv.set(['coupons', couponId], {
        ...c,
        validUntil: Date.now() - 1000,
      })

      const req = new Request(
        `http://localhost:8000/api/coupons/${couponId}/redeem`,
        {
          method: 'POST',
        },
      )
      const res = await (redeemHandler as any).POST({
        req,
        params: { id: couponId },
      })

      assertEquals(res.status, 400)
      const text = await res.text()
      assertEquals(text, 'Coupon has expired')
    })

    await t.step('POST /api/coupons/:id/redeem - Inactive', async () => {
      const c = (await kv.get<Coupon>(['coupons', couponId])).value!
      await kv.set(['coupons', couponId], {
        ...c,
        isActive: false,
        validUntil: undefined,
      })

      const req = new Request(
        `http://localhost:8000/api/coupons/${couponId}/redeem`,
        {
          method: 'POST',
        },
      )
      const res = await (redeemHandler as any).POST({
        req,
        params: { id: couponId },
      })

      assertEquals(res.status, 400)
      const text = await res.text()
      assertEquals(text, 'Coupon is not active')
    })

    await t.step('POST /api/coupons/:id/redeem - Not Found', async () => {
      const req = new Request(
        `http://localhost:8000/api/coupons/nonexistent/redeem`,
        {
          method: 'POST',
        },
      )
      const res = await (redeemHandler as any).POST({
        req,
        params: { id: 'nonexistent' },
      })

      assertEquals(res.status, 404)
    })

    await t.step(
      'POST /api/coupons/:id/redeem - User Monthly Limit',
      async () => {
        const c = (await kv.get<Coupon>(['coupons', couponId])).value!
        await kv.set(['coupons', couponId], {
          ...c,
          isActive: true,
          userMonthlyLimit: 1,
          globalClaimedCount: 0,
        })

        const now = Date.now()
        // Simulate existing redemption
        await kv.set(['user_redemptions', userId, now - 1000], {
          id: 'ALREADY',
          couponId,
          userId,
          status: 'active',
          redeemedAt: now - 1000,
        })

        const req = new Request(
          `http://localhost:8000/api/coupons/${couponId}/redeem`,
          {
            method: 'POST',
          },
        )
        const res = await (redeemHandler as any).POST({
          req,
          params: { id: couponId },
        })

        assertEquals(res.status, 400)
        const text = await res.text()
        assertEquals(text, 'User monthly limit reached')
      },
    )
  } finally {
    getSessionStub.restore()
    await kv.delete(['coupons', couponId])
    // Note: there are still redemptions in KV but they are hard to clean up without listing
  }
})

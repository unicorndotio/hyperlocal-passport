import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { stub } from 'https://deno.land/std@0.224.0/testing/mock.ts'
import { handler as catalogHandler } from '../routes/catalog.tsx'
import { handler as businessDetailHandler } from '../routes/business/[id].tsx'
import { handler as redemptionsHandler } from '../routes/api/users/me/redemptions.ts'
import { handler as redeemHandler } from '../routes/api/coupons/[id]/redeem.ts'
import { auth } from '../lib/auth.ts'
import { kv } from '../lib/kv.ts'

Deno.test('Mobile Catalog & Redemption Integration', async (t) => {
  const userId = 'user_' + Math.random().toString(36).slice(2)
  const businessId = 'biz_' + Math.random().toString(36).slice(2)
  const couponId = 'coupon_' + Math.random().toString(36).slice(2)

  // 1. Setup Data
  const business = {
    id: businessId,
    name: 'Test Shop',
    category: 'Alimentação',
    isActive: true,
  }
  const coupon = {
    id: couponId,
    businessId,
    title: '10% Off',
    isActive: true,
    globalClaimedCount: 0,
  }

  await kv.set(['businesses', businessId], business)
  await kv.set(['coupons', couponId], coupon)

  // 2. Stub Auth
  const getSessionStub = stub(auth.api, 'getSession', () => {
    return Promise.resolve({
      user: { id: userId, role: 'resident' },
      session: {
        id: 'sess_1',
        userId,
        expiresAt: new Date(Date.now() + 3600000),
      },
    } as unknown)
  })

  try {
    await t.step('Browse Catalog', async () => {
      const req = new Request('http://localhost:8000/catalog')
      const res = await (catalogHandler as unknown as {
        GET: (
          ctx: unknown,
        ) => Promise<{ businesses: { id: string; name: string }[] }>
      }).GET({
        req,
        render: (data: unknown) => data,
      })

      assertExists(res.businesses)
      assertEquals(res.businesses.length >= 1, true)
      const found = res.businesses.find((b: { id: string }) =>
        b.id === businessId
      )
      assertExists(found)
      assertEquals(found.name, 'Test Shop')
    })

    await t.step('View Business Detail', async () => {
      const req = new Request(`http://localhost:8000/business/${businessId}`)
      const res = await (businessDetailHandler as unknown as {
        GET: (
          ctx: unknown,
        ) => Promise<{ business: { id: string }; coupons: { id: string }[] }>
      }).GET({
        req,
        params: { id: businessId },
        render: (data: unknown) => data,
      })

      assertEquals(res.business.id, businessId)
      assertEquals(res.coupons.length, 1)
      assertEquals(res.coupons[0].id, couponId)
    })

    await t.step('Redeem Coupon', async () => {
      const req = new Request(
        `http://localhost:8000/api/coupons/${couponId}/redeem`,
        {
          method: 'POST',
        },
      )
      const res = await (redeemHandler as unknown as {
        POST: (ctx: unknown) => Promise<Response>
      }).POST({
        req,
        params: { id: couponId },
      })

      assertEquals(res.status, 201)
      const redemption = await res.json()
      assertExists(redemption.id)

      // Verify it appears in user's redemptions
      const req2 = new Request('http://localhost:8000/api/users/me/redemptions')
      const res2 = await (redemptionsHandler as unknown as {
        GET: (ctx: unknown) => Promise<Response>
      }).GET({ req: req2 })
      const redemptions = await res2.json()

      assertEquals(redemptions.length, 1)
      assertEquals(redemptions[0].id, redemption.id)
      assertEquals(redemptions[0].status, 'active')
    })
  } finally {
    getSessionStub.restore()
    await kv.delete(['businesses', businessId])
    await kv.delete(['coupons', couponId])
    // Cleanup redemptions
    const iter = kv.list({ prefix: ['user_redemptions', userId] })
    for await (const entry of iter) await kv.delete(entry.key)
    const iter2 = kv.list({ prefix: ['redemptions'] })
    for await (const entry of iter2) {
      const red = entry.value as { userId: string }
      if (red.userId === userId) await kv.delete(entry.key)
    }
  }
})

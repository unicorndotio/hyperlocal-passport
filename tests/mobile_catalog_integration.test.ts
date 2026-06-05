import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { stub } from 'https://deno.land/std@0.224.0/testing/mock.ts'
import { handler as catalogHandler } from '../routes/catalog.tsx'
import { auth } from '../lib/auth.ts'
import { kv } from '../lib/kv.ts'

Deno.test('Mobile Catalog Integration', async (t) => {
  const userId = 'user_cat_123'
  const businessId = 'biz_cat_123'
  const couponId = 'coupon_cat_123'

  // 1. Setup mock data
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
  const getSessionStub = stub(
    auth.api,
    'getSession',
    () => {
      return Promise.resolve({
        user: {
          id: userId,
          role: 'resident',
          email: 'cat@example.com',
          name: 'Cat User',
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
    await t.step('Browse Catalog', async () => {
      const req = new Request('http://localhost:8000/catalog')
      const res = await (catalogHandler as unknown as {
        GET: (ctx: { req: Request; url: URL }) => Promise<Response>
      }).GET({
        req,
        url: new URL(req.url),
      })

      assertEquals(res.status, 200)
      // Fresh 2.x renders to HTML, but we check if it doesn't 500
    })

    await t.step('Filter by Category', async () => {
      const req = new Request('http://localhost:8000/catalog?category=Lazer')
      const res = await (catalogHandler as unknown as {
        GET: (ctx: { req: Request; url: URL }) => Promise<Response>
      }).GET({
        req,
        url: new URL(req.url),
      })

      assertEquals(res.status, 200)
    })
  } finally {
    // 3. Cleanup
    getSessionStub.restore()
    await kv.delete(['businesses', businessId])
    await kv.delete(['coupons', couponId])
  }
})

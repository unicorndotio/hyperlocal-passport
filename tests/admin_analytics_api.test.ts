import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { handler as analyticsHandler } from '../routes/api/admin/analytics.ts'
import { applyMiddleware } from '../routes/_middleware.ts'
import { auth } from '../lib/auth.ts'
import { kv } from '../lib/kv.ts'
import { viewCountKey, redemptionCountKey, validationCountKey } from '../lib/analytics.ts'

function makeBusiness(id: string, name: string) {
  return {
    id,
    name,
    userId: 'owner-1',
    isActive: true,
    companyName: name,
    cnpj: '11222333000181',
    category: 'Test',
    description: 'Test business',
  }
}

function makeCoupon(
  id: string,
  businessId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    businessId,
    title: 'Test Coupon',
    behavior: { type: 'percentage_discount', percent: 10 },
    restrictions: {},
    isActive: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

Deno.test('Admin Analytics API - aggregate metrics', async (t) => {
  const biz1Id = 'ada_biz1_' + Math.random().toString(36).slice(2)
  const biz2Id = 'ada_biz2_' + Math.random().toString(36).slice(2)
  const cpn1Id = 'ada_cpn1_' + Math.random().toString(36).slice(2)
  const cpn2Id = 'ada_cpn2_' + Math.random().toString(36).slice(2)
  const cpn3Id = 'ada_cpn3_' + Math.random().toString(36).slice(2)
  const cpn4Id = 'ada_cpn4_' + Math.random().toString(36).slice(2)
  const now = Date.now()
  const txKeys = [
    ['business_transactions', biz1Id, now - 1000],
    ['business_transactions', biz1Id, now - 2000],
    ['business_transactions', biz2Id, now - 3000],
  ]

  try {
    await kv.set(['businesses', biz1Id], makeBusiness(biz1Id, 'Biz Alpha'))
    await kv.set(['businesses', biz2Id], makeBusiness(biz2Id, 'Biz Beta'))

    await kv.set(['coupons', cpn1Id], makeCoupon(cpn1Id, biz1Id, { title: 'Coupon A' }))
    await kv.set(['coupons', cpn2Id], makeCoupon(cpn2Id, biz1Id, { title: 'Coupon B' }))
    await kv.set(['coupons', cpn3Id], makeCoupon(cpn3Id, biz2Id, { title: 'Coupon C' }))
    await kv.set(['coupons', cpn4Id], makeCoupon(cpn4Id, biz2Id, { title: 'Coupon D' }))

    await kv.atomic().set(viewCountKey(cpn1Id), new Deno.KvU64(100n)).commit()
    await kv.set(redemptionCountKey(cpn1Id), 10)
    await kv.set(validationCountKey(cpn1Id), 8)

    await kv.atomic().set(viewCountKey(cpn2Id), new Deno.KvU64(50n)).commit()
    await kv.set(redemptionCountKey(cpn2Id), 5)
    await kv.set(validationCountKey(cpn2Id), 4)

    await kv.atomic().set(viewCountKey(cpn3Id), new Deno.KvU64(200n)).commit()
    await kv.set(redemptionCountKey(cpn3Id), 20)
    await kv.set(validationCountKey(cpn3Id), 15)

    await kv.atomic().set(viewCountKey(cpn4Id), new Deno.KvU64(30n)).commit()
    await kv.set(redemptionCountKey(cpn4Id), 3)
    await kv.set(validationCountKey(cpn4Id), 2)

    await kv.set(txKeys[0], {
      id: 'tx1',
      redemptionId: 'r1',
      couponId: cpn1Id,
      businessId: biz1Id,
      userId: 'u1',
      totalAmountCents: 1000,
      discountAppliedCents: 100,
      finalAmountCents: 900,
      timestamp: now - 1000,
    })
    await kv.set(txKeys[1], {
      id: 'tx2',
      redemptionId: 'r2',
      couponId: cpn2Id,
      businessId: biz1Id,
      userId: 'u2',
      totalAmountCents: 2000,
      discountAppliedCents: 200,
      finalAmountCents: 1800,
      timestamp: now - 2000,
    })
    await kv.set(txKeys[2], {
      id: 'tx3',
      redemptionId: 'r3',
      couponId: cpn3Id,
      businessId: biz2Id,
      userId: 'u3',
      totalAmountCents: 3000,
      discountAppliedCents: 300,
      finalAmountCents: 2700,
      timestamp: now - 3000,
    })

    await t.step('includes test-specific data in response', async () => {
      const req = new Request('http://localhost:8000/api/admin/analytics')
      const getHandler = analyticsHandler.GET as (
        ctx: { req: Request },
      ) => Promise<Response>
      const res = await getHandler({ req })
      assertEquals(res.status, 200)
      const data = await res.json()

      // KV has pre-existing data from other tests, so check shape and minimums
      assertEquals(typeof data.totalCoupons, 'number')
      assertEquals(typeof data.totalViews, 'number')
      assertEquals(typeof data.totalRedemptions, 'number')
      assertEquals(typeof data.totalValidations, 'number')
      assertEquals(typeof data.totalDiscountCents, 'number')
      assertEquals(data.totalCoupons >= 4, true, `Expected >=4 got ${data.totalCoupons}`)
      assertEquals(data.totalRedemptions >= 38, true)
      assertEquals(data.totalValidations >= 29, true)
      assertEquals(data.totalDiscountCents >= 600, true)
    })

    await t.step('returns test-specific businesses in perBusiness breakdown', async () => {
      const req = new Request('http://localhost:8000/api/admin/analytics')
      const getHandler = analyticsHandler.GET as (
        ctx: { req: Request },
      ) => Promise<Response>
      const res = await getHandler({ req })
      const data = await res.json()

      assertEquals(data.perBusiness.length >= 2, true)

      const bizAlpha = data.perBusiness.find(
        (b: { businessName: string }) => b.businessName === 'Biz Alpha',
      )
      assertEquals(bizAlpha !== undefined, true)
      assertEquals(bizAlpha.couponCount, 2)
      assertEquals(bizAlpha.totalViews, 150)
      assertEquals(bizAlpha.totalRedemptions, 15)
      assertEquals(bizAlpha.totalValidations, 12)

      const bizBeta = data.perBusiness.find(
        (b: { businessName: string }) => b.businessName === 'Biz Beta',
      )
      assertEquals(bizBeta !== undefined, true)
      assertEquals(bizBeta.couponCount, 2)
      assertEquals(bizBeta.totalViews, 230)
      assertEquals(bizBeta.totalRedemptions, 23)
      assertEquals(bizBeta.totalValidations, 17)
    })

    await t.step('perBusiness entries have correct shape', async () => {
      const req = new Request('http://localhost:8000/api/admin/analytics')
      const getHandler = analyticsHandler.GET as (
        ctx: { req: Request },
      ) => Promise<Response>
      const res = await getHandler({ req })
      const data = await res.json()

      for (const biz of data.perBusiness) {
        assertEquals(typeof biz.businessId, 'string')
        assertEquals(typeof biz.businessName, 'string')
        assertEquals(typeof biz.couponCount, 'number')
        assertEquals(typeof biz.totalViews, 'number')
        assertEquals(typeof biz.totalRedemptions, 'number')
        assertEquals(typeof biz.totalValidations, 'number')
      }
    })

    await t.step('response has all required top-level fields', async () => {
      const req = new Request('http://localhost:8000/api/admin/analytics')
      const getHandler = analyticsHandler.GET as (
        ctx: { req: Request },
      ) => Promise<Response>
      const res = await getHandler({ req })
      const data = await res.json()

      assertEquals(typeof data.totalCoupons, 'number')
      assertEquals(typeof data.totalViews, 'number')
      assertEquals(typeof data.totalRedemptions, 'number')
      assertEquals(typeof data.totalValidations, 'number')
      assertEquals(typeof data.totalDiscountCents, 'number')
      assertEquals(Array.isArray(data.perBusiness), true)
    })
  } finally {
    await kv.delete(['businesses', biz1Id])
    await kv.delete(['businesses', biz2Id])
    await kv.delete(['coupons', cpn1Id])
    await kv.delete(['coupons', cpn2Id])
    await kv.delete(['coupons', cpn3Id])
    await kv.delete(['coupons', cpn4Id])
    await kv.delete(viewCountKey(cpn1Id))
    await kv.delete(viewCountKey(cpn2Id))
    await kv.delete(viewCountKey(cpn3Id))
    await kv.delete(viewCountKey(cpn4Id))
    await kv.delete(redemptionCountKey(cpn1Id))
    await kv.delete(redemptionCountKey(cpn2Id))
    await kv.delete(redemptionCountKey(cpn3Id))
    await kv.delete(redemptionCountKey(cpn4Id))
    await kv.delete(validationCountKey(cpn1Id))
    await kv.delete(validationCountKey(cpn2Id))
    await kv.delete(validationCountKey(cpn3Id))
    await kv.delete(validationCountKey(cpn4Id))
    for (const key of txKeys) {
      await kv.delete(key)
    }
  }
})

Deno.test('Admin Analytics API - response shape with no test data', async (t) => {
  await t.step('returns expected response shape regardless of pre-existing data', async () => {
    const req = new Request('http://localhost:8000/api/admin/analytics')
    const getHandler = analyticsHandler.GET as (
      ctx: { req: Request },
    ) => Promise<Response>
    const res = await getHandler({ req })
    assertEquals(res.status, 200)
    const data = await res.json()

    assertEquals(typeof data.totalCoupons, 'number')
    assertEquals(typeof data.totalViews, 'number')
    assertEquals(typeof data.totalRedemptions, 'number')
    assertEquals(typeof data.totalValidations, 'number')
    assertEquals(typeof data.totalDiscountCents, 'number')
    assertEquals(Array.isArray(data.perBusiness), true)
    // Verify non-negative
    assertEquals(data.totalCoupons >= 0, true)
    assertEquals(data.totalViews >= 0, true)
    assertEquals(data.totalRedemptions >= 0, true)
    assertEquals(data.totalValidations >= 0, true)
    assertEquals(data.totalDiscountCents >= 0, true)
  })
})

Deno.test('Admin Analytics API - auth enforcement', async (t) => {
  const originalGetSession = auth.api.getSession

  const adminUrl = 'http://localhost:8000/api/admin/analytics'

  await t.step('unauthenticated request returns 401', async () => {
    ;(auth.api as unknown as { getSession: unknown }).getSession = () =>
      Promise.resolve(null)

    const req = new Request(adminUrl)
    const res = await applyMiddleware(
      req,
      () => Promise.resolve(new Response('OK')),
    )

    assertEquals(res.status, 401)
    const body = await res.json()
    assertEquals(body.error, 'Unauthorized')
  })

  await t.step('non-admin user returns 403', async () => {
    ;(auth.api as unknown as { getSession: unknown }).getSession = () =>
      Promise.resolve({
        session: {
          id: 's1',
          userId: 'u1',
          expiresAt: new Date(Date.now() + 100000),
          token: 't1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        user: {
          id: 'u1',
          email: 'resident@test.com',
          emailVerified: true,
          name: 'Resident',
          role: 'resident',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as unknown)

    const req = new Request(adminUrl)
    const res = await applyMiddleware(
      req,
      () => Promise.resolve(new Response('OK')),
    )

    assertEquals(res.status, 403)
    const body = await res.json()
    assertEquals(body.error, 'Forbidden: Admin access required')
  })

  await t.step('admin user passes middleware', async () => {
    ;(auth.api as unknown as { getSession: unknown }).getSession = () =>
      Promise.resolve({
        session: {
          id: 's3',
          userId: 'u3',
          expiresAt: new Date(Date.now() + 100000),
          token: 't3',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        user: {
          id: 'u3',
          email: 'admin@test.com',
          emailVerified: true,
          name: 'Admin',
          role: 'admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as unknown)

    const req = new Request(adminUrl)
    const res = await applyMiddleware(
      req,
      () => Promise.resolve(new Response('OK')),
    )

    assertEquals(res.status, 200)
    assertEquals(await res.text(), 'OK')
  })

  auth.api.getSession = originalGetSession
})

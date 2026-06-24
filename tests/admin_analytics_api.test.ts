import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { handler as analyticsHandler } from '../routes/api/admin/analytics.ts'
import { applyMiddleware } from '../routes/_middleware.ts'
import { auth } from '../lib/auth.ts'
import { db } from '../lib/db.ts'
import * as schema from '../db/schema.ts'
import { sql } from 'drizzle-orm'

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
    logoUrl: 'http://localhost/logo.png',
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
    createdAt: new Date(),
    ...overrides,
  }
}

Deno.test({
  name: 'Admin Analytics API - aggregate metrics',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    const biz1Id = 'ada_biz1_' + Math.random().toString(36).slice(2)
    const biz2Id = 'ada_biz2_' + Math.random().toString(36).slice(2)
    const cpn1Id = 'ada_cpn1_' + Math.random().toString(36).slice(2)
    const cpn2Id = 'ada_cpn2_' + Math.random().toString(36).slice(2)
    const cpn3Id = 'ada_cpn3_' + Math.random().toString(36).slice(2)
    const cpn4Id = 'ada_cpn4_' + Math.random().toString(36).slice(2)
    const userId = 'ana-user-' + crypto.randomUUID()

    try {
      // Create test user
      await db.insert(schema.users).values({
        id: userId,
        email: `ana-${userId}@test.com`,
        name: 'Ana User',
        role: 'admin',
        emailVerified: true,
      })

      // Insert businesses
      await db.insert(schema.businesses).values([
        makeBusiness(biz1Id, 'Biz Alpha'),
        makeBusiness(biz2Id, 'Biz Beta'),
      ])

      // Insert coupons
      await db.insert(schema.coupons).values([
        makeCoupon(cpn1Id, biz1Id, { title: 'Coupon A' }),
        makeCoupon(cpn2Id, biz1Id, { title: 'Coupon B' }),
        makeCoupon(cpn3Id, biz2Id, { title: 'Coupon C' }),
        makeCoupon(cpn4Id, biz2Id, { title: 'Coupon D' }),
      ])

      // Insert analytics
      await db.insert(schema.couponAnalytics).values([
        {
          id: crypto.randomUUID(),
          couponId: cpn1Id,
          views: 100,
          redemptions: 10,
          validations: 8,
        },
        {
          id: crypto.randomUUID(),
          couponId: cpn2Id,
          views: 50,
          redemptions: 5,
          validations: 4,
        },
        {
          id: crypto.randomUUID(),
          couponId: cpn3Id,
          views: 200,
          redemptions: 20,
          validations: 15,
        },
        {
          id: crypto.randomUUID(),
          couponId: cpn4Id,
          views: 30,
          redemptions: 3,
          validations: 2,
        },
      ])

      // Insert transactions for discount calculation
      const now = Date.now()
      await db.insert(schema.transactions).values([
        {
          id: 'tx1',
          redemptionId: 'r1',
          couponId: cpn1Id,
          businessId: biz1Id,
          userId,
          totalAmountCents: 1000,
          discountAppliedCents: 100,
          finalAmountCents: 900,
          timestamp: new Date(now - 1000),
        },
        {
          id: 'tx2',
          redemptionId: 'r2',
          couponId: cpn2Id,
          businessId: biz1Id,
          userId,
          totalAmountCents: 2000,
          discountAppliedCents: 200,
          finalAmountCents: 1800,
          timestamp: new Date(now - 2000),
        },
        {
          id: 'tx3',
          redemptionId: 'r3',
          couponId: cpn3Id,
          businessId: biz2Id,
          userId,
          totalAmountCents: 3000,
          discountAppliedCents: 300,
          finalAmountCents: 2700,
          timestamp: new Date(now - 3000),
        },
      ] as typeof schema.transactions.$inferInsert[])

      await t.step('includes test-specific data in response', async () => {
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
        assertEquals(data.totalCoupons, 4)
        assertEquals(data.totalRedemptions, 38)
        assertEquals(data.totalValidations, 29)
        assertEquals(data.totalDiscountCents, 600)
      })

      await t.step(
        'returns test-specific businesses in perBusiness breakdown',
        async () => {
          const req = new Request('http://localhost:8000/api/admin/analytics')
          const getHandler = analyticsHandler.GET as (
            ctx: { req: Request },
          ) => Promise<Response>
          const res = await getHandler({ req })
          const data = await res.json()

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
        },
      )

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
      await db.delete(schema.transactions)
      await db.delete(schema.couponAnalytics)
      await db.delete(schema.coupons)
      await db.delete(schema.businesses)
      await db.delete(schema.users)
      // Reset sequences if needed
    }
  },
})

Deno.test({
  name: 'Admin Analytics API - response shape with no test data',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    await t.step('returns expected response shape', async () => {
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
      assertEquals(data.totalCoupons >= 0, true)
      assertEquals(data.totalViews >= 0, true)
      assertEquals(data.totalRedemptions >= 0, true)
      assertEquals(data.totalValidations >= 0, true)
      assertEquals(data.totalDiscountCents >= 0, true)
    })
  },
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

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { stub } from 'https://deno.land/std@0.224.0/testing/mock.ts'
import { handler as redemptionsHandler } from '../routes/api/users/me/redemptions.ts'
import { auth } from '../lib/auth.ts'
import { db } from '../lib/db.ts'
import * as schema from '../db/schema.ts'
import { eq } from 'drizzle-orm'

Deno.test({
  name: 'User Redemptions API',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    const userId = 'user_' + Math.random().toString(36).slice(2)
    const businessId = 'biz_' + Math.random().toString(36).slice(2)

    // Create prerequisites for FK constraints
    await db.insert(schema.users).values({
      id: userId,
      email: `${userId}@test.com`,
      name: 'Test User',
    }).onConflictDoNothing({ target: schema.users.id })

    await db.insert(schema.businesses).values({
      id: businessId,
      userId,
      name: 'Test Business',
      companyName: 'Test Business Ltd',
      cnpj: Date.now().toString(36).slice(-6) +
        Math.random().toString(36).slice(2, 10),
      category: 'Test',
      logoUrl: 'http://localhost/logo.png',
      isActive: true,
    }).onConflictDoNothing({ target: schema.businesses.id })

    // Create coupons for redemption FK
    const coupon1Id = 'c1_' + Math.random().toString(36).slice(2)
    const coupon2Id = 'c2_' + Math.random().toString(36).slice(2)

    await db.insert(schema.coupons).values({
      id: coupon1Id,
      businessId,
      title: 'Coupon 1',
      behavior: { type: 'percentage_discount', percent: 10 },
      restrictions: {},
      isActive: true,
    })

    await db.insert(schema.coupons).values({
      id: coupon2Id,
      businessId,
      title: 'Coupon 2',
      behavior: { type: 'percentage_discount', percent: 20 },
      restrictions: {},
      isActive: true,
    })

    // Stub auth.api.getSession
    const getSessionStub = stub(
      auth.api,
      'getSession',
      (() => {
        return Promise.resolve({
          user: {
            id: userId,
            role: 'resident',
            email: `${userId}@test.com`,
            emailVerified: true,
            name: 'Test User',
            createdAt: new Date(),
            updatedAt: new Date(),
          } satisfies typeof auth.$Infer.Session['user'],
          session: {
            id: 'sess_1',
            userId,
            expiresAt: new Date(Date.now() + 3600000),
            token: 'token_1',
            createdAt: new Date(),
            updatedAt: new Date(),
          } satisfies typeof auth.$Infer.Session['session'],
        })
      }) as (...args: unknown[]) => ReturnType<typeof auth.api.getSession>,
    )

    try {
      await t.step('GET /api/users/me/redemptions - Empty', async () => {
        const req = new Request(
          `http://localhost:8000/api/users/me/redemptions`,
          { method: 'GET' },
        )
        const res = await (redemptionsHandler as unknown as {
          GET: (ctx: unknown) => Promise<Response>
        }).GET({ req })

        assertEquals(res.status, 200)
        const body = await res.json()
        assertEquals(Array.isArray(body), true)
        assertEquals(body.length, 0)
      })

      await t.step('GET /api/users/me/redemptions - Success', async () => {
        const now = new Date()
        const r1Id = 'CODE1_' + Math.random().toString(36).slice(2)

        await db.insert(schema.redemptions).values({
          id: r1Id,
          couponId: coupon1Id,
          businessId,
          userId,
          status: 'active',
          redeemedAt: now,
        })

        const r2Id = 'CODE2_' + Math.random().toString(36).slice(2)
        const earlier = new Date(now.getTime() - 1000)
        await db.insert(schema.redemptions).values({
          id: r2Id,
          couponId: coupon2Id,
          businessId,
          userId,
          status: 'used',
          redeemedAt: earlier,
        })

        const req = new Request(
          `http://localhost:8000/api/users/me/redemptions`,
          { method: 'GET' },
        )
        const res = await (redemptionsHandler as unknown as {
          GET: (ctx: unknown) => Promise<Response>
        }).GET({ req })

        assertEquals(res.status, 200)
        const body = await res.json()
        assertEquals(
          body.length,
          1,
          'Only active redemption should be returned',
        )
        assertEquals(body[0].id, r1Id)
        assertEquals(body[0].status, 'active')
        assertEquals(body[0].couponId, coupon1Id)
        assertEquals(body[0].businessId, businessId)
        assertEquals(body[0].userId, userId)
        assertEquals(
          typeof body[0].redeemedAt,
          'number',
          'redeemedAt should be a timestamp number',
        )
      })

      await t.step('GET /api/users/me/redemptions - Unauthorized', async () => {
        getSessionStub.restore()
        stub(auth.api, 'getSession', () => Promise.resolve(null))

        const req = new Request(
          `http://localhost:8000/api/users/me/redemptions`,
          { method: 'GET' },
        )
        const res = await (redemptionsHandler as unknown as {
          GET: (ctx: unknown) => Promise<Response>
        }).GET({ req })

        assertEquals(res.status, 401)
      })
    } finally {
      await db.delete(schema.redemptions).where(
        eq(schema.redemptions.userId, userId),
      )
      await db.delete(schema.coupons).where(eq(schema.coupons.id, coupon1Id))
      await db.delete(schema.coupons).where(eq(schema.coupons.id, coupon2Id))
      await db.delete(schema.businesses).where(
        eq(schema.businesses.id, businessId),
      )
    }
  },
})

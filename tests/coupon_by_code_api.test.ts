import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { stub } from 'https://deno.land/std@0.224.0/testing/mock.ts'
import { db } from '../lib/db.ts'
import * as schema from '../db/schema.ts'
import { eq } from 'drizzle-orm'
import { handler as couponByCodeHandler } from '../routes/api/coupon-by-code/[code].ts'
import { auth } from '../lib/auth.ts'

type CouponByCodeCtx = { req: Request; params: Record<string, string> }
type CouponByCodeHandler = {
  GET: (ctx: CouponByCodeCtx) => Promise<Response>
}

async function ensureUser(userId: string) {
  await db.insert(schema.users).values({
    id: userId,
    email: `${userId}@test.com`,
    name: 'Test User',
  }).onConflictDoNothing({ target: schema.users.id })
}

async function ensureBusiness(businessId: string, userId: string) {
  const cnpj = Date.now().toString(36).slice(-6) +
    Math.random().toString(36).slice(2, 10)
  await db.insert(schema.businesses).values({
    id: businessId,
    userId,
    name: 'Test Shop',
    companyName: 'Test Shop LTDA',
    cnpj,
    category: 'Food',
    logoUrl: '/logo.png',
    isActive: true,
  }).onConflictDoNothing({ target: schema.businesses.id })
}

async function createCoupon(
  couponId: string,
  businessId: string,
  overrides: Record<string, unknown> = {},
) {
  const coupon: Record<string, unknown> = {
    id: couponId,
    businessId,
    title: '15% OFF',
    behavior: { type: 'percentage_discount', percent: 15 },
    restrictions: {},
    isActive: true,
    ...overrides,
  }
  // deno-lint-ignore no-explicit-any
  await db.insert(schema.coupons).values(coupon as any)
}

async function createRedemption(
  code: string,
  couponId: string,
  businessId: string,
  userId: string,
  overrides: Record<string, unknown> = {},
) {
  const redemption: Record<string, unknown> = {
    id: code,
    couponId,
    businessId,
    userId,
    status: 'active',
    ...overrides,
  }
  // deno-lint-ignore no-explicit-any
  await db.insert(schema.redemptions).values(redemption as any)
}

async function cleanup(businessIds: string[], userIds: string[]) {
  for (const userId of userIds) {
    await db.delete(schema.transactions)
      .where(eq(schema.transactions.userId, userId))
    await db.delete(schema.redemptions)
      .where(eq(schema.redemptions.userId, userId))
  }
  for (const businessId of businessIds) {
    await db.delete(schema.transactions)
      .where(eq(schema.transactions.businessId, businessId))
    await db.delete(schema.redemptions)
      .where(eq(schema.redemptions.businessId, businessId))
    await db.delete(schema.coupons)
      .where(eq(schema.coupons.businessId, businessId))
  }
  for (const businessId of businessIds) {
    await db.delete(schema.businesses)
      .where(eq(schema.businesses.id, businessId))
  }
  for (const userId of userIds) {
    await db.delete(schema.users)
      .where(eq(schema.users.id, userId))
  }
}

Deno.test({
  name: 'Coupon By Code API - Business Ownership Check',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    const bizUserId1 = 'bizuser_cbc_' + Math.random().toString(36).slice(2)
    const bizUserId2 = 'bizuser_cbc2_' + Math.random().toString(36).slice(2)
    const residentUserId = 'resident_cbc_' + Math.random().toString(36).slice(2)
    const adminUserId = 'admin_cbc_' + Math.random().toString(36).slice(2)
    const businessId1 = 'biz_cbc_' + Math.random().toString(36).slice(2)
    const businessId2 = 'biz_cbc2_' + Math.random().toString(36).slice(2)
    const couponId1 = 'coupon_cbc_' + Math.random().toString(36).slice(2)
    const couponId2 = 'coupon_cbc2_' + Math.random().toString(36).slice(2)
    const code1 = 'CBC_' + Math.random().toString(36).slice(2, 8).toUpperCase()
    const code2 = 'CBC2_' + Math.random().toString(36).slice(2, 8).toUpperCase()

    // Setup: two businesses with their own coupons and redemptions
    await ensureUser(bizUserId1)
    await ensureUser(bizUserId2)
    await ensureUser(residentUserId)
    await ensureUser(adminUserId)
    await ensureBusiness(businessId1, bizUserId1)
    await ensureBusiness(businessId2, bizUserId2)
    await createCoupon(couponId1, businessId1)
    await createCoupon(couponId2, businessId2)
    await createRedemption(code1, couponId1, businessId1, residentUserId)
    await createRedemption(code2, couponId2, businessId2, residentUserId)

    const getSessionStub = stub(
      auth.api,
      'getSession',
      ((..._args: unknown[]) => {
        if (noSession) return Promise.resolve(null)
        return Promise.resolve({
          user: {
            id: currentUserId,
            role: currentRole,
            email: `${currentRole}@example.com`,
            emailVerified: true,
            name: currentRole,
            createdAt: new Date(),
            updatedAt: new Date(),
          } satisfies typeof auth.$Infer.Session['user'],
          session: {
            id: 'sess_' + currentUserId,
            userId: currentUserId,
            expiresAt: new Date(Date.now() + 3600000),
            token: 'token_' + currentUserId,
            createdAt: new Date(),
            updatedAt: new Date(),
          } satisfies typeof auth.$Infer.Session['session'],
        })
      }) as (...args: unknown[]) => ReturnType<typeof auth.api.getSession>,
    )

    let currentUserId = bizUserId1
    let currentRole = 'business'
    let noSession = false

    try {
      await t.step('Business can look up own redemption code', async () => {
        currentUserId = bizUserId1
        currentRole = 'business'
        const req = new Request(
          `http://localhost:8000/api/coupon-by-code/${code1}`,
        )
        const res = await (couponByCodeHandler as CouponByCodeHandler).GET({
          req,
          params: { code: code1 },
        })
        assertEquals(res.status, 200)
        const body = await res.json()
        assertEquals(body.couponId, couponId1)
        assertEquals(body.businessId, businessId1)
      })

      await t.step(
        'Business gets 403 for another business redemption code',
        async () => {
          currentUserId = bizUserId1
          currentRole = 'business'
          const req = new Request(
            `http://localhost:8000/api/coupon-by-code/${code2}`,
          )
          const res = await (couponByCodeHandler as CouponByCodeHandler).GET({
            req,
            params: { code: code2 },
          })
          assertEquals(res.status, 403)
          const text = await res.text()
          assertEquals(text, 'Forbidden: Code belongs to another business')
        },
      )

      await t.step('Admin can look up any redemption code', async () => {
        currentUserId = adminUserId
        currentRole = 'admin'
        const req = new Request(
          `http://localhost:8000/api/coupon-by-code/${code2}`,
        )
        const res = await (couponByCodeHandler as CouponByCodeHandler).GET({
          req,
          params: { code: code2 },
        })
        assertEquals(res.status, 200)
        const body = await res.json()
        assertEquals(body.couponId, couponId2)
        assertEquals(body.businessId, businessId2)
      })

      await t.step(
        'Admin can look up first business code as well',
        async () => {
          currentUserId = adminUserId
          currentRole = 'admin'
          const req = new Request(
            `http://localhost:8000/api/coupon-by-code/${code1}`,
          )
          const res = await (couponByCodeHandler as CouponByCodeHandler).GET({
            req,
            params: { code: code1 },
          })
          assertEquals(res.status, 200)
        },
      )

      await t.step('Resident gets 403', async () => {
        currentUserId = residentUserId
        currentRole = 'resident'
        const req = new Request(
          `http://localhost:8000/api/coupon-by-code/${code1}`,
        )
        const res = await (couponByCodeHandler as CouponByCodeHandler).GET({
          req,
          params: { code: code1 },
        })
        assertEquals(res.status, 403)
      })

      await t.step('Unauthenticated gets 401', async () => {
        noSession = true
        const req = new Request(
          `http://localhost:8000/api/coupon-by-code/${code1}`,
        )
        const res = await (couponByCodeHandler as CouponByCodeHandler).GET({
          req,
          params: { code: code1 },
        })
        assertEquals(res.status, 401)
        noSession = false
      })

      await t.step('Non-existent code returns 404', async () => {
        currentUserId = bizUserId1
        currentRole = 'business'
        const req = new Request(
          'http://localhost:8000/api/coupon-by-code/NONEXISTENT',
        )
        const res = await (couponByCodeHandler as CouponByCodeHandler).GET({
          req,
          params: { code: 'NONEXISTENT' },
        })
        assertEquals(res.status, 404)
        const text = await res.text()
        assertEquals(text, 'Redemption code not found')
      })

      await t.step(
        'Business user without business profile gets 404',
        async () => {
          const orphanUserId = 'orphan_cbc_' +
            Math.random().toString(36).slice(2)
          await ensureUser(orphanUserId)
          currentUserId = orphanUserId
          currentRole = 'business'
          const req = new Request(
            `http://localhost:8000/api/coupon-by-code/${code1}`,
          )
          const res = await (couponByCodeHandler as CouponByCodeHandler).GET({
            req,
            params: { code: code1 },
          })
          assertEquals(res.status, 404)
          const text = await res.text()
          assertEquals(text, 'Business profile not found')
          await db.delete(schema.users)
            .where(eq(schema.users.id, orphanUserId))
        },
      )
    } finally {
      getSessionStub.restore()
      await cleanup(
        [businessId1, businessId2],
        [bizUserId1, bizUserId2, residentUserId, adminUserId],
      )
    }
  },
})

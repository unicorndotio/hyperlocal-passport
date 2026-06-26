import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { stub } from 'https://deno.land/std@0.224.0/testing/mock.ts'
import { db } from '../lib/db.ts'
import * as schema from '../db/schema.ts'
import { eq } from 'drizzle-orm'
import { handler as validateHandler } from '../routes/api/transactions/validate.ts'
import { auth } from '../lib/auth.ts'

function resolveSession(userId: string, role: string) {
  return Promise.resolve({
    user: {
      id: userId,
      role,
      email: `${role}@example.com`,
      emailVerified: true,
      name: role,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    session: {
      id: 'sess_' + userId,
      userId,
      expiresAt: new Date(Date.now() + 3600000),
      token: 'token_' + userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
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
  await db.insert(schema.redemptions).values(redemption as any)
}

async function cleanup(couponId: string, userId: string) {
  await db.delete(schema.transactions)
    .where(eq(schema.transactions.couponId, couponId))
  await db.delete(schema.redemptions)
    .where(eq(schema.redemptions.couponId, couponId))
  await db.delete(schema.couponAnalytics)
    .where(eq(schema.couponAnalytics.couponId, couponId))
  await db.delete(schema.coupons)
    .where(eq(schema.coupons.id, couponId))
  await db.delete(schema.businesses)
    .where(eq(schema.businesses.userId, userId))
  await db.delete(schema.users)
    .where(eq(schema.users.id, userId))
}

Deno.test({
  name: 'Checkout Validation API',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    const userId = 'user_' + Math.random().toString(36).slice(2)
    const businessUserId = 'bizuser_' + Math.random().toString(36).slice(2)
    const businessId = 'biz_' + Math.random().toString(36).slice(2)
    const couponId = 'coupon_' + Math.random().toString(36).slice(2)
    const code = 'TESTV' + Math.random().toString(36).slice(2, 5).toUpperCase()

    // Setup: create FK chain user -> business -> coupon -> redemption
    await ensureUser(businessUserId)
    await ensureUser(userId)
    await ensureBusiness(businessId, businessUserId)
    await createCoupon(couponId, businessId)
    await createRedemption(code, couponId, businessId, userId)

    // Stub auth.api.getSession
    let currentRole = 'business'
    let currentUserId = businessUserId
    const getSessionStub = stub(
      auth.api,
      'getSession',
      (() => {
        return Promise.resolve({
          user: {
            id: currentUserId,
            role: currentRole,
            email: 'business@example.com',
            emailVerified: true,
            name: 'Business User',
            createdAt: new Date(),
            updatedAt: new Date(),
          } satisfies typeof auth.$Infer.Session['user'],
          session: {
            id: 'sess_1',
            userId: currentUserId,
            expiresAt: new Date(Date.now() + 3600000),
            token: 'token_biz',
            createdAt: new Date(),
            updatedAt: new Date(),
          } satisfies typeof auth.$Infer.Session['session'],
        })
      }) as (...args: unknown[]) => ReturnType<typeof auth.api.getSession>,
    )

    try {
      await t.step('POST /api/transactions/validate - Success', async () => {
        const amountCents = 10000
        const req = new Request(
          'http://localhost:8000/api/transactions/validate',
          {
            method: 'POST',
            body: JSON.stringify({ code, amountCents }),
          },
        )
        const res = await (validateHandler as unknown as {
          POST: (ctx: unknown) => Promise<Response>
        }).POST({ req })

        assertEquals(res.status, 200)
        const body = await res.json()

        const { transaction, redemption: updatedRedemption } = body
        assertEquals(updatedRedemption.status, 'used')
        assertEquals(transaction.totalAmountCents, 10000)
        assertEquals(transaction.discountAppliedCents, 1500)
        assertEquals(transaction.finalAmountCents, 8500)
        assertEquals(transaction.businessId, businessId)

        // Verify DB
        const [dbRedemption] = await db.select().from(schema.redemptions)
          .where(eq(schema.redemptions.id, code))
        assertEquals(dbRedemption.status, 'used')

        const [dbTransaction] = await db.select().from(schema.transactions)
          .where(eq(schema.transactions.id, transaction.id))
        assertExists(dbTransaction)
      })

      await t.step(
        'POST /api/transactions/validate - Already Used',
        async () => {
          const amountCents = 10000
          const req = new Request(
            'http://localhost:8000/api/transactions/validate',
            {
              method: 'POST',
              body: JSON.stringify({ code, amountCents }),
            },
          )
          const res = await (validateHandler as unknown as {
            POST: (ctx: unknown) => Promise<Response>
          }).POST({ req })

          assertEquals(res.status, 400)
          const text = await res.text()
          assertEquals(text, 'Redemption is already used')
        },
      )

      await t.step(
        'POST /api/transactions/validate - Wrong Business',
        async () => {
          const otherBizUserId = 'user_other_' +
            Math.random().toString(36).slice(2)
          const otherBizId = 'biz_other_' + Math.random().toString(36).slice(2)

          await ensureUser(otherBizUserId)
          await ensureBusiness(otherBizId, otherBizUserId)

          const newCode = 'OTHER1'
          await createRedemption(newCode, couponId, otherBizId, userId)

          const req = new Request(
            'http://localhost:8000/api/transactions/validate',
            {
              method: 'POST',
              body: JSON.stringify({ code: newCode, amountCents: 5000 }),
            },
          )
          const res = await (validateHandler as unknown as {
            POST: (ctx: unknown) => Promise<Response>
          }).POST({ req })

          assertEquals(res.status, 403)
          const text = await res.text()
          assertEquals(text, 'Redemption code belongs to another business')

          await db.delete(schema.redemptions)
            .where(eq(schema.redemptions.id, newCode))
          await db.delete(schema.businesses)
            .where(eq(schema.businesses.id, otherBizId))
          await db.delete(schema.users)
            .where(eq(schema.users.id, otherBizUserId))
        },
      )

      await t.step(
        'POST /api/transactions/validate - Expired Coupon',
        async () => {
          const expCode = 'EXPIRED_' + Math.random().toString(36).slice(2)
          const expCouponId = 'coupon_exp_' +
            Math.random().toString(36).slice(2)

          await createCoupon(expCouponId, businessId, {
            restrictions: { validUntil: Date.now() - 10000 },
          })
          await createRedemption(expCode, expCouponId, businessId, userId)

          const req = new Request(
            'http://localhost:8000/api/transactions/validate',
            {
              method: 'POST',
              body: JSON.stringify({ code: expCode, amountCents: 5000 }),
            },
          )
          const res = await (validateHandler as unknown as {
            POST: (ctx: unknown) => Promise<Response>
          }).POST({ req })

          assertEquals(res.status, 400)
          const text = await res.text()
          assertEquals(text, 'Coupon has expired')

          await db.delete(schema.redemptions)
            .where(eq(schema.redemptions.id, expCode))
          await db.delete(schema.couponAnalytics)
            .where(eq(schema.couponAnalytics.couponId, expCouponId))
          await db.delete(schema.coupons)
            .where(eq(schema.coupons.id, expCouponId))
        },
      )

      await t.step(
        'POST /api/transactions/validate - Unauthorized Role',
        async () => {
          currentRole = 'resident'
          const req = new Request(
            'http://localhost:8000/api/transactions/validate',
            {
              method: 'POST',
              body: JSON.stringify({ code, amountCents: 5000 }),
            },
          )
          const res = await (validateHandler as unknown as {
            POST: (ctx: unknown) => Promise<Response>
          }).POST({ req })

          assertEquals(res.status, 403)
        },
      )

      await t.step(
        'POST /api/transactions/validate - Missing body fields',
        async () => {
          currentRole = 'business'
          const req = new Request(
            'http://localhost:8000/api/transactions/validate',
            {
              method: 'POST',
              body: JSON.stringify({ amountCents: 100 }),
            },
          )
          const res = await (validateHandler as unknown as {
            POST: (ctx: unknown) => Promise<Response>
          }).POST({ req })
          assertEquals(res.status, 400)
          assertEquals(await res.text(), 'Missing redemption code')

          // Test missing amountCents
          const knownCode = 'AMTCNT'
          await createRedemption(knownCode, couponId, businessId, userId)

          const req2 = new Request(
            'http://localhost:8000/api/transactions/validate',
            {
              method: 'POST',
              body: JSON.stringify({ code: knownCode }),
            },
          )
          const res2 = await (validateHandler as unknown as {
            POST: (ctx: unknown) => Promise<Response>
          }).POST({ req: req2 })
          assertEquals(res2.status, 400)
          assertEquals(
            await res2.text(),
            'Invalid amountCents: must be a positive number',
          )

          await db.delete(schema.redemptions)
            .where(eq(schema.redemptions.id, knownCode))
        },
      )

      await t.step(
        'POST /api/transactions/validate - Invalid JSON',
        async () => {
          const req = new Request(
            'http://localhost:8000/api/transactions/validate',
            {
              method: 'POST',
              body: 'not json',
            },
          )
          const res = await (validateHandler as unknown as {
            POST: (ctx: unknown) => Promise<Response>
          }).POST({ req })
          assertEquals(res.status, 400)
          assertEquals(await res.text(), 'Invalid JSON body')
        },
      )

      await t.step(
        'POST /api/transactions/validate - Redemption Not Found',
        async () => {
          const req = new Request(
            'http://localhost:8000/api/transactions/validate',
            {
              method: 'POST',
              body: JSON.stringify({ code: 'MISSING_CODE', amountCents: 100 }),
            },
          )
          const res = await (validateHandler as unknown as {
            POST: (ctx: unknown) => Promise<Response>
          }).POST({ req })
          assertEquals(res.status, 404)
          assertEquals(await res.text(), 'Redemption code not found')
        },
      )

      await t.step(
        'POST /api/transactions/validate - Business Not Found',
        async () => {
          currentUserId = 'user_without_biz'
          const req = new Request(
            'http://localhost:8000/api/transactions/validate',
            {
              method: 'POST',
              body: JSON.stringify({ code, amountCents: 100 }),
            },
          )
          const res = await (validateHandler as unknown as {
            POST: (ctx: unknown) => Promise<Response>
          }).POST({ req })
          assertEquals(res.status, 404)
          assertEquals(
            await res.text(),
            'Business profile not found for this user',
          )
          currentUserId = businessUserId
        },
      )

      await t.step(
        'POST /api/transactions/validate - Admin without business profile succeeds',
        async () => {
          currentRole = 'admin'
          currentUserId = 'admin_' + Math.random().toString(36).slice(2)

          const adminCode = 'ADMIN_' +
            Math.random().toString(36).slice(2, 8).toUpperCase()
          await createRedemption(
            adminCode,
            couponId,
            businessId,
            userId,
          )

          const req = new Request(
            'http://localhost:8000/api/transactions/validate',
            {
              method: 'POST',
              body: JSON.stringify({ code: adminCode, amountCents: 10000 }),
            },
          )
          const res = await (validateHandler as unknown as {
            POST: (ctx: unknown) => Promise<Response>
          }).POST({ req })

          assertEquals(res.status, 200)
          const body = await res.json()
          assertEquals(body.transaction.businessId, businessId)

          // reset
          currentRole = 'business'
          currentUserId = businessUserId
        },
      )

      await t.step(
        'POST /api/transactions/validate - Coupon Inactive',
        async () => {
          const inactCode = 'INACTIVE'
          const inactCouponId = 'coupon_inact'

          await createCoupon(inactCouponId, businessId, { isActive: false })
          await createRedemption(inactCode, inactCouponId, businessId, userId)

          const req = new Request(
            'http://localhost:8000/api/transactions/validate',
            {
              method: 'POST',
              body: JSON.stringify({ code: inactCode, amountCents: 5000 }),
            },
          )
          const res = await (validateHandler as unknown as {
            POST: (ctx: unknown) => Promise<Response>
          }).POST({ req })

          assertEquals(res.status, 400)
          assertEquals(await res.text(), 'Coupon is not active')

          await db.delete(schema.redemptions)
            .where(eq(schema.redemptions.id, inactCode))
          await db.delete(schema.couponAnalytics)
            .where(eq(schema.couponAnalytics.couponId, inactCouponId))
          await db.delete(schema.coupons)
            .where(eq(schema.coupons.id, inactCouponId))
        },
      )
    } finally {
      getSessionStub.restore()
      await cleanup(couponId, businessUserId)
    }
  },
})

Deno.test({
  name: 'Checkout Validation API - Multi-Behavior Dispatch',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    const businessUserId = 'bizuser_mbd_' + Math.random().toString(36).slice(2)
    const businessId = 'biz_mbd_' + Math.random().toString(36).slice(2)

    await ensureUser(businessUserId)
    await ensureBusiness(businessId, businessUserId)

    let currentRole = 'business'
    let currentUserId = businessUserId
    const getSessionStub = stub(
      auth.api,
      'getSession',
      (() => {
        return Promise.resolve({
          user: {
            id: currentUserId,
            role: currentRole,
            email: 'business@example.com',
            emailVerified: true,
            name: 'Business User',
            createdAt: new Date(),
            updatedAt: new Date(),
          } satisfies typeof auth.$Infer.Session['user'],
          session: {
            id: 'sess_mbd_1',
            userId: currentUserId,
            expiresAt: new Date(Date.now() + 3600000),
            token: 'token_mbd',
            createdAt: new Date(),
            updatedAt: new Date(),
          } satisfies typeof auth.$Infer.Session['session'],
        })
      }) as (...args: unknown[]) => ReturnType<typeof auth.api.getSession>,
    )

    const createdIds: {
      coupons: string[]
      redemptions: string[]
      users: string[]
    } = {
      coupons: [],
      redemptions: [],
      users: [],
    }

    function makeCouponId(): string {
      const id = 'c_' + Math.random().toString(36).slice(2)
      createdIds.coupons.push(id)
      return id
    }

    async function makeRedemption(
      couponId: string,
    ): Promise<{ code: string }> {
      const code = 'MBD_' + Math.random().toString(36).slice(2, 8).toUpperCase()
      const userId = 'user_mbd_' + Math.random().toString(36).slice(2)
      await ensureUser(userId)
      createdIds.users.push(userId)
      await createRedemption(code, couponId, businessId, userId)
      createdIds.redemptions.push(code)
      return { code }
    }

    async function setupCouponAndRedemption(
      couponOverrides: Record<string, unknown> = {},
    ): Promise<{ couponId: string; code: string }> {
      const couponId = makeCouponId()
      await createCoupon(couponId, businessId, couponOverrides)
      const { code } = await makeRedemption(couponId)
      return { couponId, code }
    }

    async function validateRequest(
      code: string,
      body: Record<string, unknown>,
    ): Promise<Response> {
      const req = new Request(
        'http://localhost:8000/api/transactions/validate',
        {
          method: 'POST',
          body: JSON.stringify({ code, ...body }),
        },
      )
      return await (validateHandler as unknown as {
        POST: (ctx: unknown) => Promise<Response>
      }).POST({ req })
    }

    try {
      await t.step(
        'fixed_amount validation - discount capped at amountCents',
        async () => {
          const { code } = await setupCouponAndRedemption({
            behavior: { type: 'fixed_amount', amountCents: 500 },
          })
          const res = await validateRequest(code, { amountCents: 10000 })
          assertEquals(res.status, 200)
          const body = await res.json()
          assertEquals(body.transaction.totalAmountCents, 10000)
          assertEquals(body.transaction.discountAppliedCents, 500)
          assertEquals(body.transaction.finalAmountCents, 9500)
        },
      )

      await t.step(
        'bogo validation with quantity - server-calculated',
        async () => {
          const { code } = await setupCouponAndRedemption({
            behavior: {
              type: 'bogo',
              buyQuantity: 2,
              freeQuantity: 1,
              unitPriceCents: 1000,
            },
          })
          const res = await validateRequest(code, { quantity: 6 })
          assertEquals(res.status, 200)
          const body = await res.json()
          assertEquals(body.transaction.totalAmountCents, 6000)
          assertEquals(body.transaction.discountAppliedCents, 2000)
          assertEquals(body.transaction.finalAmountCents, 4000)
        },
      )

      await t.step(
        'item_specific validation with quantity - server-calculated',
        async () => {
          const { code } = await setupCouponAndRedemption({
            behavior: {
              type: 'item_specific',
              unitPriceCents: 2000,
              discountPerUnitCents: 500,
            },
          })
          const res = await validateRequest(code, { quantity: 3 })
          assertEquals(res.status, 200)
          const body = await res.json()
          assertEquals(body.transaction.totalAmountCents, 6000)
          assertEquals(body.transaction.discountAppliedCents, 1500)
          assertEquals(body.transaction.finalAmountCents, 4500)
        },
      )

      await t.step('bogo without quantity returns 400', async () => {
        const { code } = await setupCouponAndRedemption({
          behavior: {
            type: 'bogo',
            buyQuantity: 2,
            freeQuantity: 1,
            unitPriceCents: 1000,
          },
        })
        const res = await validateRequest(code, {})
        assertEquals(res.status, 400)
        const text = await res.text()
        assertEquals(
          text,
          'Quantity is required for bogo coupons and must be a positive integer',
        )
      })

      await t.step('item_specific without quantity returns 400', async () => {
        const { code } = await setupCouponAndRedemption({
          behavior: {
            type: 'item_specific',
            unitPriceCents: 2000,
            discountPerUnitCents: 500,
          },
        })
        const res = await validateRequest(code, {})
        assertEquals(res.status, 400)
        const text = await res.text()
        assertEquals(
          text,
          'Quantity is required for item_specific coupons and must be a positive integer',
        )
      })

      await t.step('bogo with mismatched amountCents returns 400', async () => {
        const { code } = await setupCouponAndRedemption({
          behavior: {
            type: 'bogo',
            buyQuantity: 1,
            freeQuantity: 1,
            unitPriceCents: 1000,
          },
        })
        const res = await validateRequest(code, {
          quantity: 3,
          amountCents: 9999,
        })
        assertEquals(res.status, 400)
        const text = await res.text()
        assertEquals(text, 'amountCents mismatch: expected 3000, got 9999')
      })

      await t.step(
        'item_specific with mismatched amountCents returns 400',
        async () => {
          const { code } = await setupCouponAndRedemption({
            behavior: {
              type: 'item_specific',
              unitPriceCents: 2000,
              discountPerUnitCents: 500,
            },
          })
          const res = await validateRequest(code, {
            quantity: 2,
            amountCents: 9999,
          })
          assertEquals(res.status, 400)
          const text = await res.text()
          assertEquals(text, 'amountCents mismatch: expected 4000, got 9999')
        },
      )

      await t.step('minimum purchase below threshold returns 400', async () => {
        const { code } = await setupCouponAndRedemption({
          behavior: { type: 'percentage_discount', percent: 10 },
          restrictions: { minimumPurchaseValueCents: 5000 },
        })
        const res = await validateRequest(code, { amountCents: 3000 })
        assertEquals(res.status, 400)
        const text = await res.text()
        assertEquals(text, 'Minimum purchase value of R$ 50.00 not met')
      })

      await t.step('minimum purchase at threshold succeeds', async () => {
        const { code } = await setupCouponAndRedemption({
          behavior: { type: 'percentage_discount', percent: 10 },
          restrictions: { minimumPurchaseValueCents: 5000 },
        })
        const res = await validateRequest(code, { amountCents: 5000 })
        assertEquals(res.status, 200)
        const body = await res.json()
        assertEquals(body.transaction.totalAmountCents, 5000)
        assertEquals(body.transaction.discountAppliedCents, 500)
      })

      await t.step('minimum purchase above threshold succeeds', async () => {
        const { code } = await setupCouponAndRedemption({
          behavior: { type: 'percentage_discount', percent: 15 },
          restrictions: { minimumPurchaseValueCents: 5000 },
        })
        const res = await validateRequest(code, { amountCents: 8000 })
        assertEquals(res.status, 200)
        const body = await res.json()
        assertEquals(body.transaction.totalAmountCents, 8000)
        assertEquals(body.transaction.discountAppliedCents, 1200)
      })

      await t.step(
        'minimum purchase not set - no check performed',
        async () => {
          const { code } = await setupCouponAndRedemption({
            behavior: { type: 'percentage_discount', percent: 10 },
            restrictions: {},
          })
          const res = await validateRequest(code, { amountCents: 1 })
          assertEquals(res.status, 200)
        },
      )

      await t.step(
        'analytics validation counter increments on success',
        async () => {
          const couponId = 'c_ac_' + Math.random().toString(36).slice(2)
          const userId = 'user_ac_' + Math.random().toString(36).slice(2)
          createdIds.coupons.push(couponId)
          createdIds.users.push(userId)
          await ensureUser(userId)
          await createCoupon(couponId, businessId, {
            behavior: { type: 'percentage_discount', percent: 10 },
          })

          const { code } = await makeRedemption(couponId)
          const res = await validateRequest(code, { amountCents: 10000 })
          assertEquals(res.status, 200)

          const [analytics] = await db.select().from(schema.couponAnalytics)
            .where(eq(schema.couponAnalytics.couponId, couponId))
          assertEquals(analytics.validations, 1)
        },
      )

      await t.step(
        'percentage_discount validation still works as before',
        async () => {
          const { code } = await setupCouponAndRedemption({
            behavior: { type: 'percentage_discount', percent: 15 },
          })
          const res = await validateRequest(code, { amountCents: 10000 })
          assertEquals(res.status, 200)
          const body = await res.json()
          assertEquals(body.transaction.totalAmountCents, 10000)
          assertEquals(body.transaction.discountAppliedCents, 1500)
          assertEquals(body.transaction.finalAmountCents, 8500)
        },
      )
    } finally {
      getSessionStub.restore()
      for (const cid of createdIds.coupons) {
        await db.delete(schema.transactions)
          .where(eq(schema.transactions.couponId, cid))
        await db.delete(schema.redemptions)
          .where(eq(schema.redemptions.couponId, cid))
        await db.delete(schema.couponAnalytics)
          .where(eq(schema.couponAnalytics.couponId, cid))
        await db.delete(schema.coupons)
          .where(eq(schema.coupons.id, cid))
      }
      for (const uid of createdIds.users) {
        await db.delete(schema.users).where(eq(schema.users.id, uid))
      }
      await db.delete(schema.businesses)
        .where(eq(schema.businesses.id, businessId))
      await db.delete(schema.users)
        .where(eq(schema.users.id, businessUserId))
    }
  },
})

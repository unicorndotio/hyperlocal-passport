import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { stub } from 'https://deno.land/std@0.224.0/testing/mock.ts'
import { handler as validateHandler } from '../routes/api/transactions/validate.ts'
import { auth } from '../lib/auth.ts'
import { kv } from '../lib/kv.ts'
import { Coupon, Redemption, Transaction } from '../lib/coupon.ts'
import { Business } from '../lib/business.ts'
import { validationCountKey } from '../lib/analytics.ts'

Deno.test('Checkout Validation API', async (t) => {
  const userId = 'user_' + Math.random().toString(36).slice(2)
  const businessUserId = 'bizuser_' + Math.random().toString(36).slice(2)
  const businessId = 'biz_' + Math.random().toString(36).slice(2)
  const couponId = 'coupon_' + Math.random().toString(36).slice(2)
  const code = 'TESTV' + Math.random().toString(36).slice(2, 5).toUpperCase()

  // 1. Setup Data
  const business: Business = {
    id: businessId,
    userId: businessUserId,
    name: 'Test Shop',
    companyName: 'Test Shop LTDA',
    cnpj: '12345678000199',
    category: 'Food',
    logoUrl: '/logo.png',
    isActive: true,
    createdAt: new Date().toISOString(),
  }
  await kv.set(['businesses', businessId], business)

  const coupon: Coupon = {
    id: couponId,
    businessId,
    title: '15% OFF',
    behavior: { type: 'percentage_discount', percent: 15 },
    restrictions: {},
    isActive: true,
    createdAt: new Date().toISOString(),
  }
  await kv.set(['coupons', couponId], coupon)

  const redemption: Redemption = {
    id: code,
    couponId,
    businessId,
    userId,
    status: 'active',
    redeemedAt: Date.now(),
  }
  await kv.set(['redemptions', code], redemption)

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
      const amountCents = 10000 // 100.00
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
      assertEquals(transaction.discountAppliedCents, 1500) // 15% of 10000
      assertEquals(transaction.finalAmountCents, 8500)
      assertEquals(transaction.businessId, businessId)

      // Verify KV
      const kvRedemption = await kv.get<Redemption>(['redemptions', code])
      assertEquals(kvRedemption.value!.status, 'used')

      const kvTransaction = await kv.get<Transaction>([
        'transactions',
        transaction.id,
      ])
      assertExists(kvTransaction.value)
    })

    await t.step('POST /api/transactions/validate - Already Used', async () => {
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
    })

    await t.step(
      'POST /api/transactions/validate - Wrong Business',
      async () => {
        // Create another business and user
        const otherBizId = 'biz_other_' + Math.random().toString(36).slice(2)
        const otherUserId = 'user_other_' + Math.random().toString(36).slice(2)
        await kv.set(['businesses', otherBizId], {
          ...business,
          id: otherBizId,
          userId: otherUserId,
        })

        const newCode = 'OTHER1'
        await kv.set(['redemptions', newCode], {
          ...redemption,
          id: newCode,
          businessId: otherBizId,
        })

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

        await kv.delete(['businesses', otherBizId])
        await kv.delete(['redemptions', newCode])
      },
    )

    await t.step(
      'POST /api/transactions/validate - Expired Coupon',
      async () => {
        const expCode = 'EXPIRED_' + Math.random().toString(36).slice(2)
        const expCouponId = 'coupon_exp_' + Math.random().toString(36).slice(2)
        await kv.set(['coupons', expCouponId], {
          ...coupon,
          id: expCouponId,
          restrictions: {
            ...coupon.restrictions,
            validUntil: Date.now() - 10000,
          },
        })
        await kv.set(['redemptions', expCode], {
          ...redemption,
          id: expCode,
          couponId: expCouponId,
        })

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

        await kv.delete(['coupons', expCouponId])
        await kv.delete(['redemptions', expCode])
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
            body: JSON.stringify({ amountCents: 100 }), // missing code
          },
        )
        const res = await (validateHandler as unknown as {
          POST: (ctx: unknown) => Promise<Response>
        }).POST({ req })
        assertEquals(res.status, 400)
        assertEquals(await res.text(), 'Missing redemption code')

        // Setup a known redemption to test missing amountCents
        const knownCode = 'AMTCNT'
        await kv.set(['redemptions', knownCode], {
          id: knownCode,
          couponId,
          businessId,
          userId,
          status: 'active',
          redeemedAt: Date.now(),
        })

        const req2 = new Request(
          'http://localhost:8000/api/transactions/validate',
          {
            method: 'POST',
            body: JSON.stringify({ code: knownCode }), // missing amountCents
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

        await kv.delete(['redemptions', knownCode])
      },
    )

    await t.step('POST /api/transactions/validate - Invalid JSON', async () => {
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
    })

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
      'POST /api/transactions/validate - Coupon Inactive',
      async () => {
        const inactCode = 'INACTIVE'
        const inactCouponId = 'coupon_inact'
        await kv.set(['coupons', inactCouponId], {
          ...coupon,
          id: inactCouponId,
          isActive: false,
        })
        await kv.set(['redemptions', inactCode], {
          ...redemption,
          id: inactCode,
          couponId: inactCouponId,
        })

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

        await kv.delete(['coupons', inactCouponId])
        await kv.delete(['redemptions', inactCode])
      },
    )
  } finally {
    getSessionStub.restore()
    await kv.delete(['businesses', businessId])
    await kv.delete(['coupons', couponId])
    await kv.delete(['redemptions', code])
  }
})

Deno.test('Checkout Validation API - Multi-Behavior Dispatch', async (t) => {
  const businessUserId = 'bizuser_mbd_' + Math.random().toString(36).slice(2)
  const businessId = 'biz_mbd_' + Math.random().toString(36).slice(2)

  const business: Business = {
    id: businessId,
    userId: businessUserId,
    name: 'Multi-Behavior Test Shop',
    companyName: 'MBD Shop LTDA',
    cnpj: '12345678000199',
    category: 'Food',
    logoUrl: '/logo.png',
    isActive: true,
    createdAt: new Date().toISOString(),
  }
  await kv.set(['businesses', businessId], business)

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

  const createdKeys: string[][] = []

  function makeCoupon(overrides: Partial<Coupon> = {}): Coupon {
    return {
      id: 'c_' + Math.random().toString(36).slice(2),
      businessId,
      title: 'Test Coupon',
      behavior: { type: 'percentage_discount', percent: 10 },
      restrictions: {},
      isActive: true,
      createdAt: new Date().toISOString(),
      ...overrides,
    }
  }

  function makeRedemption(
    couponId: string,
  ): { code: string; redemption: Redemption } {
    const code = 'MBD_' + Math.random().toString(36).slice(2, 8).toUpperCase()
    const redemption: Redemption = {
      id: code,
      couponId,
      businessId,
      userId: 'user_' + Math.random().toString(36).slice(2),
      status: 'active',
      redeemedAt: Date.now(),
    }
    return { code, redemption }
  }

  async function setupCouponAndRedemption(
    couponOverrides: Partial<Coupon> = {},
  ): Promise<{ couponId: string; code: string }> {
    const coupon = makeCoupon(couponOverrides)
    const { code, redemption } = makeRedemption(coupon.id)
    await kv.set(['coupons', coupon.id], coupon)
    await kv.set(['redemptions', code], redemption)
    createdKeys.push(['coupons', coupon.id], ['redemptions', code])
    return { couponId: coupon.id, code }
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
        // 6 items, groups of (2+1)=3 → 2 sets × 1 free = 2 free
        // total = 6 × 1000 = 6000
        // discount = 2 × 1000 = 2000
        // final = 6000 - 2000 = 4000
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
        // total = 3 × 2000 = 6000
        // discount = 3 × 500 = 1500
        // final = 6000 - 1500 = 4500
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
      // quantity = 3 → expected = 1000 * 3 = 3000, send 9999
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
        // quantity = 2 → expected = 2000 * 2 = 4000, send 9999
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

    await t.step('minimum purchase not set - no check performed', async () => {
      const { code } = await setupCouponAndRedemption({
        behavior: { type: 'percentage_discount', percent: 10 },
        restrictions: {}, // no minimumPurchaseValueCents
      })
      const res = await validateRequest(code, { amountCents: 1 })
      assertEquals(res.status, 200)
    })

    await t.step(
      'analytics validation counter increments on success',
      async () => {
        const couponId = 'c_ac_' + Math.random().toString(36).slice(2)
        const { code, redemption } = makeRedemption(couponId)
        await kv.set(['coupons', couponId], {
          id: couponId,
          businessId,
          title: 'Analytics Test Coupon',
          behavior: { type: 'percentage_discount', percent: 10 },
          restrictions: {},
          isActive: true,
          createdAt: new Date().toISOString(),
        })
        await kv.set(['redemptions', code], redemption)
        createdKeys.push(['coupons', couponId], ['redemptions', code])

        const res = await validateRequest(code, { amountCents: 10000 })
        assertEquals(res.status, 200)

        const analyticsKey = validationCountKey(couponId)
        const analyticsRes = await kv.get<number>(analyticsKey)
        assertEquals(analyticsRes.value, 1)
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
    await kv.delete(['businesses', businessId])
    for (const key of createdKeys) {
      await kv.delete(key)
    }
  }
})

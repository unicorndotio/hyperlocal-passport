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
    type: 'basic',
    title: '15% OFF',
    discountPercent: 15,
    globalClaimedCount: 1,
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
      assertEquals(transaction.totalAmount, 10000)
      assertEquals(transaction.discountApplied, 1500) // 15% of 10000
      assertEquals(transaction.finalAmount, 8500)
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
          validUntil: Date.now() - 10000,
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

        const req2 = new Request(
          'http://localhost:8000/api/transactions/validate',
          {
            method: 'POST',
            body: JSON.stringify({ code: 'ABC' }), // missing amountCents
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
        assertEquals(await res.text(), 'Coupon is no longer active')

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

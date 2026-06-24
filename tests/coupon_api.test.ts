import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { stub as mockStub } from 'https://deno.land/std@0.224.0/testing/mock.ts'
import { db } from '../lib/db.ts'
import * as schema from '../db/schema.ts'
import { eq } from 'drizzle-orm'
import { auth } from '../lib/auth.ts'
import { handler as businessCouponsHandler } from '../routes/api/businesses/[id]/coupons.ts'
import { handler as couponHandler } from '../routes/api/coupons/[id].ts'

type CouponCtx = { req: Request; params: Record<string, string> }
type CouponHandler = {
  GET: (ctx: CouponCtx) => Promise<Response>
  POST: (ctx: CouponCtx) => Promise<Response>
  PATCH: (ctx: CouponCtx) => Promise<Response>
  DELETE: (ctx: CouponCtx) => Promise<Response>
}

function adminSession() {
  return Promise.resolve({
    user: {
      id: 'admin_user',
      role: 'admin',
      email: 'admin@example.com',
      name: 'Admin',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    session: {
      id: 'sess_admin',
      userId: 'admin_user',
      expiresAt: new Date(Date.now() + 3600000),
      token: 'token_admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
}

function nullSession() {
  return Promise.resolve(null)
}

function residentSession() {
  return Promise.resolve({
    user: {
      id: 'resident_user',
      role: 'resident',
      email: 'resident@example.com',
      name: 'Resident',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    session: {
      id: 'sess_res',
      userId: 'resident_user',
      expiresAt: new Date(Date.now() + 3600000),
      token: 'token_res',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
}

async function cleanup(id: string) {
  await db.delete(schema.coupons).where(eq(schema.coupons.id, id))
}

Deno.test({
  name: 'Coupon API CRUD - Integration',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    const getSessionStub = mockStub(auth.api, 'getSession', adminSession)

    try {
      const businessId = 'biz_api_' + Math.random().toString(36).slice(2)
      const userId = 'admin_user'
      let couponId: string

      // Create user and business for FK constraint
      await db.insert(schema.users).values({
        id: userId,
        email: 'admin@example.com',
        name: 'Admin',
      }).onConflictDoNothing({ target: schema.users.id })
      await db.insert(schema.businesses).values({
        id: businessId,
        userId,
        name: 'Test Business',
        companyName: 'Test Business Ltd',
        cnpj: `11${Date.now()}000181`,
        category: 'Test',
        logoUrl: 'http://localhost/logo.png',
        isActive: true,
      }).onConflictDoNothing({ target: schema.businesses.id })

      await t.step(
        'POST - create coupon with percentage_discount',
        async () => {
          const req = new Request(
            `http://localhost:8000/api/businesses/${businessId}/coupons`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: '10% Off',
                behavior: { type: 'percentage_discount', percent: 10 },
              }),
            },
          )
          const res = await (businessCouponsHandler as unknown as CouponHandler)
            .POST({ req, params: { id: businessId } })
          assertEquals(res.status, 201)
          const data = await res.json()
          couponId = data.id
          assertExists(couponId)
          assertEquals(data.title, '10% Off')
          assertEquals(data.behavior.type, 'percentage_discount')
          assertEquals(data.behavior.percent, 10)
          assertEquals(data.restrictions, {})
          assertEquals(data.isActive, true)
        },
      )

      await t.step('GET - get coupon', async () => {
        const req = new Request(`http://localhost:8000/api/coupons/${couponId}`)
        const res = await (couponHandler as unknown as CouponHandler).GET({
          req,
          params: { id: couponId },
        })
        assertEquals(res.status, 200)
        const data = await res.json()
        assertEquals(data.title, '10% Off')
      })

      await t.step('PATCH - update title', async () => {
        const req = new Request(
          `http://localhost:8000/api/coupons/${couponId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Updated Coupon' }),
          },
        )
        const res = await (couponHandler as unknown as CouponHandler).PATCH({
          req,
          params: { id: couponId },
        })
        assertEquals(res.status, 200)
        const data = await res.json()
        assertEquals(data.title, 'Updated Coupon')
      })

      await t.step('PATCH - update behavior', async () => {
        const req = new Request(
          `http://localhost:8000/api/coupons/${couponId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              behavior: { type: 'fixed_amount', amountCents: 500 },
            }),
          },
        )
        const res = await (couponHandler as unknown as CouponHandler).PATCH({
          req,
          params: { id: couponId },
        })
        assertEquals(res.status, 200)
        const data = await res.json()
        assertEquals(data.behavior.type, 'fixed_amount')
        assertEquals(data.behavior.amountCents, 500)
      })

      await t.step('PATCH - update restrictions partially', async () => {
        const req = new Request(
          `http://localhost:8000/api/coupons/${couponId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              restrictions: { globalCap: 100, userCap: 5 },
            }),
          },
        )
        const res = await (couponHandler as unknown as CouponHandler).PATCH({
          req,
          params: { id: couponId },
        })
        assertEquals(res.status, 200)
        const data = await res.json()
        assertEquals(data.restrictions.globalCap, 100)
        assertEquals(data.restrictions.userCap, 5)
      })

      await t.step('DELETE - delete coupon', async () => {
        const req = new Request(
          `http://localhost:8000/api/coupons/${couponId}`,
          {
            method: 'DELETE',
          },
        )
        const res = await (couponHandler as unknown as CouponHandler).DELETE({
          req,
          params: { id: couponId },
        })
        assertEquals(res.status, 204)

        const [check] = await db.select().from(schema.coupons)
          .where(eq(schema.coupons.id, couponId))
        assertEquals(check, undefined)
      })
    } finally {
      getSessionStub.restore()
    }
  },
})

Deno.test({
  name: 'Coupon API - create with all behavior types',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    const getSessionStub = mockStub(auth.api, 'getSession', adminSession)
    const businessId = 'behav_biz_' + Math.random().toString(36).slice(2)
    const userId = 'admin_user'
    const createdIds: string[] = []

    try {
      await db.insert(schema.users).values({
        id: userId,
        email: 'admin@example.com',
        name: 'Admin',
      }).onConflictDoNothing({ target: schema.users.id })
      await db.insert(schema.businesses).values({
        id: businessId,
        userId,
        name: 'Behavior Test Business',
        companyName: 'Behavior Test Ltd',
        cnpj: `22${Date.now()}000181`,
        category: 'Test',
        logoUrl: 'http://localhost/logo.png',
        isActive: true,
      }).onConflictDoNothing({ target: schema.businesses.id })

      await t.step('POST - percentage_discount', async () => {
        const req = new Request(
          `http://localhost:8000/api/businesses/${businessId}/coupons`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: 'Percentage Discount',
              behavior: { type: 'percentage_discount', percent: 15 },
            }),
          },
        )
        const res = await (businessCouponsHandler as unknown as CouponHandler)
          .POST({ req, params: { id: businessId } })
        assertEquals(res.status, 201)
        const data = await res.json()
        createdIds.push(data.id)
        assertEquals(data.behavior.type, 'percentage_discount')
        assertEquals(data.behavior.percent, 15)
      })

      await t.step('POST - fixed_amount', async () => {
        const req = new Request(
          `http://localhost:8000/api/businesses/${businessId}/coupons`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: 'Fixed Amount',
              behavior: { type: 'fixed_amount', amountCents: 1000 },
            }),
          },
        )
        const res = await (businessCouponsHandler as unknown as CouponHandler)
          .POST({ req, params: { id: businessId } })
        assertEquals(res.status, 201)
        const data = await res.json()
        createdIds.push(data.id)
        assertEquals(data.behavior.type, 'fixed_amount')
        assertEquals(data.behavior.amountCents, 1000)
      })

      await t.step('POST - bogo', async () => {
        const req = new Request(
          `http://localhost:8000/api/businesses/${businessId}/coupons`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: 'BOGO',
              behavior: {
                type: 'bogo',
                buyQuantity: 2,
                freeQuantity: 1,
                unitPriceCents: 1500,
              },
            }),
          },
        )
        const res = await (businessCouponsHandler as unknown as CouponHandler)
          .POST({ req, params: { id: businessId } })
        assertEquals(res.status, 201)
        const data = await res.json()
        createdIds.push(data.id)
        assertEquals(data.behavior.type, 'bogo')
        assertEquals(data.behavior.buyQuantity, 2)
        assertEquals(data.behavior.freeQuantity, 1)
        assertEquals(data.behavior.unitPriceCents, 1500)
      })

      await t.step('POST - item_specific', async () => {
        const req = new Request(
          `http://localhost:8000/api/businesses/${businessId}/coupons`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: 'Item Specific',
              behavior: {
                type: 'item_specific',
                unitPriceCents: 2000,
                discountPerUnitCents: 500,
              },
            }),
          },
        )
        const res = await (businessCouponsHandler as unknown as CouponHandler)
          .POST({ req, params: { id: businessId } })
        assertEquals(res.status, 201)
        const data = await res.json()
        createdIds.push(data.id)
        assertEquals(data.behavior.type, 'item_specific')
        assertEquals(data.behavior.unitPriceCents, 2000)
        assertEquals(data.behavior.discountPerUnitCents, 500)
      })

      await t.step('POST - with all restriction fields', async () => {
        const req = new Request(
          `http://localhost:8000/api/businesses/${businessId}/coupons`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: 'Full Restrictions',
              behavior: { type: 'percentage_discount', percent: 10 },
              restrictions: {
                globalCap: 500,
                userCap: 3,
                validFrom: Date.now(),
                validUntil: Date.now() + 86400000 * 30,
                usageFrequency: 'weekly',
                maxUnitsPerRedemption: 2,
                applicationScope: { type: 'categories', ids: ['cat1', 'cat2'] },
                minimumPurchaseValueCents: 5000,
              },
            }),
          },
        )
        const res = await (businessCouponsHandler as unknown as CouponHandler)
          .POST({ req, params: { id: businessId } })
        assertEquals(res.status, 201)
        const data = await res.json()
        createdIds.push(data.id)
        assertEquals(data.restrictions.globalCap, 500)
        assertEquals(data.restrictions.userCap, 3)
        assertEquals(data.restrictions.usageFrequency, 'weekly')
        assertEquals(data.restrictions.maxUnitsPerRedemption, 2)
        assertEquals(data.restrictions.applicationScope.type, 'categories')
        assertEquals(data.restrictions.minimumPurchaseValueCents, 5000)
      })

      // cleanup
      for (const id of createdIds) {
        await db.delete(schema.coupons).where(eq(schema.coupons.id, id))
      }
    } finally {
      getSessionStub.restore()
    }
  },
})

Deno.test({
  name: 'Coupon API - validation errors',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    const businessId = 'val_biz_' + Math.random().toString(36).slice(2)

    await t.step('POST - missing behavior type field returns 400', async () => {
      const req = new Request(
        `http://localhost:8000/api/businesses/${businessId}/coupons`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Bad Behavior',
            behavior: { type: 'bogo' },
          }),
        },
      )
      const res = await (businessCouponsHandler as unknown as CouponHandler)
        .POST({ req, params: { id: businessId } })
      assertEquals(res.status, 400)
      const text = await res.text()
      assertEquals(text, 'buyQuantity is required and must be a number')
    })

    await t.step('POST - invalid behavior type returns 400', async () => {
      const req = new Request(
        `http://localhost:8000/api/businesses/${businessId}/coupons`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Bad',
            behavior: { type: 'invalid_type', percent: 10 },
          }),
        },
      )
      const res = await (businessCouponsHandler as unknown as CouponHandler)
        .POST({ req, params: { id: businessId } })
      assertEquals(res.status, 400)
      const text = await res.text()
      assertEquals(
        text,
        'Behavior type must be one of: percentage_discount, fixed_amount, bogo, item_specific',
      )
    })

    await t.step(
      'POST - missing bogo required fields returns 400',
      async () => {
        const req = new Request(
          `http://localhost:8000/api/businesses/${businessId}/coupons`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: 'Incomplete BOGO',
              behavior: { type: 'bogo', buyQuantity: 2 },
            }),
          },
        )
        const res = await (businessCouponsHandler as unknown as CouponHandler)
          .POST({ req, params: { id: businessId } })
        assertEquals(res.status, 400)
        const text = await res.text()
        assertEquals(text, 'freeQuantity is required and must be a number')
      },
    )

    await t.step(
      'POST - missing item_specific required fields returns 400',
      async () => {
        const req = new Request(
          `http://localhost:8000/api/businesses/${businessId}/coupons`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: 'Incomplete Item',
              behavior: { type: 'item_specific', unitPriceCents: 1000 },
            }),
          },
        )
        const res = await (businessCouponsHandler as unknown as CouponHandler)
          .POST({ req, params: { id: businessId } })
        assertEquals(res.status, 400)
        const text = await res.text()
        assertEquals(
          text,
          'discountPerUnitCents is required and must be a number',
        )
      },
    )

    await t.step('POST - string field for number returns 400', async () => {
      const req = new Request(
        `http://localhost:8000/api/businesses/${businessId}/coupons`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Bad Percent',
            behavior: { type: 'percentage_discount', percent: '10' },
          }),
        },
      )
      const res = await (businessCouponsHandler as unknown as CouponHandler)
        .POST({ req, params: { id: businessId } })
      assertEquals(res.status, 400)
      const text = await res.text()
      assertEquals(text, 'percent is required and must be a number')
    })

    await t.step('PATCH - invalid behavior update returns 400', async () => {
      const couponId = 'patch_err_' + Math.random().toString(36).slice(2)
      const userId = 'admin_user'
      // Create user and business for FK constraint
      await db.insert(schema.users).values({
        id: userId,
        email: 'admin@example.com',
        name: 'Admin',
      }).onConflictDoNothing({ target: schema.users.id })
      await db.insert(schema.businesses).values({
        id: businessId,
        userId,
        name: 'Val Test Business',
        companyName: 'Val Test Ltd',
        cnpj: `33${Date.now()}000181`,
        category: 'Test',
        logoUrl: 'http://localhost/logo.png',
        isActive: true,
      }).onConflictDoNothing({ target: schema.businesses.id })

      await db.insert(schema.coupons).values({
        id: couponId,
        businessId,
        title: 'PATCH test',
        behavior: { type: 'percentage_discount', percent: 10 },
        restrictions: {},
        isActive: true,
      })

      const stubSession = mockStub(auth.api, 'getSession', adminSession)
      try {
        const req = new Request(
          `http://localhost:8000/api/coupons/${couponId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              behavior: { type: 'fixed_amount' },
            }),
          },
        )
        const res = await (couponHandler as unknown as CouponHandler).PATCH({
          req,
          params: { id: couponId },
        })
        assertEquals(res.status, 400)
        const text = await res.text()
        assertEquals(text, 'amountCents is required and must be a number')
      } finally {
        stubSession.restore()
      }

      await db.delete(schema.coupons).where(eq(schema.coupons.id, couponId))
    })
  },
})

Deno.test({
  name: 'Coupon API - error branches',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    const businessId = 'err_biz_' + Math.random().toString(36).slice(2)
    const couponId = 'err_cpn_' + Math.random().toString(36).slice(2)
    const userId = 'admin_user'

    await db.insert(schema.users).values({
      id: userId,
      email: 'admin@example.com',
      name: 'Admin',
    }).onConflictDoNothing({ target: schema.users.id })
    await db.insert(schema.businesses).values({
      id: businessId,
      userId,
      name: 'Err Test Business',
      companyName: 'Err Test Ltd',
      cnpj: `44${Date.now()}000181`,
      category: 'Test',
      logoUrl: 'http://localhost/logo.png',
      isActive: true,
    }).onConflictDoNothing({ target: schema.businesses.id })

    await db.insert(schema.coupons).values({
      id: couponId,
      businessId,
      isActive: true,
      behavior: { type: 'percentage_discount', percent: 10 },
      restrictions: {},
      title: 'Test',
    })

    await t.step('GET returns 404 for non-existent coupon', async () => {
      const stubSession = mockStub(auth.api, 'getSession', adminSession)
      try {
        const req = new Request('http://localhost:8000/api/coupons/nonexistent')
        const res = await (couponHandler as unknown as CouponHandler).GET({
          req,
          params: { id: 'nonexistent' },
        })
        assertEquals(res.status, 404)
      } finally {
        stubSession.restore()
      }
    })

    await t.step('PATCH returns 401 without session', async () => {
      const stubSession = mockStub(auth.api, 'getSession', nullSession)
      try {
        const req = new Request(
          `http://localhost:8000/api/coupons/${couponId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'x' }),
          },
        )
        const res = await (couponHandler as unknown as CouponHandler).PATCH({
          req,
          params: { id: couponId },
        })
        assertEquals(res.status, 401)
      } finally {
        stubSession.restore()
      }
    })

    await t.step('PATCH returns 404 for non-existent coupon', async () => {
      const stubSession = mockStub(auth.api, 'getSession', adminSession)
      try {
        const req = new Request(
          'http://localhost:8000/api/coupons/nonexistent',
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'x' }),
          },
        )
        const res = await (couponHandler as unknown as CouponHandler).PATCH({
          req,
          params: { id: 'nonexistent' },
        })
        assertEquals(res.status, 404)
      } finally {
        stubSession.restore()
      }
    })

    await t.step('PATCH returns 403 for non-owner resident', async () => {
      const stubSession = mockStub(auth.api, 'getSession', residentSession)
      try {
        const req = new Request(
          `http://localhost:8000/api/coupons/${couponId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'x' }),
          },
        )
        const res = await (couponHandler as unknown as CouponHandler).PATCH({
          req,
          params: { id: couponId },
        })
        assertEquals(res.status, 403)
      } finally {
        stubSession.restore()
      }
    })

    await t.step('PATCH returns 400 for invalid JSON', async () => {
      const stubSession = mockStub(auth.api, 'getSession', adminSession)
      try {
        const req = new Request(
          `http://localhost:8000/api/coupons/${couponId}`,
          {
            method: 'PATCH',
            body: 'not-json',
          },
        )
        const res = await (couponHandler as unknown as CouponHandler).PATCH({
          req,
          params: { id: couponId },
        })
        assertEquals(res.status, 400)
      } finally {
        stubSession.restore()
      }
    })

    await t.step('DELETE returns 401 without session', async () => {
      const stubSession = mockStub(auth.api, 'getSession', nullSession)
      try {
        const req = new Request(
          `http://localhost:8000/api/coupons/${couponId}`,
          {
            method: 'DELETE',
          },
        )
        const res = await (couponHandler as unknown as CouponHandler).DELETE({
          req,
          params: { id: couponId },
        })
        assertEquals(res.status, 401)
      } finally {
        stubSession.restore()
      }
    })

    await t.step('DELETE returns 404 for non-existent coupon', async () => {
      const stubSession = mockStub(auth.api, 'getSession', adminSession)
      try {
        const req = new Request(
          'http://localhost:8000/api/coupons/nonexistent',
          {
            method: 'DELETE',
          },
        )
        const res = await (couponHandler as unknown as CouponHandler).DELETE({
          req,
          params: { id: 'nonexistent' },
        })
        assertEquals(res.status, 404)
      } finally {
        stubSession.restore()
      }
    })

    await t.step('DELETE returns 403 for non-owner resident', async () => {
      const stubSession = mockStub(auth.api, 'getSession', residentSession)
      try {
        const req = new Request(
          `http://localhost:8000/api/coupons/${couponId}`,
          {
            method: 'DELETE',
          },
        )
        const res = await (couponHandler as unknown as CouponHandler).DELETE({
          req,
          params: { id: couponId },
        })
        assertEquals(res.status, 403)
      } finally {
        stubSession.restore()
      }
    })

    await db.delete(schema.coupons).where(eq(schema.coupons.id, couponId))
  },
})

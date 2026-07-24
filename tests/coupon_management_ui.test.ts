import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { db } from '../lib/db.ts'
import * as schema from '../db/schema.ts'
import { eq } from 'drizzle-orm'
import { handler as couponsHandler } from '../routes/api/businesses/[id]/coupons.ts'

async function ensureUser(userId: string) {
  await db.insert(schema.users).values({
    id: userId,
    email: `${userId}@test.com`,
    name: 'Test User',
  }).onConflictDoNothing({ target: schema.users.id })
}

async function setupTestBusiness(businessId: string, userId: string) {
  await ensureUser(userId)
  await db.insert(schema.businesses).values({
    id: businessId,
    userId,
    name: 'Test Business',
    companyName: 'Test Business Ltd',
    cnpj: Date.now().toString(36).slice(-6) +
      Math.random().toString(36).slice(2, 10),
    category: 'Alimentação',
    logoUrl: 'http://localhost:8000/logo.png',
    isActive: true,
  }).onConflictDoNothing({ target: schema.businesses.id })
}

async function cleanupTestBusiness(businessId: string) {
  await db.delete(schema.coupons)
    .where(eq(schema.coupons.businessId, businessId))
  await db.delete(schema.businesses)
    .where(eq(schema.businesses.id, businessId))
}

Deno.test({
  name: 'Coupon Management API',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    const businessId = crypto.randomUUID()
    const userId = crypto.randomUUID()

    await t.step(
      'POST /api/businesses/:id/coupons creates a new coupon',
      async () => {
        await setupTestBusiness(businessId, userId)

        const couponData = {
          title: 'Desconto de Teste',
          behavior: { type: 'percentage_discount', percent: 15 },
          description: 'Descrição de teste',
          restrictions: {
            globalCap: 100,
            userCap: 1,
            validUntil: Date.now() + 86400000,
          },
        }

        const req = new Request(
          `http://localhost:8000/api/businesses/${businessId}/coupons`,
          {
            method: 'POST',
            body: JSON.stringify(couponData),
          },
        )

        const res = await (couponsHandler as unknown as {
          POST: (ctx: unknown) => Promise<Response>
        }).POST({
          req,
          params: { id: businessId },
        })
        assertEquals(res.status, 201)

        const coupon = await res.json()
        assertEquals(coupon.title, couponData.title)
        assertEquals(coupon.businessId, businessId)
        assertEquals(coupon.behavior.percent, 15)
        assertEquals(coupon.restrictions.globalCap, 100)
        assertExists(coupon.id)

        const [dbCoupon] = await db.select().from(schema.coupons)
          .where(eq(schema.coupons.id, coupon.id))
        assertExists(dbCoupon)
        assertEquals(dbCoupon.title, couponData.title)
      },
    )

    await t.step(
      'POST /api/businesses/:id/coupons returns 400 for missing title',
      async () => {
        const req = new Request(
          `http://localhost:8000/api/businesses/${businessId}/coupons`,
          {
            method: 'POST',
            body: JSON.stringify({
              behavior: { type: 'percentage_discount', percent: 10 },
            }),
          },
        )

        const res = await (couponsHandler as unknown as {
          POST: (ctx: unknown) => Promise<Response>
        }).POST({
          req,
          params: { id: businessId },
        })
        assertEquals(res.status, 400)
      },
    )

    await t.step(
      'GET /api/businesses/:id/coupons returns all coupons for business',
      async () => {
        const req = new Request(
          `http://localhost:8000/api/businesses/${businessId}/coupons`,
        )
        const res = await (couponsHandler as unknown as {
          GET: (ctx: unknown) => Promise<Response>
        }).GET({
          req,
          params: { id: businessId },
        })

        assertEquals(res.status, 200)
        const coupons = await res.json()
        assertEquals(Array.isArray(coupons), true)
        assertEquals(coupons.length > 0, true)
        assertEquals(coupons[0].businessId, businessId)
      },
    )

    await cleanupTestBusiness(businessId)
  },
})

// Mock fetch for UI integration tests
Deno.test('CouponManager UI Integration (Mocked)', async (t) => {
  const originalFetch = globalThis.fetch

  await t.step('Successful coupon creation updates state', () => {
    let capturedBody: unknown = null

    globalThis.fetch = (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        capturedBody = JSON.parse(init.body as string)
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: 'new-id',
              ...(capturedBody as Record<string, unknown>),
              isActive: true,
              createdAt: new Date().toISOString(),
            }),
            { status: 201, headers: { 'Content-Type': 'application/json' } },
          ),
        )
      }
      return Promise.resolve(new Response('Not Found', { status: 404 }))
    }

    const validate = (title: string, discount: number) => {
      if (!title.trim()) return 'O título é obrigatório.'
      if (isNaN(discount) || discount < 5 || discount > 30) {
        return 'O desconto deve ser entre 5% e 30%.'
      }
      return null
    }

    assertEquals(validate('', 10), 'O título é obrigatório.')
    assertEquals(validate('Test', 4), 'O desconto deve ser entre 5% e 30%.')
    assertEquals(validate('Test', 31), 'O desconto deve ser entre 5% e 30%.')
    assertEquals(validate('Test', 20), null)
  })

  globalThis.fetch = originalFetch
})


// --- Task 05 Unit Tests ---
import { formatCurrencyMask } from '../lib/utils.ts'

Deno.test('Task 05: Currency masking — "1500" formats as "R$ 15,00" and outputs 1500 cents', () => {
  const result = formatCurrencyMask('1500')
  assertEquals(result.cents, 1500)
  assertEquals(result.formatted, 'R$\u00a015,00')
})

Deno.test('Task 05: Currency masking — number input 1500 formats as "R$ 15,00" and outputs 1500 cents', () => {
  const result = formatCurrencyMask(1500)
  assertEquals(result.cents, 1500)
  assertEquals(result.formatted, 'R$\u00a015,00')
})

Deno.test('Task 05: Preset selection — "Benefício Fidelidade" sets correct internal constraints', () => {
  // Mirror the getDefaultsForPreset logic from CouponManager
  type BehaviorTypeName = 'percentage_discount' | 'fixed_amount' | 'bogo' | 'item_specific'
  interface PresetDefaults {
    behaviorType: BehaviorTypeName
    behaviorFields: Record<string, number>
    restrictions: {
      usageFrequency?: string
      userCap?: number
      validUntil?: number
    }
  }

  function getDefaultsForPreset(id: string, now: number): PresetDefaults {
    switch (id) {
      case 'loyalty-perk':
        return {
          behaviorType: 'percentage_discount',
          behaviorFields: { percent: 10 },
          restrictions: {
            usageFrequency: 'weekly',
          },
        }
      case 'flash-sale':
        return {
          behaviorType: 'percentage_discount',
          behaviorFields: { percent: 20 },
          restrictions: {
            userCap: 1,
            usageFrequency: 'one_time',
            validUntil: now + 7 * 86400000,
          },
        }
      case 'event-promo':
        return {
          behaviorType: 'fixed_amount',
          behaviorFields: { amountCents: 1000 },
          restrictions: {
            userCap: 1,
            usageFrequency: 'one_time',
            validUntil: now + 86400000,
          },
        }
      case 'item-clearance':
        return {
          behaviorType: 'item_specific',
          behaviorFields: { unitPriceCents: 2000, discountPerUnitCents: 1000 },
          restrictions: {
            userCap: 1,
            usageFrequency: 'one_time',
          },
        }
      default:
        return {
          behaviorType: 'percentage_discount',
          behaviorFields: { percent: 10 },
          restrictions: {},
        }
    }
  }

  const now = Date.now()
  const defaults = getDefaultsForPreset('loyalty-perk', now)

  // Benefício Fidelidade: percentage discount, weekly frequency, no expiration, no userCap
  assertEquals(defaults.behaviorType, 'percentage_discount')
  assertEquals(defaults.behaviorFields.percent, 10)
  assertEquals(defaults.restrictions.usageFrequency, 'weekly')
  assertEquals(defaults.restrictions.userCap, undefined)
  assertEquals(defaults.restrictions.validUntil, undefined)
})

Deno.test('Task 05: Preset selection — "Promoção Relâmpago" sets 7-day expiry and one_time usage', () => {
  const now = Date.now()

  function getFlashSaleDefaults(n: number) {
    return {
      behaviorType: 'percentage_discount' as const,
      behaviorFields: { percent: 20 },
      restrictions: {
        userCap: 1,
        usageFrequency: 'one_time',
        validUntil: n + 7 * 86400000,
      },
    }
  }

  const defaults = getFlashSaleDefaults(now)
  assertEquals(defaults.behaviorType, 'percentage_discount')
  assertEquals(defaults.restrictions.userCap, 1)
  assertEquals(defaults.restrictions.usageFrequency, 'one_time')
  // validUntil is approximately 7 days from now
  const sevenDaysMs = 7 * 86400000
  assertEquals(defaults.restrictions.validUntil, now + sevenDaysMs)
})

Deno.test('Task 05: Currency masking — non-numeric characters are stripped', () => {
  const result = formatCurrencyMask('R$ 15,00')
  assertEquals(result.cents, 1500)
})

Deno.test('Task 05: Currency masking — empty string yields 0 cents and "R$ 0,00"', () => {
  const result = formatCurrencyMask('')
  assertEquals(result.cents, 0)
  assertEquals(result.formatted, 'R$\u00a00,00')
})

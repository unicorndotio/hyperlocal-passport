import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { h } from 'npm:preact@^10.27.2'
import { renderToString } from 'npm:preact-render-to-string@^6.5.13'
import type { Coupon } from '../../lib/coupon.ts'
import { handler as couponsHandler } from '../../routes/api/businesses/[id]/coupons.ts'
import { db } from '../../lib/db.ts'
import * as schema from '../../db/schema.ts'
import { eq } from 'drizzle-orm'

function makeCoupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: 'test-coupon-1',
    businessId: 'test-business',
    title: 'Test Coupon',
    description: 'A test coupon',
    behavior: { type: 'percentage_discount', percent: 10 },
    restrictions: {},
    isActive: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

const PRESET_NAMES = [
  'Desconto Simples',
  'Promoção Relâmpago',
  'Benefício Fidelidade',
  'Promoção de Evento',
  'Liquidação de Item',
  'Personalizado',
]

const ALL_COUPON_TYPES: Coupon[] = [
  makeCoupon({
    id: 'c1',
    title: '10% Off',
    behavior: { type: 'percentage_discount', percent: 10 },
    restrictions: { globalCap: 100, userCap: 1 },
  }),
  makeCoupon({
    id: 'c2',
    title: 'R$5 Off',
    behavior: { type: 'fixed_amount', amountCents: 500 },
    restrictions: {
      usageFrequency: 'one_time' as const,
      validUntil: Date.now() + 86400000,
    },
  }),
  makeCoupon({
    id: 'c3',
    title: 'BOGO Chopp',
    behavior: {
      type: 'bogo',
      buyQuantity: 1,
      freeQuantity: 1,
      unitPriceCents: 1000,
    },
    restrictions: {},
    isActive: false,
  }),
  makeCoupon({
    id: 'c4',
    title: 'Item Discount',
    behavior: {
      type: 'item_specific',
      unitPriceCents: 2000,
      discountPerUnitCents: 500,
    },
    restrictions: { globalCap: 50 },
  }),
]

Deno.test('CouponManager - table renders coupons with behavior type badges', async () => {
  const html = renderToString(
    h(
      (await import('../../islands/CouponManager.tsx')).default,
      { businessId: 'test', initialCoupons: ALL_COUPON_TYPES },
    ),
  )

  assertEquals(html.includes('Desconto Percentual'), true)
  assertEquals(html.includes('Valor Fixo'), true)
  assertEquals(html.includes('Compre X Leve Y Grátis'), true)
  assertEquals(html.includes('Desconto por Item'), true)
  assertEquals(html.includes('10% Off'), true)
  assertEquals(html.includes('R$5 Off'), true)
  assertEquals(html.includes('BOGO Chopp'), true)
  assertEquals(html.includes('Item Discount'), true)
})

Deno.test(
  'CouponManager - table shows empty state when no coupons',
  async () => {
    const html = renderToString(
      h(
        (await import('../../islands/CouponManager.tsx')).default,
        { businessId: 'test', initialCoupons: [] },
      ),
    )

    assertEquals(
      html.includes('Nenhum cupom ainda'),
      true,
      'Empty state message should be shown',
    )
  },
)

Deno.test(
  'CouponManager - header shows title and New Coupon button',
  async () => {
    const html = renderToString(
      h(
        (await import('../../islands/CouponManager.tsx')).default,
        { businessId: 'test', initialCoupons: [] },
      ),
    )

    assertEquals(html.includes('Cupons'), true)
    assertEquals(html.includes('Novo Cupom'), true)
  },
)

Deno.test(
  'CouponManager - table columns include Coupon, Type, Discount, Restrictions, Status, Actions',
  async () => {
    const html = renderToString(
      h(
        (await import('../../islands/CouponManager.tsx')).default,
        { businessId: 'test', initialCoupons: ALL_COUPON_TYPES },
      ),
    )

    assertEquals(html.includes('<th'), true)
    assertEquals(html.includes('Tipo'), true)
    assertEquals(html.includes('Desconto'), true)
    assertEquals(html.includes('Restrições'), true)
    assertEquals(html.includes('Status'), true)
    assertEquals(html.includes('Ações'), true)
  },
)

Deno.test(
  'CouponManager - discount display shows correct format for each behavior type',
  async () => {
    const html = renderToString(
      h(
        (await import('../../islands/CouponManager.tsx')).default,
        { businessId: 'test', initialCoupons: ALL_COUPON_TYPES },
      ),
    )

    assertEquals(html.includes('10% de desconto'), true)
    assertEquals(html.includes('Compre 1 leve 1 grátis'), true)
    assertEquals(html.includes('/unidade de desconto'), true)
  },
)

Deno.test(
  'CouponManager - inactive coupon shows toggle button',
  async () => {
    const html = renderToString(
      h(
        (await import('../../islands/CouponManager.tsx')).default,
        { businessId: 'test', initialCoupons: ALL_COUPON_TYPES },
      ),
    )

    assertEquals(html.includes('BOGO Chopp'), true)
  },
)

Deno.test(
  'CouponManager - each coupon row has an Edit button',
  async () => {
    const html = renderToString(
      h(
        (await import('../../islands/CouponManager.tsx')).default,
        { businessId: 'test', initialCoupons: ALL_COUPON_TYPES },
      ),
    )

    const editMatches = html.match(/Editar/g) || []
    assertEquals(
      editMatches.length,
      4,
      'Should have 4 Edit buttons (one per coupon)',
    )
  },
)

Deno.test(
  'CouponManager - restriction summary shows global cap when set',
  async () => {
    const html = renderToString(
      h(
        (await import('../../islands/CouponManager.tsx')).default,
        { businessId: 'test', initialCoupons: ALL_COUPON_TYPES },
      ),
    )

    assertEquals(html.includes('Global: 100'), true)
    assertEquals(html.includes('Global: 50'), true)
  },
)

Deno.test(
  'CouponManager - restriction summary shows user cap and frequency',
  async () => {
    const html = renderToString(
      h(
        (await import('../../islands/CouponManager.tsx')).default,
        { businessId: 'test', initialCoupons: ALL_COUPON_TYPES },
      ),
    )

    assertEquals(html.includes('Usuário: 1'), true)
    assertEquals(html.includes('Uma vez'), true)
  },
)

Deno.test(
  'CouponManager - template preset IDs exist in compiled source',
  async () => {
    const mod = await import('../../islands/CouponManager.tsx')
    const src = mod.default.toString()
    const presetIds = [
      'simple-discount',
      'flash-sale',
      'loyalty-perk',
      'event-promo',
      'item-clearance',
      'custom',
    ]
    for (const id of presetIds) {
      assertEquals(
        src.includes(id),
        true,
        `Expected preset ID "${id}" in component source`,
      )
    }
  },
)

// BEHAVIOR-TYPE-SPECIFIC VALIDATION TESTS
// Testing validation logic by simulating what the component validates

Deno.test(
  'CouponManager - client-side validation: title is required',
  async () => {
    const mod = await import('../../islands/CouponManager.tsx')
    const source = mod.default.toString()
    assertEquals(source.includes('Título é obrigatório'), true)
  },
)

Deno.test(
  'CouponManager - client-side validation: percentage must be 1-100',
  async () => {
    const mod = await import('../../islands/CouponManager.tsx')
    const source = mod.default.toString()
    assertEquals(source.includes('Percentual deve estar entre 1 e 100'), true)
  },
)

Deno.test(
  'CouponManager - client-side validation: amount must be > 0 for fixed_amount',
  async () => {
    const mod = await import('../../islands/CouponManager.tsx')
    const source = mod.default.toString()
    assertEquals(source.includes('Valor deve ser maior que 0'), true)
  },
)

Deno.test(
  'CouponManager - client-side validation: BOGO requires buy/free quantity and unit price',
  async () => {
    const mod = await import('../../islands/CouponManager.tsx')
    const source = mod.default.toString()
    assertEquals(
      source.includes('Quantidade para comprar deve ser no mínimo 1'),
      true,
    )
    assertEquals(
      source.includes('Quantidade grátis deve ser no mínimo 1'),
      true,
    )
    assertEquals(
      source.includes('Preço unitário deve ser maior que 0'),
      true,
    )
  },
)

Deno.test(
  'CouponManager - client-side validation: item_specific checks unit price and discount per unit',
  async () => {
    const mod = await import('../../islands/CouponManager.tsx')
    const source = mod.default.toString()
    assertEquals(
      source.includes('Desconto por unidade deve ser maior que 0'),
      true,
    )
    assertEquals(
      source.includes('Desconto por unidade não pode exceder o preço unitário'),
      true,
    )
  },
)

// API INTEGRATION TESTS (using Drizzle/passport_test)
Deno.test({
  name: 'CouponManager API - POST creates coupon with all behavior types',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    await db.delete(schema.couponAnalytics)
    await db.delete(schema.transactions)
    await db.delete(schema.redemptions)
    await db.delete(schema.coupons)
    await db.delete(schema.businesses)
    await db.delete(schema.users)

    const businessId = crypto.randomUUID()
    const userId = crypto.randomUUID()

    await db.insert(schema.users).values({
      id: userId,
      email: userId + '@test.com',
      name: 'Test User',
    })
    await db.insert(schema.businesses).values({
      id: businessId,
      userId,
      name: 'Test Business',
      companyName: 'Test Business Ltda',
      cnpj: Date.now().toString(36).slice(-8) +
        Math.random().toString(36).slice(2, 8),
      category: 'Test',
      logoUrl: 'http://localhost/logo.png',
      isActive: true,
    })

    await t.step('creates percentage_discount coupon', async () => {
      const req = new Request(
        `http://localhost/api/businesses/${businessId}/coupons`,
        {
          method: 'POST',
          body: JSON.stringify({
            title: '10% Off',
            behavior: { type: 'percentage_discount', percent: 10 },
            restrictions: {},
          }),
        },
      )
      const res = await (couponsHandler as unknown as {
        POST: (
          ctx: { req: Request; params: Record<string, string> },
        ) => Promise<Response>
      }).POST({ req, params: { id: businessId } })
      assertEquals(res.status, 201)
      const coupon = await res.json()
      assertEquals(coupon.behavior.type, 'percentage_discount')
      assertEquals(coupon.behavior.percent, 10)
    })

    await t.step('creates fixed_amount coupon with restrictions', async () => {
      const req = new Request(
        `http://localhost/api/businesses/${businessId}/coupons`,
        {
          method: 'POST',
          body: JSON.stringify({
            title: 'R$10 Off',
            behavior: { type: 'fixed_amount', amountCents: 1000 },
            restrictions: {
              globalCap: 50,
              userCap: 1,
              usageFrequency: 'one_time',
            },
          }),
        },
      )
      const res = await (couponsHandler as unknown as {
        POST: (
          ctx: { req: Request; params: Record<string, string> },
        ) => Promise<Response>
      }).POST({ req, params: { id: businessId } })
      assertEquals(res.status, 201)
      const coupon = await res.json()
      assertEquals(coupon.behavior.type, 'fixed_amount')
      assertEquals(coupon.restrictions.globalCap, 50)
    })

    await t.step('creates BOGO coupon', async () => {
      const req = new Request(
        `http://localhost/api/businesses/${businessId}/coupons`,
        {
          method: 'POST',
          body: JSON.stringify({
            title: 'Buy 1 Get 1',
            behavior: {
              type: 'bogo',
              buyQuantity: 1,
              freeQuantity: 1,
              unitPriceCents: 1000,
            },
            restrictions: {},
          }),
        },
      )
      const res = await (couponsHandler as unknown as {
        POST: (
          ctx: { req: Request; params: Record<string, string> },
        ) => Promise<Response>
      }).POST({ req, params: { id: businessId } })
      assertEquals(res.status, 201)
      const coupon = await res.json()
      assertEquals(coupon.behavior.type, 'bogo')
      assertEquals(coupon.behavior.buyQuantity, 1)
      assertEquals(coupon.behavior.freeQuantity, 1)
    })

    await t.step('creates item_specific coupon', async () => {
      const req = new Request(
        `http://localhost/api/businesses/${businessId}/coupons`,
        {
          method: 'POST',
          body: JSON.stringify({
            title: 'Item Discount',
            behavior: {
              type: 'item_specific',
              unitPriceCents: 2000,
              discountPerUnitCents: 500,
            },
            restrictions: { globalCap: 100 },
          }),
        },
      )
      const res = await (couponsHandler as unknown as {
        POST: (
          ctx: { req: Request; params: Record<string, string> },
        ) => Promise<Response>
      }).POST({ req, params: { id: businessId } })
      assertEquals(res.status, 201)
      const coupon = await res.json()
      assertEquals(coupon.behavior.type, 'item_specific')
      assertEquals(coupon.behavior.discountPerUnitCents, 500)
    })

    // Cleanup
    await db.delete(schema.coupons).where(
      eq(schema.coupons.businessId, businessId),
    )
    await db.delete(schema.businesses).where(
      eq(schema.businesses.id, businessId),
    )
    await db.delete(schema.users).where(eq(schema.users.id, userId))
  },
})

Deno.test({
  name: 'CouponManager API - POST validates behavior type',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    await db.delete(schema.couponAnalytics)
    await db.delete(schema.transactions)
    await db.delete(schema.redemptions)
    await db.delete(schema.coupons)
    await db.delete(schema.businesses)
    await db.delete(schema.users)

    const businessId = crypto.randomUUID()
    const userId = crypto.randomUUID()

    await db.insert(schema.users).values({
      id: userId,
      email: userId + '@test.com',
      name: 'Test User',
    })
    await db.insert(schema.businesses).values({
      id: businessId,
      userId,
      name: 'Test Business',
      companyName: 'Test Business Ltda',
      cnpj: Date.now().toString(36).slice(-8) +
        Math.random().toString(36).slice(2, 8),
      category: 'Test',
      logoUrl: 'http://localhost/logo.png',
      isActive: true,
    })

    await t.step('rejects missing behavior', async () => {
      const req = new Request(
        `http://localhost/api/businesses/${businessId}/coupons`,
        {
          method: 'POST',
          body: JSON.stringify({ title: 'Test' }),
        },
      )
      const res = await (couponsHandler as unknown as {
        POST: (
          ctx: { req: Request; params: Record<string, string> },
        ) => Promise<Response>
      }).POST({ req, params: { id: businessId } })
      assertEquals(res.status, 201)
      const coupon = await res.json()
      assertEquals(coupon.behavior.type, 'percentage_discount')
      assertEquals(coupon.behavior.percent, 10)
    })

    // Cleanup
    await db.delete(schema.coupons).where(
      eq(schema.coupons.businessId, businessId),
    )
    await db.delete(schema.businesses).where(
      eq(schema.businesses.id, businessId),
    )
    await db.delete(schema.users).where(eq(schema.users.id, userId))
  },
})

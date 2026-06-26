import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { handler } from '../routes/business/[id].tsx'
import { db } from '../lib/db.ts'
import * as schema from '../db/schema.ts'
import { eq } from 'drizzle-orm'

function makeBusiness(id: string): typeof schema.businesses.$inferInsert {
  return {
    id,
    userId: 'user_' + id,
    name: 'Test Business',
    companyName: 'Test Business Ltda',
    cnpj: '11222333000181',
    category: 'Alimentação',
    description: 'A test business',
    logoUrl: '',
    isActive: true,
  }
}

function makeCoupon(
  id: string,
  businessId: string,
): typeof schema.coupons.$inferInsert {
  return {
    id,
    businessId,
    title: 'Test Coupon ' + id,
    behavior: { type: 'percentage_discount', percent: 10 },
    restrictions: {},
    isActive: true,
  }
}

type HandlerCtx = { params: { id: string }; req: Request }

async function cleanupAll() {
  await db.delete(schema.couponAnalytics)
  await db.delete(schema.transactions)
  await db.delete(schema.redemptions)
  await db.delete(schema.coupons)
  await db.delete(schema.businesses)
  await db.delete(schema.users)
}

Deno.test({
  name: 'Business Detail Page - view counter increments for each coupon',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    await cleanupAll()
    const bizId = 'biz_vc_' + Math.random().toString(36).slice(2)
    const couponId = 'coupon_vc_' + Math.random().toString(36).slice(2)
    const userId = 'user_' + bizId

    const business = makeBusiness(bizId)
    const coupon = makeCoupon(couponId, bizId)

    // Set up user, business, coupon via Drizzle
    await db.insert(schema.users).values({
      id: userId,
      email: userId + '@test.com',
      name: 'Test User',
    })
    await db.insert(schema.businesses).values(
      business,
    )
    await db.insert(schema.coupons).values(coupon)

    await (handler as unknown as {
      GET: (ctx: HandlerCtx) => Promise<Response | { data: unknown }>
    }).GET({
      params: { id: bizId },
      req: new Request(`http://localhost:8000/business/${bizId}`),
    })

    // Wait for fire-and-forget incrementViewCount to settle
    await new Promise((r) => setTimeout(r, 100))

    // Verify view counter was incremented in coupon_analytics table
    const [analytics] = await db
      .select()
      .from(schema.couponAnalytics)
      .where(eq(schema.couponAnalytics.couponId, couponId))
      .limit(1)
    assertExists(analytics)
    assertEquals(analytics.views, 1)
  },
})

Deno.test({
  name: 'Business Detail Page - repeated views increment counter monotonically',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    await cleanupAll()
    const bizId = 'biz_rep_' + Math.random().toString(36).slice(2)
    const couponId = 'coupon_rep_' + Math.random().toString(36).slice(2)
    const userId = 'user_' + bizId

    await db.insert(schema.users).values({
      id: userId,
      email: userId + '@test.com',
      name: 'Test User',
    })
    await db.insert(schema.businesses).values(
      makeBusiness(bizId),
    )
    await db.insert(schema.coupons).values(
      makeCoupon(couponId, bizId),
    )

    // First view
    await (handler as unknown as {
      GET: (ctx: HandlerCtx) => Promise<Response | { data: unknown }>
    }).GET({
      params: { id: bizId },
      req: new Request(`http://localhost:8000/business/${bizId}`),
    })
    await new Promise((r) => setTimeout(r, 100))

    // Second view
    await (handler as unknown as {
      GET: (ctx: HandlerCtx) => Promise<Response | { data: unknown }>
    }).GET({
      params: { id: bizId },
      req: new Request(`http://localhost:8000/business/${bizId}`),
    })
    await new Promise((r) => setTimeout(r, 100))

    // Third view
    await (handler as unknown as {
      GET: (ctx: HandlerCtx) => Promise<Response | { data: unknown }>
    }).GET({
      params: { id: bizId },
      req: new Request(`http://localhost:8000/business/${bizId}`),
    })
    await new Promise((r) => setTimeout(r, 100))

    const [analytics] = await db
      .select()
      .from(schema.couponAnalytics)
      .where(eq(schema.couponAnalytics.couponId, couponId))
      .limit(1)
    assertExists(analytics)
    assertEquals(analytics.views, 3)
  },
})

Deno.test({
  name:
    'Business Detail Page - handler returns response before counter completes',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    await cleanupAll()
    const bizId = 'biz_ff_' + Math.random().toString(36).slice(2)
    const couponId = 'coupon_ff_' + Math.random().toString(36).slice(2)
    const userId = 'user_' + bizId

    await db.insert(schema.users).values({
      id: userId,
      email: userId + '@test.com',
      name: 'Test User',
    })
    await db.insert(schema.businesses).values(
      makeBusiness(bizId),
    )
    await db.insert(schema.coupons).values(
      makeCoupon(couponId, bizId),
    )

    const start = Date.now()

    const res = await (handler as unknown as {
      GET: (ctx: HandlerCtx) => Promise<Response | { data: unknown }>
    }).GET({
      params: { id: bizId },
      req: new Request(`http://localhost:8000/business/${bizId}`),
    })

    // Page data returned immediately
    assertExists(res)

    // Wait for fire-and-forget operations to settle
    await new Promise((r) => setTimeout(r, 100))

    // Verify counter was incremented despite fire-and-forget
    const [analytics] = await db
      .select()
      .from(schema.couponAnalytics)
      .where(eq(schema.couponAnalytics.couponId, couponId))
      .limit(1)
    assertExists(analytics)
    assertEquals(analytics.views, 1)
  },
})

Deno.test({
  name: 'Business Detail Page - coupons never viewed have no analytics entry',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    await cleanupAll()
    const bizId = 'biz_nv_' + Math.random().toString(36).slice(2)
    const couponId = 'coupon_nv_' + Math.random().toString(36).slice(2)
    const userId = 'user_' + bizId

    // Insert user and business for FK constraints
    await db.insert(schema.users).values({
      id: userId,
      email: userId + '@test.com',
      name: 'Test User',
    })
    await db.insert(schema.businesses).values(
      makeBusiness(bizId),
    )

    // Create coupon but never visit the business page
    await db.insert(schema.coupons).values({
      id: couponId,
      businessId: bizId,
      title: 'Unviewed Coupon',
      behavior: { type: 'percentage_discount', percent: 10 },
      restrictions: {},
      isActive: true,
    })

    // Verify no analytics entry exists
    const [analytics] = await db
      .select()
      .from(schema.couponAnalytics)
      .where(eq(schema.couponAnalytics.couponId, couponId))
      .limit(1)
    assertEquals(analytics, undefined)
  },
})

Deno.test({
  name: 'Business Detail Page - 404 for non-existent business',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    await cleanupAll()
    const bizId = 'biz_404_' + Math.random().toString(36).slice(2)

    const res = await (handler as unknown as {
      GET: (ctx: HandlerCtx) => Promise<Response>
    }).GET({
      params: { id: bizId },
      req: new Request(`http://localhost:8000/business/${bizId}`),
    })

    assertEquals(res.status, 404)
  },
})

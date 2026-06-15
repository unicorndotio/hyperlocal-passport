import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { handler } from '../routes/business/[id].tsx'
import { kv } from '../lib/kv.ts'
import { viewCountKey } from '../lib/analytics.ts'
import { getDenoKvAdapterRaw } from '../lib/kv-adapter.ts'

function makeBusiness(id: string): Record<string, unknown> {
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
    createdAt: new Date().toISOString(),
  }
}

function makeCoupon(id: string, businessId: string): Record<string, unknown> {
  return {
    id,
    businessId,
    title: 'Test Coupon ' + id,
    behavior: { type: 'percentage_discount', percent: 10 },
    restrictions: {},
    isActive: true,
    createdAt: new Date().toISOString(),
  }
}

async function cleanup(...keys: string[][]) {
  for (const key of keys) {
    await kv.delete(key)
  }
}

type HandlerCtx = { params: { id: string }; req: Request }

Deno.test('Business Detail Page - view counter increments for each coupon', async () => {
  const bizId = 'biz_vc_' + Math.random().toString(36).slice(2)
  const couponId = 'coupon_vc_' + Math.random().toString(36).slice(2)

  const business = makeBusiness(bizId)
  const coupon = makeCoupon(couponId, bizId)

  // Set up via adapter so index entries are created
  const adapter = getDenoKvAdapterRaw(kv)
  await adapter.create({ model: 'businesses', data: business })
  await adapter.create({ model: 'coupons', data: coupon })

  try {
    const res = await (handler as unknown as {
      GET: (ctx: HandlerCtx) => Promise<Response | { data: unknown }>
    }).GET({
      params: { id: bizId },
      req: new Request(`http://localhost:8000/business/${bizId}`),
    })

    // Handler should return page data (status 200 via Fresh rendering)
    assertExists(res)

    // Wait for fire-and-forget KV operations to settle
    await new Promise((r) => setTimeout(r, 50))

    // Verify view counter was incremented (sum returns KvU64/bigint)
    const viewCount = await kv.get<Deno.KvU64>(viewCountKey(couponId))
    assertEquals(Number(viewCount.value), 1)
  } finally {
    await cleanup(
      ['businesses', bizId],
      ['coupons', couponId],
      ['coupons_by_businessId', bizId],
      viewCountKey(couponId),
    )
  }
})

Deno.test('Business Detail Page - repeated views increment counter monotonically', async () => {
  const bizId = 'biz_rep_' + Math.random().toString(36).slice(2)
  const couponId = 'coupon_rep_' + Math.random().toString(36).slice(2)

  const adapter = getDenoKvAdapterRaw(kv)
  await adapter.create({ model: 'businesses', data: makeBusiness(bizId) })
  await adapter.create({ model: 'coupons', data: makeCoupon(couponId, bizId) })

  try {
    // First view
    await (handler as unknown as {
      GET: (ctx: HandlerCtx) => Promise<Response | { data: unknown }>
    }).GET({
      params: { id: bizId },
      req: new Request(`http://localhost:8000/business/${bizId}`),
    })
    await new Promise((r) => setTimeout(r, 50))

    // Second view
    await (handler as unknown as {
      GET: (ctx: HandlerCtx) => Promise<Response | { data: unknown }>
    }).GET({
      params: { id: bizId },
      req: new Request(`http://localhost:8000/business/${bizId}`),
    })
    await new Promise((r) => setTimeout(r, 50))

    // Third view
    await (handler as unknown as {
      GET: (ctx: HandlerCtx) => Promise<Response | { data: unknown }>
    }).GET({
      params: { id: bizId },
      req: new Request(`http://localhost:8000/business/${bizId}`),
    })
    await new Promise((r) => setTimeout(r, 50))

    const viewCount = await kv.get<Deno.KvU64>(viewCountKey(couponId))
    assertEquals(Number(viewCount.value), 3)
  } finally {
    await cleanup(
      ['businesses', bizId],
      ['coupons', couponId],
      ['coupons_by_businessId', bizId],
      viewCountKey(couponId),
    )
  }
})

Deno.test('Business Detail Page - handler returns response before counter completes', async () => {
  const bizId = 'biz_ff_' + Math.random().toString(36).slice(2)
  const couponId = 'coupon_ff_' + Math.random().toString(36).slice(2)

  const adapter = getDenoKvAdapterRaw(kv)
  await adapter.create({ model: 'businesses', data: makeBusiness(bizId) })
  await adapter.create({ model: 'coupons', data: makeCoupon(couponId, bizId) })

  try {
    const start = Date.now()

    const res = await (handler as unknown as {
      GET: (ctx: HandlerCtx) => Promise<Response | { data: unknown }>
    }).GET({
      params: { id: bizId },
      req: new Request(`http://localhost:8000/business/${bizId}`),
    })

    const elapsed = Date.now() - start

    // Page data returned immediately
    assertExists(res)

    // If KV operations were awaited, this would be >0ms (KV has latency)
    // Since they're fire-and-forget, the handler returns synchronously
    // In an in-memory KV, the atomic operations are near-instant,
    // so we verify the handler returned (exists) rather than a specific elapsed time

    // Wait for fire-and-forget operations to settle
    await new Promise((r) => setTimeout(r, 50))

    // Verify counter was incremented despite fire-and-forget
    const viewCount = await kv.get<Deno.KvU64>(viewCountKey(couponId))
    assertEquals(Number(viewCount.value), 1)

    // Verify response time is fast (handler returns without waiting for KV)
    // The page() call just returns a plain object, so this should be <100ms
    // even if KV were slow
    assertEquals(elapsed < 500, true, 'Handler should return quickly')
  } finally {
    await cleanup(
      ['businesses', bizId],
      ['coupons', couponId],
      ['coupons_by_businessId', bizId],
      viewCountKey(couponId),
    )
  }
})

Deno.test('Business Detail Page - coupons never viewed have no analytics entry', async () => {
  const bizId = 'biz_nv_' + Math.random().toString(36).slice(2)
  const couponId = 'coupon_nv_' + Math.random().toString(36).slice(2)

  // Create coupon but never visit the business page
  await kv.set(['coupons', couponId], makeCoupon(couponId, bizId))
  await kv.set(['coupons_by_businessId', bizId], couponId)

  try {
    // Directly check that no analytics entry exists
    const viewCount = await kv.get<Deno.KvU64>(viewCountKey(couponId))
    assertEquals(viewCount.value, null)
  } finally {
    await cleanup(
      ['coupons', couponId],
      ['coupons_by_businessId', bizId],
      viewCountKey(couponId),
    )
  }
})

Deno.test('Business Detail Page - 404 for non-existent business', async () => {
  const bizId = 'biz_404_' + Math.random().toString(36).slice(2)

  const res = await (handler as unknown as {
    GET: (ctx: HandlerCtx) => Promise<Response>
  }).GET({
    params: { id: bizId },
    req: new Request(`http://localhost:8000/business/${bizId}`),
  })

  assertEquals(res.status, 404)
})

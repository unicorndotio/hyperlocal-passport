import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { handler as listHandler } from '../routes/api/admin/coupons/index.ts'
import { handler as couponHandler } from '../routes/api/admin/coupons/[id].ts'
import { applyMiddleware } from '../routes/_middleware.ts'
import { auth } from '../lib/auth.ts'
import { kv } from '../lib/kv.ts'

function makeCoupon(
  id: string,
  businessId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    businessId,
    title: 'Test Coupon',
    behavior: { type: 'percentage_discount', percent: 10 },
    restrictions: {},
    isActive: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeBusiness(id: string, name: string) {
  return {
    id,
    name,
    userId: 'owner-1',
    isActive: true,
    companyName: name,
    cnpj: '11222333000181',
    category: 'Test',
    description: 'Test business',
  }
}

Deno.test('Admin Coupons API - GET /api/admin/coupons', async (t) => {
  const biz1Id = 'admc_biz1_' + Math.random().toString(36).slice(2)
  const biz2Id = 'admc_biz2_' + Math.random().toString(36).slice(2)
  const cpn1Id = 'admc_cpn1_' + Math.random().toString(36).slice(2)
  const cpn2Id = 'admc_cpn2_' + Math.random().toString(36).slice(2)
  const cpn3Id = 'admc_cpn3_' + Math.random().toString(36).slice(2)

  try {
    await kv.set(['businesses', biz1Id], makeBusiness(biz1Id, 'Biz One'))
    await kv.set(['businesses', biz2Id], makeBusiness(biz2Id, 'Biz Two'))

    await kv.set(
      ['coupons', cpn1Id],
      makeCoupon(cpn1Id, biz1Id, { title: 'Coupon A' }),
    )
    await kv.set(
      ['coupons', cpn2Id],
      makeCoupon(cpn2Id, biz1Id, {
        title: 'Coupon B',
        isActive: false,
        behavior: { type: 'fixed_amount', amountCents: 500 },
      }),
    )
    await kv.set(
      ['coupons', cpn3Id],
      makeCoupon(cpn3Id, biz2Id, {
        title: 'Coupon C',
        behavior: { type: 'bogo', buyQuantity: 2, freeQuantity: 1, unitPriceCents: 1500 },
      }),
    )

    await t.step('lists all coupons with correct shape', async () => {
      const req = new Request('http://localhost:8000/api/admin/coupons')
      const getHandler = listHandler.GET as (
        ctx: { req: Request },
      ) => Promise<Response>
      const res = await getHandler({ req })
      assertEquals(res.status, 200)
      const data = await res.json()
      assertEquals(data.total >= 3, true)

      const cpA = data.coupons.find(
        (c: { title: string }) => c.title === 'Coupon A',
      )
      assertEquals(cpA !== undefined, true)
      assertEquals(cpA.businessName, 'Biz One')
      assertEquals(cpA.behavior.type, 'percentage_discount')
      assertEquals(cpA.isActive, true)

      const cpC = data.coupons.find(
        (c: { title: string }) => c.title === 'Coupon C',
      )
      assertEquals(cpC !== undefined, true)
      assertEquals(cpC.behavior.type, 'bogo')
    })

    await t.step('filters by businessId', async () => {
      const req = new Request(
        `http://localhost:8000/api/admin/coupons?businessId=${biz1Id}`,
      )
      const getHandler = listHandler.GET as (
        ctx: { req: Request },
      ) => Promise<Response>
      const res = await getHandler({ req })
      const data = await res.json()
      assertEquals(data.total, 2)
      assertEquals(data.coupons.length, 2)
      for (const c of data.coupons) {
        assertEquals(c.businessId, biz1Id)
      }
    })

    await t.step('filters by status active', async () => {
      const req = new Request(
        'http://localhost:8000/api/admin/coupons?status=active',
      )
      const getHandler = listHandler.GET as (
        ctx: { req: Request },
      ) => Promise<Response>
      const res = await getHandler({ req })
      const data = await res.json()
      const ourCoupons = data.coupons.filter(
        (c: { businessId: string }) =>
          c.businessId === biz1Id || c.businessId === biz2Id,
      )
      assertEquals(ourCoupons.length, 2)
      for (const c of ourCoupons) {
        assertEquals(c.isActive, true)
      }
    })

    await t.step('filters by status inactive', async () => {
      const req = new Request(
        'http://localhost:8000/api/admin/coupons?status=inactive',
      )
      const getHandler = listHandler.GET as (
        ctx: { req: Request },
      ) => Promise<Response>
      const res = await getHandler({ req })
      const data = await res.json()
      const ourCoupons = data.coupons.filter(
        (c: { businessId: string }) =>
          c.businessId === biz1Id || c.businessId === biz2Id,
      )
      assertEquals(ourCoupons.length, 1)
      assertEquals(ourCoupons[0].isActive, false)
      assertEquals(ourCoupons[0].title, 'Coupon B')
    })
  } finally {
    await kv.delete(['businesses', biz1Id])
    await kv.delete(['businesses', biz2Id])
    await kv.delete(['coupons', cpn1Id])
    await kv.delete(['coupons', cpn2Id])
    await kv.delete(['coupons', cpn3Id])
  }
})

Deno.test('Admin Coupons API - PUT /api/admin/coupons/[id]', async (t) => {
  const bizId = 'admc_putbiz_' + Math.random().toString(36).slice(2)
  const cpnId = 'admc_putcpn_' + Math.random().toString(36).slice(2)

  try {
    await kv.set(['businesses', bizId], makeBusiness(bizId, 'Put Biz'))
    await kv.set(
      ['coupons', cpnId],
      makeCoupon(cpnId, bizId, { title: 'Original Title' }),
    )

    await t.step('updates coupon regardless of ownership', async () => {
      const req = new Request(
        `http://localhost:8000/api/admin/coupons/${cpnId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Updated Title',
            isActive: false,
          }),
        },
      )
      const putHandler = couponHandler.PUT as (
        ctx: { req: Request; params: Record<string, string> },
      ) => Promise<Response>
      const res = await putHandler({ req, params: { id: cpnId } })
      assertEquals(res.status, 200)
      const data = await res.json()
      assertEquals(data.title, 'Updated Title')
      assertEquals(data.isActive, false)
      assertEquals(data.businessId, bizId)

      const stored = await kv.get(['coupons', cpnId])
      assertEquals(
        (stored.value as Record<string, unknown>).title,
        'Updated Title',
      )
    })

    await t.step('returns 404 for non-existent coupon', async () => {
      const req = new Request(
        'http://localhost:8000/api/admin/coupons/nonexistent',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'x' }),
        },
      )
      const putHandler = couponHandler.PUT as (
        ctx: { req: Request; params: Record<string, string> },
      ) => Promise<Response>
      const res = await putHandler({
        req,
        params: { id: 'nonexistent' },
      })
      assertEquals(res.status, 404)
    })

    await t.step('returns 400 for invalid JSON', async () => {
      const req = new Request(
        `http://localhost:8000/api/admin/coupons/${cpnId}`,
        {
          method: 'PUT',
          body: 'not-json',
        },
      )
      const putHandler = couponHandler.PUT as (
        ctx: { req: Request; params: Record<string, string> },
      ) => Promise<Response>
      const res = await putHandler({ req, params: { id: cpnId } })
      assertEquals(res.status, 400)
    })

    await t.step('returns 400 for invalid behavior update', async () => {
      const req = new Request(
        `http://localhost:8000/api/admin/coupons/${cpnId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            behavior: { type: 'fixed_amount' },
          }),
        },
      )
      const putHandler = couponHandler.PUT as (
        ctx: { req: Request; params: Record<string, string> },
      ) => Promise<Response>
      const res = await putHandler({ req, params: { id: cpnId } })
      assertEquals(res.status, 400)
      const data = await res.json()
      assertEquals(data.error, 'amountCents is required and must be a number')
    })
  } finally {
    await kv.delete(['businesses', bizId])
    await kv.delete(['coupons', cpnId])
  }
})

Deno.test('Admin Coupons API - DELETE /api/admin/coupons/[id]', async (t) => {
  const bizId = 'admc_delbiz_' + Math.random().toString(36).slice(2)
  const cpnId = 'admc_delcpn_' + Math.random().toString(36).slice(2)

  try {
    await kv.set(['businesses', bizId], makeBusiness(bizId, 'Del Biz'))
    await kv.set(
      ['coupons', cpnId],
      makeCoupon(cpnId, bizId, { title: 'To Delete' }),
    )

    await t.step('deletes coupon regardless of ownership', async () => {
      const req = new Request(
        `http://localhost:8000/api/admin/coupons/${cpnId}`,
        { method: 'DELETE' },
      )
      const deleteHandler = couponHandler.DELETE as (
        ctx: { req: Request; params: Record<string, string> },
      ) => Promise<Response>
      const res = await deleteHandler({ req, params: { id: cpnId } })
      assertEquals(res.status, 204)

      const stored = await kv.get(['coupons', cpnId])
      assertEquals(stored.value, null)
    })

    await t.step('returns 404 for non-existent coupon', async () => {
      const req = new Request(
        'http://localhost:8000/api/admin/coupons/nonexistent',
        { method: 'DELETE' },
      )
      const deleteHandler = couponHandler.DELETE as (
        ctx: { req: Request; params: Record<string, string> },
      ) => Promise<Response>
      const res = await deleteHandler({
        req,
        params: { id: 'nonexistent' },
      })
      assertEquals(res.status, 404)
    })
  } finally {
    await kv.delete(['businesses', bizId])
    await kv.delete(['coupons', cpnId])
  }
})

Deno.test('Admin Coupons API - auth enforcement', async (t) => {
  const originalGetSession = auth.api.getSession

  const adminUrl = 'http://localhost:8000/api/admin/coupons'

  await t.step('unauthenticated request returns 401', async () => {
    ;(auth.api as unknown as { getSession: unknown }).getSession = () =>
      Promise.resolve(null)

    const req = new Request(adminUrl)
    const res = await applyMiddleware(
      req,
      () => Promise.resolve(new Response('OK')),
    )

    assertEquals(res.status, 401)
    const body = await res.json()
    assertEquals(body.error, 'Unauthorized')
  })

  await t.step('non-admin user returns 403', async () => {
    ;(auth.api as unknown as { getSession: unknown }).getSession = () =>
      Promise.resolve({
        session: {
          id: 's1',
          userId: 'u1',
          expiresAt: new Date(Date.now() + 100000),
          token: 't1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        user: {
          id: 'u1',
          email: 'resident@test.com',
          emailVerified: true,
          name: 'Resident',
          role: 'resident',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as unknown)

    const req = new Request(adminUrl)
    const res = await applyMiddleware(
      req,
      () => Promise.resolve(new Response('OK')),
    )

    assertEquals(res.status, 403)
    const body = await res.json()
    assertEquals(body.error, 'Forbidden: Admin access required')
  })

  await t.step('business user returns 403', async () => {
    ;(auth.api as unknown as { getSession: unknown }).getSession = () =>
      Promise.resolve({
        session: {
          id: 's2',
          userId: 'u2',
          expiresAt: new Date(Date.now() + 100000),
          token: 't2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        user: {
          id: 'u2',
          email: 'business@test.com',
          emailVerified: true,
          name: 'Business',
          role: 'business',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as unknown)

    const req = new Request(adminUrl)
    const res = await applyMiddleware(
      req,
      () => Promise.resolve(new Response('OK')),
    )

    assertEquals(res.status, 403)
    const body = await res.json()
    assertEquals(body.error, 'Forbidden: Admin access required')
  })

  await t.step('admin user passes middleware', async () => {
    ;(auth.api as unknown as { getSession: unknown }).getSession = () =>
      Promise.resolve({
        session: {
          id: 's3',
          userId: 'u3',
          expiresAt: new Date(Date.now() + 100000),
          token: 't3',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        user: {
          id: 'u3',
          email: 'admin@test.com',
          emailVerified: true,
          name: 'Admin',
          role: 'admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as unknown)

    const req = new Request(adminUrl)
    const res = await applyMiddleware(
      req,
      () => Promise.resolve(new Response('OK')),
    )

    assertEquals(res.status, 200)
    assertEquals(await res.text(), 'OK')
  })

  auth.api.getSession = originalGetSession
})

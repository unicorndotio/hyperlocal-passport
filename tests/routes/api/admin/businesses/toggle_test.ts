import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import {
  handler,
  handleToggle,
} from '../../../../../routes/api/admin/businesses/[id]/toggle.ts'
import { applyMiddleware } from '../../../../../routes/_middleware.ts'
import { auth } from '../../../../../lib/auth.ts'
import { db } from '../../../../../lib/db.ts'
import * as schema from '../../../../../db/schema.ts'
import { eq } from 'drizzle-orm'

const testBusinessId = 'biz-toggle-test-1'

function makeBusiness(overrides: Record<string, unknown> = {}) {
  return {
    id: testBusinessId,
    userId: 'owner-1',
    name: 'Empresa Toggle Test',
    companyName: 'Empresa Toggle Test Ltda',
    cnpj: '11222333000181',
    category: 'Alimentação',
    description: 'Uma empresa para teste de toggle',
    logoUrl: 'http://localhost:8000/api/uploads/logo.png',
    isActive: true,
    ...overrides,
  }
}

async function seedBusiness(
  data: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const biz = makeBusiness(data)
  // Ensure parent user exists
  const [existing] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, biz.userId as string))
    .limit(1)
  if (!existing) {
    await db.insert(schema.users).values({
      id: biz.userId as string,
      email: biz.userId + '@test.com',
      name: 'Owner',
    })
  }
  await db.insert(schema.businesses).values(biz as any)
  return biz
}

async function cleanupBusiness(id: string) {
  const [biz] = await db
    .select()
    .from(schema.businesses)
    .where(eq(schema.businesses.id, id))
    .limit(1)
  if (biz) {
    await db.delete(schema.businesses).where(eq(schema.businesses.id, id))
  }
}

async function cleanupAll() {
  await db.delete(schema.couponAnalytics)
  await db.delete(schema.transactions)
  await db.delete(schema.redemptions)
  await db.delete(schema.coupons)
  await db.delete(schema.businesses)
  await db.delete(schema.users)
}

Deno.test({
  name: 'PUT /api/admin/businesses/[id]/toggle',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    await cleanupAll()

    await t.step('toggles isActive from true to false', async () => {
      const biz = await seedBusiness({ isActive: true })
      try {
        const res = await handleToggle(biz.id as string, false)
        assertEquals(res.status, 200)
        const body = await res.json()
        assertEquals(body.isActive, false)
      } finally {
        await cleanupBusiness(biz.id as string)
      }
    })

    await t.step('toggles isActive from false to true', async () => {
      const biz = await seedBusiness({ isActive: false })
      try {
        const res = await handleToggle(biz.id as string, true)
        assertEquals(res.status, 200)
        const body = await res.json()
        assertEquals(body.isActive, true)
      } finally {
        await cleanupBusiness(biz.id as string)
      }
    })

    await t.step('returns 404 for non-existent business', async () => {
      const res = await handleToggle('non-existent-id', true)
      assertEquals(res.status, 404)
      const body = await res.json()
      assertEquals(body.error, 'Business not found')
    })

    await t.step(
      'defaults to !currentValue when isActive is missing',
      async () => {
        const biz = await seedBusiness({ isActive: true })
        try {
          const res = await handleToggle(biz.id as string)
          assertEquals(res.status, 200)
          const body = await res.json()
          assertEquals(body.isActive, false)
        } finally {
          await cleanupBusiness(biz.id as string)
        }
      },
    )

    await t.step('returns 400 for invalid JSON body', async () => {
      const biz = await seedBusiness()
      try {
        const req = new Request(
          `http://localhost:8000/api/admin/businesses/${biz.id}/toggle`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: 'not-json',
          },
        )
        const putHandler = handler.PUT as (
          ctx: { req: Request; params: Record<string, string> },
        ) => Promise<Response>
        const res = await putHandler({ req, params: { id: biz.id as string } })
        assertEquals(res.status, 400)
        const body = await res.json()
        assertEquals(body.error, 'Invalid JSON')
      } finally {
        await cleanupBusiness(biz.id as string)
      }
    })

    await t.step(
      'admin toggle persists isActive change in database',
      async () => {
        const biz = await seedBusiness({ isActive: true })
        try {
          const req = new Request(
            `http://localhost:8000/api/admin/businesses/${biz.id}/toggle`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ isActive: false }),
            },
          )
          const putHandler = handler.PUT as (
            ctx: { req: Request; params: Record<string, string> },
          ) => Promise<Response>
          const res = await putHandler({
            req,
            params: { id: biz.id as string },
          })
          assertEquals(res.status, 200)

          const [stored] = await db
            .select()
            .from(schema.businesses)
            .where(eq(schema.businesses.id, biz.id as string))
            .limit(1)
          assertEquals(stored.isActive, false)
        } finally {
          await cleanupBusiness(biz.id as string)
        }
      },
    )
  },
})

Deno.test('Toggle middleware auth enforcement', async (t) => {
  const originalGetSession = auth.api.getSession

  const toggleUrl = 'http://localhost:8000/api/admin/businesses/some-id/toggle'

  await t.step('unauthenticated request returns 401', async () => {
    ;(auth.api as unknown as { getSession: unknown }).getSession = () =>
      Promise.resolve(null)

    const req = new Request(toggleUrl, { method: 'PUT' })
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

    const req = new Request(toggleUrl, { method: 'PUT' })
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

    const req = new Request(toggleUrl, { method: 'PUT' })
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

    const req = new Request(toggleUrl, { method: 'PUT' })
    const res = await applyMiddleware(
      req,
      () => Promise.resolve(new Response('OK')),
    )

    assertEquals(res.status, 200)
    assertEquals(await res.text(), 'OK')
  })

  auth.api.getSession = originalGetSession
})

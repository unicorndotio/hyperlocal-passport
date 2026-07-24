import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import {
  handleLedgerPayment,
  handler,
} from '../../../../../routes/api/admin/businesses/[id]/ledger.ts'
import { applyMiddleware } from '../../../../../routes/_middleware.ts'
import { auth } from '../../../../../lib/auth.ts'
import { db } from '../../../../../lib/db.ts'
import * as schema from '../../../../../db/schema.ts'
import { eq } from 'drizzle-orm'

function makeBusiness(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    userId: 'ledger-owner-' + crypto.randomUUID(),
    name: 'Empresa Ledger Test',
    companyName: 'Empresa Ledger Test Ltda',
    cnpj: crypto.randomUUID().slice(0, 14),
    category: 'Serviços',
    description: 'Uma empresa para teste de ledger',
    logoUrl: 'http://localhost:8000/api/uploads/logo.png',
    isActive: false,
    ...overrides,
  }
}

async function seedBusiness(
  data: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const biz = makeBusiness(data)
  const [existing] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, biz.userId as string))
    .limit(1)
  if (!existing) {
    await db.insert(schema.users).values({
      id: biz.userId as string,
      email: biz.userId + '@test.com',
      name: 'Ledger Owner',
    })
  }
  await db.insert(schema.businesses).values(biz as any)
  return biz
}

async function cleanupAll() {
  await db.delete(schema.partnerLedger)
  await db.delete(schema.couponAnalytics)
  await db.delete(schema.transactions)
  await db.delete(schema.redemptions)
  await db.delete(schema.coupons)
  await db.delete(schema.merchantPosts)
  await db.delete(schema.fileMetadata)
  await db.delete(schema.signals)
  await db.delete(schema.businesses)
  await db.delete(schema.users)
}

Deno.test({
  name: 'POST /api/admin/businesses/[id]/ledger',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    await cleanupAll()

    await t.step(
      'logs payment and activates business with new expirationDate',
      async () => {
        const biz = await seedBusiness({ isActive: false })
        try {
          const paymentDate = new Date('2026-07-01')
          const res = await handleLedgerPayment(
            biz.id as string,
            50000,
            3,
            paymentDate,
          )
          assertEquals(res.status, 200)
          const body = await res.json()
          assertEquals(body.isActive, true)
          assertExists(body.expirationDate)
          const expDate = new Date(body.expirationDate)
          const now = new Date()
          const expected = new Date(now)
          expected.setMonth(expected.getMonth() + 3)
          assertEquals(expDate.getFullYear(), expected.getFullYear())
          assertEquals(expDate.getMonth(), expected.getMonth())
        } finally {
          await cleanupAll()
        }
      },
    )

    await t.step(
      'extends expirationDate from existing date',
      async () => {
        const existingExp = new Date('2026-10-01')
        const biz = await seedBusiness({
          isActive: true,
          expirationDate: existingExp,
        })
        try {
          const paymentDate = new Date('2026-07-01')
          const res = await handleLedgerPayment(
            biz.id as string,
            50000,
            2,
            paymentDate,
          )
          assertEquals(res.status, 200)
          const body = await res.json()
          const expDate = new Date(body.expirationDate)
          const expected = new Date(existingExp)
          expected.setMonth(expected.getMonth() + 2)
          assertEquals(expDate.getFullYear(), expected.getFullYear())
          assertEquals(expDate.getMonth(), expected.getMonth())
        } finally {
          await cleanupAll()
        }
      },
    )

    await t.step(
      'returns 400 for non-positive amountCents',
      async () => {
        const biz = await seedBusiness()
        try {
          const res = await handleLedgerPayment(
            biz.id as string,
            0,
            1,
            new Date(),
          )
          assertEquals(res.status, 400)
          const body = await res.json()
          assertEquals(
            body.error,
            'amountCents must be a positive integer',
          )
        } finally {
          await cleanupAll()
        }
      },
    )

    await t.step(
      'returns 400 for non-positive months',
      async () => {
        const biz = await seedBusiness()
        try {
          const res = await handleLedgerPayment(
            biz.id as string,
            1000,
            0,
            new Date(),
          )
          assertEquals(res.status, 400)
          const body = await res.json()
          assertEquals(body.error, 'months must be a positive integer')
        } finally {
          await cleanupAll()
        }
      },
    )

    await t.step('returns 404 for non-existent business', async () => {
      const res = await handleLedgerPayment(
        crypto.randomUUID(),
        1000,
        1,
        new Date(),
      )
      assertEquals(res.status, 404)
      const body = await res.json()
      assertEquals(body.error, 'Business not found')
    })

    await t.step(
      'returns 400 when required fields are missing via handler',
      async () => {
        const biz = await seedBusiness()
        try {
          const req = new Request(
            `http://localhost:8000/api/admin/businesses/${biz.id}/ledger`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ amountCents: 1000 }),
            },
          )
          const postHandler = handler.POST as (
            ctx: { req: Request; params: Record<string, string> },
          ) => Promise<Response>
          const res = await postHandler({
            req,
            params: { id: biz.id as string },
          })
          assertEquals(res.status, 400)
          const body = await res.json()
          assertExists(body.error)
        } finally {
          await cleanupAll()
        }
      },
    )

    await t.step('returns 400 for invalid JSON body', async () => {
      const biz = await seedBusiness()
      try {
        const req = new Request(
          `http://localhost:8000/api/admin/businesses/${biz.id}/ledger`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: 'not-json',
          },
        )
        const postHandler = handler.POST as (
          ctx: { req: Request; params: Record<string, string> },
        ) => Promise<Response>
        const res = await postHandler({
          req,
          params: { id: biz.id as string },
        })
        assertEquals(res.status, 400)
        const body = await res.json()
        assertEquals(body.error, 'Invalid JSON')
      } finally {
        await cleanupAll()
      }
    })

    await t.step(
      'returns 400 for invalid paymentDate',
      async () => {
        const biz = await seedBusiness()
        try {
          const req = new Request(
            `http://localhost:8000/api/admin/businesses/${biz.id}/ledger`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                amountCents: 1000,
                months: 1,
                paymentDate: 'not-a-date',
              }),
            },
          )
          const postHandler = handler.POST as (
            ctx: { req: Request; params: Record<string, string> },
          ) => Promise<Response>
          const res = await postHandler({
            req,
            params: { id: biz.id as string },
          })
          assertEquals(res.status, 400)
          const body = await res.json()
          assertEquals(body.error, 'Invalid paymentDate')
        } finally {
          await cleanupAll()
        }
      },
    )

    await t.step(
      'creates ledger row and updates business in database',
      async () => {
        const biz = await seedBusiness({ isActive: false })
        try {
          const paymentDate = new Date('2026-07-15')
          await handleLedgerPayment(
            biz.id as string,
            100000,
            6,
            paymentDate,
          )

          const [ledgerRows] = await db
            .select()
            .from(schema.partnerLedger)
            .where(eq(schema.partnerLedger.businessId, biz.id as string))
          assertExists(ledgerRows, 'Ledger entry should exist')
          assertEquals(ledgerRows.amountCents, 100000)
          assertEquals(ledgerRows.months, 6)
          assertEquals(
            ledgerRows.paymentDate.toISOString().slice(0, 10),
            '2026-07-15',
          )

          const [stored] = await db
            .select()
            .from(schema.businesses)
            .where(eq(schema.businesses.id, biz.id as string))
            .limit(1)
          assertEquals(stored.isActive, true)
          assertExists(stored.expirationDate)
          const expected = new Date(paymentDate)
          expected.setMonth(expected.getMonth() + 6)
          assertEquals(
            new Date(stored.expirationDate!).getMonth(),
            expected.getMonth(),
          )
        } finally {
          await cleanupAll()
        }
      },
    )

    await t.step(
      'returns 400 for non-integer amountCents',
      async () => {
        const res = await handleLedgerPayment(
          crypto.randomUUID(),
          1000.5,
          1,
          new Date(),
        )
        assertEquals(res.status, 400)
        const body = await res.json()
        assertEquals(
          body.error,
          'amountCents must be a positive integer',
        )
      },
    )
  },
})

Deno.test('Ledger middleware auth enforcement', async (t) => {
  const originalGetSession = auth.api.getSession

  const ledgerUrl = 'http://localhost:8000/api/admin/businesses/some-id/ledger'

  await t.step('unauthenticated request returns 401', async () => {
    ;(auth.api as unknown as { getSession: unknown }).getSession = () =>
      Promise.resolve(null)

    const req = new Request(ledgerUrl, { method: 'POST' })
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

    const req = new Request(ledgerUrl, { method: 'POST' })
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

    const req = new Request(ledgerUrl, { method: 'POST' })
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

    const req = new Request(ledgerUrl, { method: 'POST' })
    const res = await applyMiddleware(
      req,
      () => Promise.resolve(new Response('OK')),
    )

    assertEquals(res.status, 200)
    assertEquals(await res.text(), 'OK')
  })

  auth.api.getSession = originalGetSession
})

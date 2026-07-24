import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { db } from '../lib/db.ts'
import * as schema from '../db/schema.ts'
import { eq } from 'drizzle-orm'
import { handleLedgerPayment } from '../routes/api/admin/businesses/[id]/ledger.ts'

// ── Currency helper unit tests ────────────────────────────────────────────────

/**
 * These helpers are co-located in the island; we test the same logic here
 * by duplicating the pure functions. The island cannot be imported server-side
 * (it uses Preact hooks), so we verify the algorithm independently.
 */

function parseCurrencyToCents(display: string): number {
  const digits = display.replace(/\D/g, '')
  return parseInt(digits || '0', 10)
}

function formatCurrencyInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').replace(/^0+/, '') || '0'
  const padded = digits.padStart(3, '0')
  const intPart = padded.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const decPart = padded.slice(-2)
  return `R$ ${intPart || '0'},${decPart}`
}

Deno.test('Admin Ledger UI — currency helpers', async (t) => {
  await t.step('parseCurrencyToCents: R$ 0,00 → 0', () => {
    assertEquals(parseCurrencyToCents('R$ 0,00'), 0)
  })

  await t.step('parseCurrencyToCents: R$ 150,00 → 15000', () => {
    assertEquals(parseCurrencyToCents('R$ 150,00'), 15000)
  })

  await t.step('parseCurrencyToCents: R$ 1.500,99 → 150099', () => {
    assertEquals(parseCurrencyToCents('R$ 1.500,99'), 150099)
  })

  await t.step('parseCurrencyToCents: empty string → 0', () => {
    assertEquals(parseCurrencyToCents(''), 0)
  })

  await t.step('formatCurrencyInput: "15000" → "R$ 150,00"', () => {
    assertEquals(formatCurrencyInput('15000'), 'R$ 150,00')
  })

  await t.step('formatCurrencyInput: "0" → "R$ 0,00"', () => {
    assertEquals(formatCurrencyInput('0'), 'R$ 0,00')
  })

  await t.step('formatCurrencyInput: "150099" → "R$ 1.500,99"', () => {
    assertEquals(formatCurrencyInput('150099'), 'R$ 1.500,99')
  })

  await t.step(
    'formatCurrencyInput: strips non-digits before formatting',
    () => {
      assertEquals(formatCurrencyInput('R$ 150,00'), 'R$ 150,00')
    },
  )
})

// ── API integration tests ─────────────────────────────────────────────────────

Deno.test({
  name: 'Admin Ledger UI — form submission triggers API with correct payload',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    const userId = `test-ledger-ui-user-${crypto.randomUUID()}`
    const businessId = crypto.randomUUID()

    // Seed user + business
    await db.insert(schema.users).values({
      id: userId,
      email: `${userId}@example.com`,
      name: 'Ledger UI Test User',
      role: 'business',
    })

    await db.insert(schema.businesses).values({
      id: businessId,
      userId,
      name: 'Test Ledger Biz',
      companyName: 'Test Ledger Biz Ltda',
      cnpj: `${Date.now()}`.slice(0, 14).padEnd(14, '1'),
      category: 'Serviços',
      logoUrl: 'http://localhost/logo.png',
      isActive: false,
    })

    try {
      await t.step(
        'valid payment inserts ledger row, sets isActive=true and extends expirationDate',
        async () => {
          const paymentDate = new Date('2026-07-01T00:00:00.000Z')

          const res = await handleLedgerPayment(
            businessId,
            15000, // R$ 150,00 in cents
            3,
            paymentDate,
          )

          assertEquals(res.status, 200)
          const updated = await res.json()
          assertEquals(updated.isActive, true)
          assertExists(updated.expirationDate)

          // expirationDate should be ~3 months from paymentDate
          const expiry = new Date(updated.expirationDate)
          assertEquals(expiry > paymentDate, true)

          // Ledger row created
          const ledgerRows = await db
            .select()
            .from(schema.partnerLedger)
            .where(eq(schema.partnerLedger.businessId, businessId))

          assertEquals(ledgerRows.length, 1)
          assertEquals(ledgerRows[0].amountCents, 15000)
          assertEquals(ledgerRows[0].months, 3)
        },
      )

      await t.step(
        'second payment stacks on top of existing expirationDate',
        async () => {
          // Check current state
          const [before] = await db
            .select()
            .from(schema.businesses)
            .where(eq(schema.businesses.id, businessId))
            .limit(1)

          assertExists(before.expirationDate)
          const prevExpiry = new Date(before.expirationDate!)

          const res = await handleLedgerPayment(
            businessId,
            30000, // R$ 300,00
            1,
            new Date(),
          )

          assertEquals(res.status, 200)
          const updated = await res.json()
          const newExpiry = new Date(updated.expirationDate)

          // New expiry must be after the previous one
          assertEquals(newExpiry > prevExpiry, true)

          // Two ledger rows now
          const rows = await db
            .select()
            .from(schema.partnerLedger)
            .where(eq(schema.partnerLedger.businessId, businessId))

          assertEquals(rows.length, 2)
        },
      )

      await t.step(
        'non-positive amountCents returns 400',
        async () => {
          const res = await handleLedgerPayment(
            businessId,
            0,
            1,
            new Date(),
          )
          assertEquals(res.status, 400)
        },
      )

      await t.step(
        'non-positive months returns 400',
        async () => {
          const res = await handleLedgerPayment(
            businessId,
            10000,
            0,
            new Date(),
          )
          assertEquals(res.status, 400)
        },
      )

      await t.step(
        'unknown businessId returns 404',
        async () => {
          const res = await handleLedgerPayment(
            crypto.randomUUID(),
            10000,
            1,
            new Date(),
          )
          assertEquals(res.status, 404)
        },
      )

      await t.step(
        'fetch mock: correct JSON payload shape sent to API endpoint',
        async () => {
          // Simulate what the island's handleLedgerSubmit sends
          const capturedRequests: Array<{
            url: string
            method: string
            body: unknown
          }> = []

          const originalFetch = globalThis.fetch

          globalThis.fetch = (
            input: RequestInfo | URL,
            init?: RequestInit,
          ): Promise<Response> => {
            const url = typeof input === 'string'
              ? input
              : input instanceof URL
              ? input.href
              : (input as Request).url

            if (url.includes('/ledger')) {
              const body = init?.body ? JSON.parse(init.body as string) : null
              capturedRequests.push({
                url,
                method: init?.method ?? 'GET',
                body,
              })
              return Promise.resolve(
                new Response(
                  JSON.stringify({
                    id: businessId,
                    isActive: true,
                    expirationDate: new Date(Date.now() + 86400000 * 30)
                      .toISOString(),
                  }),
                  { status: 200 },
                ),
              )
            }
            return Promise.resolve(new Response('{}'))
          }

          try {
            // Reproduce the island's submit logic
            const amountCents = parseCurrencyToCents('R$ 150,00')
            const months = 3
            const paymentDate = '2026-07-24'

            const res = await fetch(
              `/api/admin/businesses/${businessId}/ledger`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  amountCents,
                  months,
                  paymentDate: new Date(paymentDate).toISOString(),
                }),
              },
            )

            assertEquals(res.status, 200)
            assertEquals(capturedRequests.length, 1)

            const { url, method, body } = capturedRequests[0]
            assertEquals(method, 'POST')
            assertEquals(
              url,
              `/api/admin/businesses/${businessId}/ledger`,
            )
            assertEquals((body as Record<string, unknown>).amountCents, 15000)
            assertEquals((body as Record<string, unknown>).months, 3)
            assertExists((body as Record<string, unknown>).paymentDate)
          } finally {
            globalThis.fetch = originalFetch
          }
        },
      )
    } finally {
      await db.delete(schema.partnerLedger).where(
        eq(schema.partnerLedger.businessId, businessId),
      )
      await db.delete(schema.businesses).where(
        eq(schema.businesses.id, businessId),
      )
      await db.delete(schema.users).where(eq(schema.users.id, userId))
    }
  },
})

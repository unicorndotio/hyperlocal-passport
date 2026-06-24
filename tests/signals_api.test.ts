import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { db } from '../lib/db.ts'
import * as schema from '../db/schema.ts'
import { eq, sql } from 'drizzle-orm'
import { handleCreateSignal } from '../routes/api/signals/index.ts'
import { handleListSignals } from '../routes/api/admin/signals/index.ts'
import { handleReviewSignal } from '../routes/api/admin/signals/[id]/review.ts'
import { validateSignalInput } from '../lib/signals.ts'

async function createTestUser(id: string) {
  await db.insert(schema.users).values({
    id,
    email: `${id}@test.com`,
    name: 'Signal Test User',
  })
}

async function deleteTestUser(id: string) {
  await db.delete(schema.signals).where(eq(schema.signals.userId, id))
  await db.delete(schema.users).where(eq(schema.users.id, id))
}

Deno.test('Signal creation', {
  sanitizeOps: false,
  sanitizeResources: false,
}, async (t) => {
  const uid = `sig-create-${Date.now()}-${
    Math.random().toString(36).slice(2, 6)
  }`
  await createTestUser(uid)

  await t.step(
    'creates signal with valid data returns 201 and persists to DB',
    async () => {
      const res = await handleCreateSignal({
        category: 'Alimentação',
        description:
          'I would love to have a Japanese restaurant in the neighborhood',
      }, uid)
      assertEquals(res.status, 201)

      const body = await res.json()
      assertExists(body.id)
      assertEquals(body.category, 'Alimentação')
      assertEquals(
        body.description,
        'I would love to have a Japanese restaurant in the neighborhood',
      )
      assertEquals(body.userId, uid)
      assertEquals(body.status, 'pending')
      assertExists(body.createdAt)

      const [stored] = await db.select().from(schema.signals)
        .where(eq(schema.signals.id, body.id))
      assertExists(stored)
      assertEquals(stored.category, 'Alimentação')
      assertEquals(stored.status, 'pending')

      await db.delete(schema.signals).where(eq(schema.signals.id, body.id))
    },
  )

  await t.step('returns 400 for missing category', async () => {
    const res = await handleCreateSignal({
      description: 'Some description text here',
    }, uid)
    assertEquals(res.status, 400)
    const body = await res.json()
    assertEquals(body.error, 'Category is required')
  })

  await t.step('returns 400 for invalid category', async () => {
    const res = await handleCreateSignal({
      category: 'InvalidCategory',
      description: 'Some description text here',
    }, uid)
    assertEquals(res.status, 400)
    const body = await res.json()
    assertExists(body.error.includes('Invalid category'))
  })

  await t.step('returns 400 for missing description', async () => {
    const res = await handleCreateSignal({
      category: 'Alimentação',
    }, uid)
    assertEquals(res.status, 400)
    const body = await res.json()
    assertEquals(body.error, 'Description is required')
  })

  await t.step('returns 400 for too short description', async () => {
    const res = await handleCreateSignal({
      category: 'Alimentação',
      description: 'Short',
    }, uid)
    assertEquals(res.status, 400)
    const body = await res.json()
    assertEquals(body.error, 'Description must be at least 10 characters')
  })

  await t.step('returns 400 for too long description', async () => {
    const res = await handleCreateSignal({
      category: 'Alimentação',
      description: 'x'.repeat(501),
    }, uid)
    assertEquals(res.status, 400)
    const body = await res.json()
    assertEquals(body.error, 'Description must be at most 500 characters')
  })

  await t.step(
    'rate limit is NOT enforced (limits removed per ADR-007)',
    async () => {
      for (let i = 0; i < 10; i++) {
        const res = await handleCreateSignal({
          category: 'Esporte',
          description: `Signal number ${i + 1} for unlimited test`,
        }, uid)
        assertEquals(res.status, 201, `Signal ${i + 1} should succeed`)
      }
    },
  )

  await t.step('category count is computed via SQL COUNT', async () => {
    const result = await db.select({ count: sql<number>`count(*)::int` })
      .from(schema.signals)
      .where(eq(schema.signals.category, 'Esporte'))

    assertEquals(result[0].count, 10)
  })

  await deleteTestUser(uid)
})

Deno.test('Signal listing', {
  sanitizeOps: false,
  sanitizeResources: false,
}, async (t) => {
  const uid = `sig-list-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const pagUid = `sig-pag-${uid}`
  await createTestUser(uid)
  await createTestUser(pagUid)

  await t.step('lists all signals with category counts', async () => {
    await handleCreateSignal({
      category: 'Alimentação',
      description: 'We need a bakery here please',
    }, uid)
    await handleCreateSignal({
      category: 'Alimentação',
      description: 'An Italian restaurant would be amazing',
    }, uid)
    await handleCreateSignal({
      category: 'Esporte',
      description: 'A soccer field rental service please',
    }, uid)

    const res = await handleListSignals()
    assertEquals(res.status, 200)

    const body = await res.json()
    assertExists(body.signals)
    assertEquals(body.signals.length, 3)
    assertExists(body.categoryCounts)

    const alimentacaoCount = body.categoryCounts.find(
      (c: { category: string }) => c.category === 'Alimentação',
    )
    assertExists(alimentacaoCount)
    assertEquals(alimentacaoCount.count, 2)

    const esporteCount = body.categoryCounts.find(
      (c: { category: string }) => c.category === 'Esporte',
    )
    assertExists(esporteCount)
    assertEquals(esporteCount.count, 1)
  })

  await t.step('paginates results beyond 20 signals', async () => {
    for (let i = 0; i < 25; i++) {
      await handleCreateSignal({
        category: 'Outros',
        description: `Test signal number ${i + 1} for pagination testing`,
      }, pagUid)
    }

    const res = await handleListSignals()
    const body = await res.json()
    assertEquals(body.signals.length, 20)
    assertExists(body.nextCursor)
  })

  await t.step('returns empty list past last page', async () => {
    const res = await handleListSignals('200')
    const body = await res.json()
    assertEquals(body.signals.length, 0)
  })

  await deleteTestUser(uid)
  await deleteTestUser(pagUid)
})

Deno.test('Signal review', {
  sanitizeOps: false,
  sanitizeResources: false,
}, async (t) => {
  const uid = `sig-review-${Date.now()}-${
    Math.random().toString(36).slice(2, 6)
  }`
  await createTestUser(uid)

  await t.step('approves signal', async () => {
    const createRes = await handleCreateSignal({
      category: 'Casa',
      description: 'We need a handyman service in the area',
    }, uid)
    const signal = await createRes.json()
    assertEquals(signal.status, 'pending')

    const reviewRes = await handleReviewSignal(signal.id, 'approved')
    assertEquals(reviewRes.status, 200)
    const reviewed = await reviewRes.json()
    assertEquals(reviewed.status, 'approved')

    const [stored] = await db.select().from(schema.signals)
      .where(eq(schema.signals.id, signal.id))
    assertEquals(stored.status, 'approved')
  })

  await t.step('rejects signal', async () => {
    const createRes = await handleCreateSignal({
      category: 'Casa',
      description: 'We need a plumber in the neighborhood',
    }, uid)
    const signal = await createRes.json()
    assertEquals(signal.status, 'pending')

    const reviewRes = await handleReviewSignal(signal.id, 'rejected')
    assertEquals(reviewRes.status, 200)
    const reviewed = await reviewRes.json()
    assertEquals(reviewed.status, 'rejected')
  })

  await t.step('returns 404 for nonexistent signal', async () => {
    const res = await handleReviewSignal('nonexistent-id', 'approved')
    assertEquals(res.status, 404)
    const body = await res.json()
    assertEquals(body.error, 'Signal not found')
  })

  await t.step(
    'is idempotent: reviewing already-reviewed signal returns 200',
    async () => {
      const createRes = await handleCreateSignal({
        category: 'Casa',
        description: 'We need a painter in the neighborhood',
      }, uid)
      const signal = await createRes.json()

      await handleReviewSignal(signal.id, 'approved')
      const res = await handleReviewSignal(signal.id, 'approved')
      assertEquals(res.status, 200)

      const body = await res.json()
      assertEquals(body.status, 'approved')
      assertEquals(body.id, signal.id)
    },
  )

  await deleteTestUser(uid)
})

Deno.test('Category counts with reviewed/unreviewed', {
  sanitizeOps: false,
  sanitizeResources: false,
}, async (t) => {
  const uid = `sig-count-${Date.now()}-${
    Math.random().toString(36).slice(2, 6)
  }`
  await createTestUser(uid)

  await t.step('unreviewed count decreases after review', async () => {
    const r1 = await handleCreateSignal({
      category: 'Corpo',
      description: 'We need a yoga studio in the area',
    }, uid)
    assertEquals(r1.status, 201)
    const r2 = await handleCreateSignal({
      category: 'Corpo',
      description: 'A new gym would be very welcome too',
    }, uid)
    assertEquals(r2.status, 201)

    const res1 = await handleListSignals()
    const body1 = await res1.json()
    const corpoCount1 = body1.categoryCounts.find(
      (c: { category: string }) => c.category === 'Corpo',
    )
    assertExists(corpoCount1)
    assertEquals(corpoCount1.count, 2)
    assertEquals(corpoCount1.unreviewed, 2)

    const firstSignal = body1.signals[0]
    await handleReviewSignal(firstSignal.id, 'approved')

    const res2 = await handleListSignals()
    const body2 = await res2.json()
    const corpoCount2 = body2.categoryCounts.find(
      (c: { category: string }) => c.category === 'Corpo',
    )
    assertExists(corpoCount2)
    assertEquals(corpoCount2.count, 2)
    assertEquals(corpoCount2.unreviewed, 1)
  })

  await deleteTestUser(uid)
})

Deno.test('lib/signals.ts validation', async (t) => {
  await t.step('returns undefined for valid input', () => {
    const err = validateSignalInput({
      category: 'Alimentação',
      description: 'A valid description that is long enough',
    })
    assertEquals(err, undefined)
  })

  await t.step('returns error for missing category', () => {
    const err = validateSignalInput({ description: 'Some description' })
    assertEquals(err, 'Category is required')
  })

  await t.step('trims category and description', () => {
    const err = validateSignalInput({
      category: '  Alimentação  ',
      description: '  Valid description  ',
    })
    assertEquals(err, undefined)
  })

  await t.step('returns error for empty description', () => {
    const err = validateSignalInput({
      category: 'Alimentação',
      description: '   ',
    })
    assertEquals(err, 'Description is required')
  })
})

import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { handleCreateSignal } from '../routes/api/signals/index.ts'
import { handleListSignals } from '../routes/api/admin/signals/index.ts'
import { handleReviewSignal } from '../routes/api/admin/signals/[id]/review.ts'
import {
  type DemandSignal,
  getSignalKey,
  getCategoryCountKey,
} from '../lib/signals.ts'

Deno.test('Signal creation', async (t) => {
  await t.step('creates signal with valid data returns 201 and persists to KV', async () => {
    const kv = await Deno.openKv(':memory:')
    try {
      const res = await handleCreateSignal(kv, {
        category: 'Alimentação',
        description: 'I would love to have a Japanese restaurant in the neighborhood',
      }, 'resident_123')
      assertEquals(res.status, 201)

      const body = await res.json() as DemandSignal
      assertExists(body.id)
      assertEquals(body.category, 'Alimentação')
      assertEquals(body.description, 'I would love to have a Japanese restaurant in the neighborhood')
      assertEquals(body.residentId, 'resident_123')
      assertEquals(body.reviewed, false)
      assertExists(body.createdAt)

      const stored = await kv.get<DemandSignal>(getSignalKey(body.id))
      assertExists(stored.value)
      assertEquals(stored.value!.category, 'Alimentação')
      assertEquals(stored.value!.reviewed, false)
    } finally {
      kv.close()
    }
  })

  await t.step('returns 400 for missing category', async () => {
    const kv = await Deno.openKv(':memory:')
    try {
      const res = await handleCreateSignal(kv, {
        description: 'Some description text here',
      }, 'resident_123')
      assertEquals(res.status, 400)
      const body = await res.json()
      assertEquals(body.error, 'Category is required')
    } finally {
      kv.close()
    }
  })

  await t.step('returns 400 for invalid category', async () => {
    const kv = await Deno.openKv(':memory:')
    try {
      const res = await handleCreateSignal(kv, {
        category: 'InvalidCategory',
        description: 'Some description text here',
      }, 'resident_123')
      assertEquals(res.status, 400)
      const body = await res.json()
      assertExists(body.error.includes('Invalid category'))
    } finally {
      kv.close()
    }
  })

  await t.step('returns 400 for missing description', async () => {
    const kv = await Deno.openKv(':memory:')
    try {
      const res = await handleCreateSignal(kv, {
        category: 'Alimentação',
      }, 'resident_123')
      assertEquals(res.status, 400)
      const body = await res.json()
      assertEquals(body.error, 'Description is required')
    } finally {
      kv.close()
    }
  })

  await t.step('returns 400 for too short description', async () => {
    const kv = await Deno.openKv(':memory:')
    try {
      const res = await handleCreateSignal(kv, {
        category: 'Alimentação',
        description: 'Short',
      }, 'resident_123')
      assertEquals(res.status, 400)
      const body = await res.json()
      assertEquals(body.error, 'Description must be at least 10 characters')
    } finally {
      kv.close()
    }
  })

  await t.step('returns 400 for too long description', async () => {
    const kv = await Deno.openKv(':memory:')
    try {
      const res = await handleCreateSignal(kv, {
        category: 'Alimentação',
        description: 'x'.repeat(501),
      }, 'resident_123')
      assertEquals(res.status, 400)
      const body = await res.json()
      assertEquals(body.error, 'Description must be at most 500 characters')
    } finally {
      kv.close()
    }
  })

  await t.step('enforces 5/day rate limit per resident', async () => {
    const kv = await Deno.openKv(':memory:')
    try {
      for (let i = 0; i < 5; i++) {
        const res = await handleCreateSignal(kv, {
          category: 'Esporte',
          description: `Signal number ${i + 1} for rate limit testing purposes`,
        }, 'resident_rate_test')
        assertEquals(res.status, 201)
      }

      const res = await handleCreateSignal(kv, {
        category: 'Esporte',
        description: 'Sixth signal that should be rate limited',
      }, 'resident_rate_test')
      assertEquals(res.status, 429)
      const body = await res.json()
      assertExists(body.error.includes('Rate limit exceeded'))
    } finally {
      kv.close()
    }
  })

  await t.step('rate limit is per-resident (different residents unaffected)', async () => {
    const kv = await Deno.openKv(':memory:')
    try {
      for (let i = 0; i < 5; i++) {
        const r = await handleCreateSignal(kv, {
          category: 'Casa',
          description: `Signal ${i + 1} for resident A for rate limit testing`,
        }, 'resident_a')
        assertEquals(r.status, 201)
      }

      const res = await handleCreateSignal(kv, {
        category: 'Casa',
        description: 'First signal for resident B should succeed',
      }, 'resident_b')
      assertEquals(res.status, 201)
    } finally {
      kv.close()
    }
  })

  await t.step('creates category index and increments count atomically', async () => {
    const kv = await Deno.openKv(':memory:')
    try {
      const res1 = await handleCreateSignal(kv, {
        category: 'Náutica',
        description: 'We need a boat rental service in the area',
      }, 'resident_idx_1')
      assertEquals(res1.status, 201)

      const res2 = await handleCreateSignal(kv, {
        category: 'Náutica',
        description: 'A sailing school would be great too',
      }, 'resident_idx_2')
      assertEquals(res2.status, 201)

      const catCount = await kv.get<number>(getCategoryCountKey('Náutica'))
      assertEquals(catCount.value, 2)

      const indexIter = kv.list({ prefix: ['signals_by_category', 'Náutica'] })
      let idxCount = 0
      for await (const _ of indexIter) {
        idxCount++
      }
      assertEquals(idxCount, 2)
    } finally {
      kv.close()
    }
  })
})

Deno.test('Signal listing', async (t) => {
  await t.step('lists all signals with category counts', async () => {
    const kv = await Deno.openKv(':memory:')
    try {
      await handleCreateSignal(kv, {
        category: 'Alimentação',
        description: 'We need a bakery here please',
      }, 'resident_list_1')
      await handleCreateSignal(kv, {
        category: 'Alimentação',
        description: 'An Italian restaurant would be amazing',
      }, 'resident_list_2')
      await handleCreateSignal(kv, {
        category: 'Esporte',
        description: 'A soccer field rental service please',
      }, 'resident_list_3')

      const res = await handleListSignals(kv)
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
    } finally {
      kv.close()
    }
  })

  await t.step('paginates results beyond 20 signals', async () => {
    const kv = await Deno.openKv(':memory:')
    try {
      for (let i = 0; i < 25; i++) {
        await handleCreateSignal(kv, {
          category: 'Outros',
          description: `Test signal number ${i + 1} for pagination testing`,
        }, `resident_pag_${i}`)
      }

      const res = await handleListSignals(kv)
      const body = await res.json()
      assertEquals(body.signals.length, 20)
      assertExists(body.nextCursor)
    } finally {
      kv.close()
    }
  })

  await t.step('returns empty list when no signals exist', async () => {
    const kv = await Deno.openKv(':memory:')
    try {
      const res = await handleListSignals(kv)
      const body = await res.json()
      assertEquals(body.signals.length, 0)
      assertEquals(body.categoryCounts.length, 0)
    } finally {
      kv.close()
    }
  })
})

Deno.test('Signal review', async (t) => {
  await t.step('marks signal as reviewed', async () => {
    const kv = await Deno.openKv(':memory:')
    try {
      const createRes = await handleCreateSignal(kv, {
        category: 'Casa',
        description: 'We need a handyman service in the area',
      }, 'resident_rev')
      const signal = await createRes.json() as DemandSignal
      assertEquals(signal.reviewed, false)

      const reviewRes = await handleReviewSignal(kv, signal.id)
      assertEquals(reviewRes.status, 200)
      const reviewed = await reviewRes.json()
      assertEquals(reviewed.reviewed, true)

      const stored = await kv.get<DemandSignal>(getSignalKey(signal.id))
      assertEquals(stored.value!.reviewed, true)
    } finally {
      kv.close()
    }
  })

  await t.step('returns 404 for nonexistent signal', async () => {
    const kv = await Deno.openKv(':memory:')
    try {
      const res = await handleReviewSignal(kv, 'nonexistent-id')
      assertEquals(res.status, 404)
      const body = await res.json()
      assertEquals(body.error, 'Signal not found')
    } finally {
      kv.close()
    }
  })

  await t.step('is idempotent: reviewing an already-reviewed signal returns 200', async () => {
    const kv = await Deno.openKv(':memory:')
    try {
      const createRes = await handleCreateSignal(kv, {
        category: 'Casa',
        description: 'We need a plumber in the neighborhood',
      }, 'resident_idem')
      const signal = await createRes.json() as DemandSignal

      await handleReviewSignal(kv, signal.id)
      const res = await handleReviewSignal(kv, signal.id)
      assertEquals(res.status, 200)

      const body = await res.json()
      assertEquals(body.reviewed, true)
      assertEquals(body.id, signal.id)
    } finally {
      kv.close()
    }
  })
})

Deno.test('Category counts with reviewed/unreviewed', async (t) => {
  await t.step('unreviewed count decreases after review', async () => {
    const kv = await Deno.openKv(':memory:')
    try {
      const r1 = await handleCreateSignal(kv, {
        category: 'Corpo',
        description: 'We need a yoga studio in the area',
      }, 'resident_unrev_1')
      assertEquals(r1.status, 201)
      const r2 = await handleCreateSignal(kv, {
        category: 'Corpo',
        description: 'A new gym would be very welcome too',
      }, 'resident_unrev_2')
      assertEquals(r2.status, 201)

      const res1 = await handleListSignals(kv)
      const body1 = await res1.json()
      const corpoCount1 = body1.categoryCounts.find(
        (c: { category: string }) => c.category === 'Corpo',
      )
      assertExists(corpoCount1)
      assertEquals(corpoCount1.count, 2)
      assertEquals(corpoCount1.unreviewed, 2)

      const firstSignal = body1.signals[0]
      await handleReviewSignal(kv, firstSignal.id)

      const res2 = await handleListSignals(kv)
      const body2 = await res2.json()
      const corpoCount2 = body2.categoryCounts.find(
        (c: { category: string }) => c.category === 'Corpo',
      )
      assertExists(corpoCount2)
      assertEquals(corpoCount2.count, 2)
      assertEquals(corpoCount2.unreviewed, 1)
    } finally {
      kv.close()
    }
  })
})

Deno.test('lib/signals.ts validation', async (t) => {
  const { validateSignalInput } = await import('../lib/signals.ts')

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

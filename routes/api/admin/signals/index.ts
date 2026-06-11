import { define } from '../../../../utils.ts'
import { kv } from '../../../../lib/kv.ts'
import {
  type DemandSignal,
  getCategoryCountKey,
  VALID_CATEGORIES,
} from '../../../../lib/signals.ts'

interface SignalWithCategory {
  id: string
  category: string
  description: string
  residentId: string
  createdAt: number
  reviewed: boolean
}

interface CategoryCount {
  category: string
  count: number
  unreviewed: number
}

export async function handleListSignals(
  kvInstance: Deno.Kv,
  cursor?: string,
): Promise<Response> {
  const limit = 20
  const iter = kvInstance.list<DemandSignal>(
    { prefix: ['signals'] },
    { limit, cursor },
  )

  const signals: SignalWithCategory[] = []

  for await (const entry of iter) {
    signals.push(entry.value)
  }
  const nextCursor = iter.cursor || undefined

  const categoryCounts = await getCategoryCounts(kvInstance)

  return new Response(
    JSON.stringify({
      signals,
      categoryCounts,
      nextCursor: nextCursor || undefined,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  )
}

export async function getCategoryCounts(
  kvInstance: Deno.Kv,
): Promise<CategoryCount[]> {
  const counts: CategoryCount[] = []

  for (const category of VALID_CATEGORIES) {
    const countKey = getCategoryCountKey(category)
    const countEntry = await kvInstance.get<number>(countKey)
    const total = countEntry.value ?? 0

    const unreviewedIter = kvInstance.list<{ signalId: string; reviewed: boolean }>({
      prefix: ['signals_by_category', category],
    })

    let unreviewedCount = 0
    for await (const entry of unreviewedIter) {
      if (!entry.value.reviewed) {
        unreviewedCount++
      }
    }

    if (total > 0 || unreviewedCount > 0) {
      counts.push({ category, count: total, unreviewed: unreviewedCount })
    }
  }

  return counts
}

export const handler = define.handlers({
  async GET(ctx) {
    const url = new URL(ctx.req.url)
    const cursor = url.searchParams.get('cursor') ?? undefined
    return await handleListSignals(kv, cursor)
  },
})

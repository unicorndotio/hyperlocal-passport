import { define } from '../../../../utils.ts'
import { db } from '../../../../lib/db.ts'
import * as schema from '../../../../db/schema.ts'
import { eq, sql } from 'drizzle-orm'
import { VALID_CATEGORIES } from '../../../../lib/signals.ts'

interface CategoryCount {
  category: string
  count: number
  unreviewed: number
}

export async function handleListSignals(
  cursor?: string,
): Promise<Response> {
  const limit = 20
  const offset = cursor ? parseInt(cursor, 10) : 0

  const signals = await db.select().from(schema.signals)
    .limit(limit)
    .offset(offset)
    .orderBy(schema.signals.createdAt)

  const nextCursor = signals.length === limit
    ? String(offset + limit)
    : undefined

  const categoryCounts = await getCategoryCounts()

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

export async function getCategoryCounts(): Promise<CategoryCount[]> {
  const counts: CategoryCount[] = []

  for (const category of VALID_CATEGORIES) {
    const result = await db
      .select({
        total: sql<number>`count(*)::int`,
        unreviewed: sql<
          number
        >`count(*) filter (where ${schema.signals.status} = 'pending')::int`,
      })
      .from(schema.signals)
      .where(eq(schema.signals.category, category))

    const { total, unreviewed } = result[0]

    if (total > 0 || unreviewed > 0) {
      counts.push({ category, count: total, unreviewed })
    }
  }

  return counts
}

export const handler = define.handlers({
  async GET(ctx) {
    const url = new URL(ctx.req.url)
    const cursor = url.searchParams.get('cursor') ?? undefined
    return await handleListSignals(cursor)
  },
})

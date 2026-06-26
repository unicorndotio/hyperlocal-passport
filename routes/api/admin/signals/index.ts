import { define } from '../../../../utils.ts'
import { db } from '../../../../lib/db.ts'
import * as schema from '../../../../db/schema.ts'
import { sql } from 'drizzle-orm'

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
  const results = await db
    .select({
      category: schema.signals.category,
      count: sql<number>`count(*)::int`,
      unreviewed: sql<
        number
      >`count(*) filter (where ${schema.signals.status} = 'pending')::int`,
    })
    .from(schema.signals)
    .groupBy(schema.signals.category)

  return results.map((r) => ({
    category: r.category,
    count: r.count,
    unreviewed: r.unreviewed,
  }))
}

export const handler = define.handlers({
  async GET(ctx) {
    const url = new URL(ctx.req.url)
    const cursor = url.searchParams.get('cursor') ?? undefined
    return await handleListSignals(cursor)
  },
})

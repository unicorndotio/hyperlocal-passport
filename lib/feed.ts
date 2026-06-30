import { sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'npm:drizzle-orm@0.38.2/node-postgres'
import * as schema from '../db/schema.ts'

export type FeedEventType =
  | 'merchant_post'
  | 'coupon_released'
  | 'savings_notice'

export interface FeedEvent {
  id: string
  type: FeedEventType
  title: string
  description: string
  imageUrl?: string
  businessId?: string
  businessName?: string
  amountCents?: number
  createdAt: number
}

export interface FeedQueryResult {
  events: FeedEvent[]
  cursor: string | null
}

export type Database = NodePgDatabase<typeof schema>

export async function refreshFeedView(
  db: Database,
): Promise<void> {
  await db.execute(
    sql`REFRESH MATERIALIZED VIEW CONCURRENTLY feed_events`,
  )
}

function parseCursor(cursor?: string): Date | null {
  if (!cursor) return null
  const ms = parseInt(cursor, 10)
  if (isNaN(ms) || ms <= 0) return null
  return new Date(ms)
}

export async function queryFeed(
  db: Database,
  userId: string | null,
  cursor?: string,
  limit?: number,
): Promise<FeedQueryResult> {
  const safeLimit = typeof limit === 'number' && Number.isFinite(limit)
    ? limit
    : 20
  const pageSize = Math.min(Math.max(safeLimit, 1), 100)
  const cursorDate = parseCursor(cursor)
  const events: FeedEvent[] = []

  // 1. Query the feed_events MV for global content
  let mvSql = sql`SELECT * FROM feed_events`
  if (cursorDate) {
    mvSql = sql`${mvSql} WHERE created_at < ${cursorDate}::timestamptz`
  }
  mvSql = sql`${mvSql} ORDER BY created_at DESC LIMIT ${pageSize}`

  const mvResult = await db.execute(mvSql)

  for (const row of mvResult.rows) {
    events.push({
      id: String(row.id),
      type: String(row.type) as FeedEventType,
      title: String(row.title),
      description: row.description ? String(row.description) : '',
      imageUrl: row.image_url ? String(row.image_url) : undefined,
      businessId: row.business_id ? String(row.business_id) : undefined,
      businessName: row.business_name ? String(row.business_name) : undefined,
      createdAt: new Date(row.created_at).getTime(),
    })
  }

  // 2. Query user-specific transaction savings
  if (userId) {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

    let txSql = sql`
      SELECT t.id, t.discount_applied_cents, t."timestamp", b.id AS business_id, b.name AS business_name
      FROM transactions t
      JOIN businesses b ON b.id = t.business_id
      WHERE t.user_id = ${userId}
        AND t."timestamp" >= ${ninetyDaysAgo}::timestamptz
    `
    if (cursorDate) {
      txSql = sql`${txSql} AND t."timestamp" < ${cursorDate}::timestamptz`
    }
    txSql = sql`${txSql} ORDER BY t."timestamp" DESC LIMIT ${pageSize}`

    const txResult = await db.execute(txSql)

    for (const row of txResult.rows) {
      events.push({
        id: `savings-${String(row.id)}`,
        type: 'savings_notice',
        title: 'Você economizou!',
        description: `Você economizou na ${String(row.business_name)}`,
        businessId: row.business_id ? String(row.business_id) : undefined,
        businessName: row.business_name ? String(row.business_name) : undefined,
        amountCents: Number(row.discount_applied_cents),
        createdAt: new Date(row.timestamp).getTime(),
      })
    }

    // Merge and sort by createdAt DESC
    events.sort((a, b) => b.createdAt - a.createdAt)

    // Trim to page size
    if (events.length > pageSize) {
      events.length = pageSize
    }
  }

  // 3. Compute next cursor
  let nextCursor: string | null = null
  if (events.length > 0) {
    nextCursor = String(events[events.length - 1].createdAt)
  }

  return { events, cursor: nextCursor }
}

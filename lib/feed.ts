import { and, desc, eq, gte, lt, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'npm:drizzle-orm@0.38.2/node-postgres'
import * as schema from '../db/schema.ts'
import { businesses, feedEvents, transactions } from '../db/schema.ts'

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
  const mvQuery = db.select().from(feedEvents)
  if (cursorDate) {
    mvQuery.where(lt(feedEvents.createdAt, cursorDate))
  }
  const mvRows = await mvQuery
    .orderBy(desc(feedEvents.createdAt))
    .limit(pageSize)

  for (const row of mvRows) {
    events.push({
      id: row.id,
      type: row.type as FeedEventType,
      title: row.title,
      description: row.description ?? '',
      imageUrl: row.imageUrl ?? undefined,
      businessId: row.businessId ?? undefined,
      businessName: row.businessName ?? undefined,
      createdAt: row.createdAt.getTime(),
    })
  }

  // 2. Query user-specific transaction savings
  if (userId) {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

    const txRows = await db.select({
      id: transactions.id,
      discountAppliedCents: transactions.discountAppliedCents,
      timestamp: transactions.timestamp,
      businessId: businesses.id,
      businessName: businesses.name,
    })
      .from(transactions)
      .innerJoin(businesses, eq(businesses.id, transactions.businessId))
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.timestamp, ninetyDaysAgo),
          ...(cursorDate ? [lt(transactions.timestamp, cursorDate)] : []),
        ),
      )
      .orderBy(desc(transactions.timestamp))
      .limit(pageSize)

    for (const row of txRows) {
      events.push({
        id: `savings-${row.id}`,
        type: 'savings_notice',
        title: 'Você economizou!',
        description: `Você economizou na ${row.businessName}`,
        businessId: row.businessId,
        businessName: row.businessName,
        amountCents: row.discountAppliedCents,
        createdAt: row.timestamp.getTime(),
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

import { sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'npm:drizzle-orm@0.38.2/node-postgres'
import * as schema from '../db/schema.ts'

export type FeedEventType =
  | 'merchant_post'
  | 'coupon_released'
  | 'savings_notice'
  | 'admin_announcement'

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

import { db } from './db.ts'
import * as schema from '../db/schema.ts'
import { eq, sql } from 'drizzle-orm'

export function getCouponAnalytics(couponId: string) {
  return db
    .select()
    .from(schema.couponAnalytics)
    .where(eq(schema.couponAnalytics.couponId, couponId))
    .limit(1)
    .then((rows) => rows[0] ?? null)
}

export async function incrementViewCount(couponId: string) {
  await db.insert(schema.couponAnalytics)
    .values({ id: crypto.randomUUID(), couponId, views: 1 })
    .onConflictDoUpdate({
      target: schema.couponAnalytics.couponId,
      set: { views: sql`coupon_analytics.views + 1` },
    })
}

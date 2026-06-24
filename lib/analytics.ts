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
  const analyticsId = crypto.randomUUID()
  await db.execute(
    sql`INSERT INTO coupon_analytics (id, coupon_id, views)
        VALUES (${analyticsId}, ${couponId}, 1)
        ON CONFLICT (coupon_id)
        DO UPDATE SET views = coupon_analytics.views + 1`,
  )
}

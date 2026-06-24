import { define } from '../../../utils.ts'
import { db } from '../../../lib/db.ts'
import * as schema from '../../../db/schema.ts'
import { eq, sql } from 'drizzle-orm'

interface BusinessAnalytics {
  businessId: string
  businessName: string
  couponCount: number
  totalViews: number
  totalRedemptions: number
  totalValidations: number
}

interface AdminAnalyticsResponse {
  totalCoupons: number
  totalViews: number
  totalRedemptions: number
  totalValidations: number
  totalDiscountCents: number
  perBusiness: BusinessAnalytics[]
}

export const handler = define.handlers({
  async GET(_ctx) {
    const rows = await db
      .select({
        id: schema.coupons.id,
        businessId: schema.coupons.businessId,
        isActive: schema.coupons.isActive,
        createdAt: schema.coupons.createdAt,
        businessName: schema.businesses.name,
        views: schema.couponAnalytics.views,
        redemptions: schema.couponAnalytics.redemptions,
        validations: schema.couponAnalytics.validations,
      })
      .from(schema.coupons)
      .leftJoin(
        schema.businesses,
        eq(schema.coupons.businessId, schema.businesses.id),
      )
      .leftJoin(
        schema.couponAnalytics,
        eq(schema.coupons.id, schema.couponAnalytics.couponId),
      )

    if (rows.length === 0) {
      return Response.json(
        {
          totalCoupons: 0,
          totalViews: 0,
          totalRedemptions: 0,
          totalValidations: 0,
          totalDiscountCents: 0,
          perBusiness: [],
        } satisfies AdminAnalyticsResponse,
      )
    }

    const perBusinessMap = new Map<string, BusinessAnalytics>()
    for (const row of rows) {
      let ba = perBusinessMap.get(row.businessId)
      if (!ba) {
        ba = {
          businessId: row.businessId,
          businessName: row.businessName ?? 'Unknown Business',
          couponCount: 0,
          totalViews: 0,
          totalRedemptions: 0,
          totalValidations: 0,
        }
        perBusinessMap.set(row.businessId, ba)
      }
      ba.couponCount++
      ba.totalViews += row.views ?? 0
      ba.totalRedemptions += row.redemptions ?? 0
      ba.totalValidations += row.validations ?? 0
    }

    const totalViews = rows.reduce((s, r) => s + (r.views ?? 0), 0)
    const totalRedemptions = rows.reduce((s, r) => s + (r.redemptions ?? 0), 0)
    const totalValidations = rows.reduce((s, r) => s + (r.validations ?? 0), 0)

    const [txResult] = await db
      .select({
        total: sql<
          number
        >`COALESCE(SUM(${schema.transactions.discountAppliedCents}), 0)`,
      })
      .from(schema.transactions)

    const totalDiscountCents = Number(txResult?.total ?? 0)
    const perBusiness = Array.from(perBusinessMap.values())

    return Response.json(
      {
        totalCoupons: rows.length,
        totalViews,
        totalRedemptions,
        totalValidations,
        totalDiscountCents,
        perBusiness,
      } satisfies AdminAnalyticsResponse,
    )
  },
})

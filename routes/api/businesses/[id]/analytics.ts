import { define } from '@/utils.ts'
import { auth } from '@/lib/auth.ts'
import { db } from '@/lib/db.ts'
import * as schema from '@/db/schema.ts'
import { desc, eq, inArray, sql } from 'drizzle-orm'

export const handler = define.handlers({
  async GET(ctx) {
    const { id: businessId } = ctx.params
    const session = await auth.api.getSession({ headers: ctx.req.headers })

    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    const [business] = await db
      .select()
      .from(schema.businesses)
      .where(eq(schema.businesses.id, businessId))
      .limit(1)

    if (!business) {
      return new Response('Business not found', { status: 404 })
    }

    if (session.user.role !== 'admin' && business.userId !== session.user.id) {
      return new Response('Forbidden', { status: 403 })
    }

    // Get all coupons for this business
    const coupons = await db
      .select()
      .from(schema.coupons)
      .where(eq(schema.coupons.businessId, businessId))

    // Pagination query params
    const url = new URL(ctx.req.url)
    const page = Math.max(
      1,
      parseInt(url.searchParams.get('page') ?? '1', 10) || 1,
    )
    const limit = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10) || 20),
    )

    // Bulk coupon analytics query (avoids N+1)
    const couponIds = coupons.map((c) => c.id)
    const analyticsRows = couponIds.length > 0
      ? await db
        .select()
        .from(schema.couponAnalytics)
        .where(inArray(schema.couponAnalytics.couponId, couponIds))
      : []

    const analyticsMap = new Map(
      analyticsRows.map((a) => [a.couponId, a]),
    )

    const couponAnalytics = coupons.map((coupon) => {
      const analytics = analyticsMap.get(coupon.id)
      return {
        couponId: coupon.id,
        couponTitle: coupon.title,
        views: analytics?.views ?? 0,
        redemptions: analytics?.redemptions ?? 0,
        validations: analytics?.validations ?? 0,
      }
    })

    // Transactions with DB-side sorting and pagination
    const offset = (page - 1) * limit

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.transactions)
      .where(eq(schema.transactions.businessId, businessId))

    const totalTransactions = Number(countResult.count)
    const totalPages = Math.max(1, Math.ceil(totalTransactions / limit))

    const transactionPage = await db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.businessId, businessId))
      .orderBy(desc(schema.transactions.timestamp))
      .limit(limit)
      .offset(offset)

    // Coupon title lookup
    const couponMap = new Map(coupons.map((c) => [c.id, c.title]))
    const transactionsWithCouponTitle = transactionPage.map((tx) => ({
      ...tx,
      couponTitle: couponMap.get(tx.couponId) ?? 'Unknown',
    }))

    // Totals
    const totalViews = couponAnalytics.reduce((s, c) => s + c.views, 0)
    const totalRedemptions = couponAnalytics.reduce(
      (s, c) => s + c.redemptions,
      0,
    )
    const totalValidations = couponAnalytics.reduce(
      (s, c) => s + c.validations,
      0,
    )

    return Response.json({
      totals: {
        views: totalViews,
        redemptions: totalRedemptions,
        validations: totalValidations,
        conversionRate: totalViews > 0
          ? Math.round((totalRedemptions / totalViews) * 10000) / 10000
          : 0,
      },
      coupons: couponAnalytics,
      transactions: transactionsWithCouponTitle,
      pagination: {
        page,
        limit,
        total: totalTransactions,
        totalPages,
      },
    })
  },
})

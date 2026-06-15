import { define } from '@/utils.ts'
import { auth } from '@/lib/auth.ts'
import { kv } from '@/lib/kv.ts'
import type { Business } from '@/lib/business.ts'
import type { Coupon, Transaction } from '@/lib/coupon.ts'
import {
  redemptionCountKey,
  validationCountKey,
  viewCountKey,
} from '@/lib/analytics.ts'

export const handler = define.handlers({
  async GET(ctx) {
    const { id: businessId } = ctx.params
    const session = await auth.api.getSession({ headers: ctx.req.headers })

    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    const businessRes = await kv.get<Business>(['businesses', businessId])
    const business = businessRes.value

    if (!business) {
      return new Response('Business not found', { status: 404 })
    }

    if (session.user.role !== 'admin' && business.userId !== session.user.id) {
      return new Response('Forbidden', { status: 403 })
    }

    // Get all coupons for this business via kv.list
    const couponEntries = kv.list<Coupon>({ prefix: ['coupons'] })
    const coupons: Coupon[] = []
    for await (const entry of couponEntries) {
      if (entry.value.businessId === businessId) {
        coupons.push(entry.value)
      }
    }

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

    // Per-coupon analytics
    const couponAnalytics = await Promise.all(
      coupons.map(async (coupon) => {
        const [viewsRes, redemptionsRes, validationsRes] = await Promise.all([
          kv.get<Deno.KvU64>(viewCountKey(coupon.id)),
          kv.get<number>(redemptionCountKey(coupon.id)),
          kv.get<number>(validationCountKey(coupon.id)),
        ])

        return {
          couponId: coupon.id,
          couponTitle: coupon.title,
          views: Number(viewsRes.value?.value ?? 0n),
          redemptions: redemptionsRes.value ?? 0,
          validations: validationsRes.value ?? 0,
        }
      }),
    )

    // Read transactions with pagination
    const txEntries = kv.list<Transaction>({
      prefix: ['business_transactions', businessId],
    })

    const allTransactions: Transaction[] = []
    for await (const entry of txEntries) {
      allTransactions.push(entry.value)
    }
    allTransactions.sort((a, b) => b.timestamp - a.timestamp)

    const totalTransactions = allTransactions.length
    const totalPages = Math.max(1, Math.ceil(totalTransactions / limit))
    const offset = (page - 1) * limit
    const transactionPage = allTransactions.slice(offset, offset + limit)

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

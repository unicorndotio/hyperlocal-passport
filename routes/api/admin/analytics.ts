import { define } from '../../../utils.ts'
import { kv } from '../../../lib/kv.ts'
import { viewCountKey, redemptionCountKey, validationCountKey } from '../../../lib/analytics.ts'
import type { Coupon, Transaction } from '../../../lib/coupon.ts'
import type { Business } from '../../../lib/business.ts'

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
    const couponEntries = kv.list<Coupon>({ prefix: ['coupons'] })
    const coupons: Coupon[] = []
    for await (const entry of couponEntries) {
      coupons.push(entry.value)
    }

    if (coupons.length === 0) {
      return Response.json({
        totalCoupons: 0,
        totalViews: 0,
        totalRedemptions: 0,
        totalValidations: 0,
        totalDiscountCents: 0,
        perBusiness: [],
      } satisfies AdminAnalyticsResponse)
    }

    const couponAnalytics = await Promise.all(
      coupons.map(async (coupon) => {
        const [viewsRes, redemptionsRes, validationsRes] = await Promise.all([
          kv.get<Deno.KvU64>(viewCountKey(coupon.id)),
          kv.get<number>(redemptionCountKey(coupon.id)),
          kv.get<number>(validationCountKey(coupon.id)),
        ])
        return {
          businessId: coupon.businessId,
          views: Number(viewsRes.value?.value ?? 0n),
          redemptions: redemptionsRes.value ?? 0,
          validations: validationsRes.value ?? 0,
        }
      }),
    )

    const businessMap = new Map<string, string>()
    const businessIds = new Set(coupons.map((c) => c.businessId))
    await Promise.all(
      Array.from(businessIds).map(async (bid) => {
        const entry = await kv.get<Business>(['businesses', bid])
        businessMap.set(bid, entry.value?.name ?? 'Unknown Business')
      }),
    )

    const perBusinessMap = new Map<string, BusinessAnalytics>()
    for (const coupon of coupons) {
      let ba = perBusinessMap.get(coupon.businessId)
      if (!ba) {
        ba = {
          businessId: coupon.businessId,
          businessName: businessMap.get(coupon.businessId) ?? 'Unknown Business',
          couponCount: 0,
          totalViews: 0,
          totalRedemptions: 0,
          totalValidations: 0,
        }
        perBusinessMap.set(coupon.businessId, ba)
      }
      ba.couponCount++
    }

    for (const ca of couponAnalytics) {
      const ba = perBusinessMap.get(ca.businessId)
      if (ba) {
        ba.totalViews += ca.views
        ba.totalRedemptions += ca.redemptions
        ba.totalValidations += ca.validations
      }
    }

    const totalViews = couponAnalytics.reduce((s, c) => s + c.views, 0)
    const totalRedemptions = couponAnalytics.reduce((s, c) => s + c.redemptions, 0)
    const totalValidations = couponAnalytics.reduce((s, c) => s + c.validations, 0)

    const txEntries = kv.list<Transaction>({ prefix: ['business_transactions'] })
    let totalDiscountCents = 0
    for await (const entry of txEntries) {
      totalDiscountCents += entry.value.discountAppliedCents ?? 0
    }

    const perBusiness = Array.from(perBusinessMap.values())

    return Response.json({
      totalCoupons: coupons.length,
      totalViews,
      totalRedemptions,
      totalValidations,
      totalDiscountCents,
      perBusiness,
    } satisfies AdminAnalyticsResponse)
  },
})

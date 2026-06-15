import { define } from '../../../../utils.ts'
import { kv } from '../../../../lib/kv.ts'
import type { Coupon } from '../../../../lib/coupon.ts'

interface CouponWithBusiness extends Coupon {
  businessName: string
}

export const handler = define.handlers({
  async GET(ctx) {
    const url = new URL(ctx.req.url)
    const businessId = url.searchParams.get('businessId')
    const statusFilter = url.searchParams.get('status')
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')

    const iter = kv.list<Coupon>({ prefix: ['coupons'] })
    const rawCoupons: Coupon[] = []

    for await (const entry of iter) {
      rawCoupons.push(entry.value)
    }

    let filtered = rawCoupons

    if (businessId) {
      filtered = filtered.filter((c) => c.businessId === businessId)
    }

    if (statusFilter === 'active') {
      filtered = filtered.filter((c) => c.isActive === true)
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter((c) => c.isActive === false)
    }

    if (dateFrom) {
      const fromMs = new Date(dateFrom).getTime()
      if (!isNaN(fromMs)) {
        filtered = filtered.filter(
          (c) => new Date(c.createdAt).getTime() >= fromMs,
        )
      }
    }

    if (dateTo) {
      const toMs = new Date(dateTo).getTime()
      if (!isNaN(toMs)) {
        filtered = filtered.filter(
          (c) => new Date(c.createdAt).getTime() <= toMs,
        )
      }
    }

    filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime(),
    )

    const couponsWithBusiness: CouponWithBusiness[] = []
    for (const coupon of filtered) {
      const businessEntry = await kv.get<{ name: string }>([
        'businesses',
        coupon.businessId,
      ])
      couponsWithBusiness.push({
        ...coupon,
        businessName: businessEntry.value?.name || 'Unknown Business',
      })
    }

    return Response.json({
      coupons: couponsWithBusiness,
      total: couponsWithBusiness.length,
    })
  },
})

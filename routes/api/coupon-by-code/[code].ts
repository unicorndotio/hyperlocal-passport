import { define } from '../../../utils.ts'
import { auth } from '../../../lib/auth.ts'
import { kv } from '../../../lib/kv.ts'
import type { Coupon, Redemption } from '../../../lib/coupon.ts'

export const handler = define.handlers({
  async GET(ctx) {
    const session = await auth.api.getSession({ headers: ctx.req.headers })
    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    if (session.user.role !== 'business' && session.user.role !== 'admin') {
      return new Response('Forbidden', { status: 403 })
    }

    const { code } = ctx.params

    const redemptionRes = await kv.get<Redemption>(['redemptions', code])
    const redemption = redemptionRes.value
    if (!redemption) {
      return new Response('Redemption code not found', { status: 404 })
    }

    const couponRes = await kv.get<Coupon>(['coupons', redemption.couponId])
    const coupon = couponRes.value
    if (!coupon) {
      return new Response('Associated coupon not found', { status: 404 })
    }

    const behavior = coupon.behavior

    const response: Record<string, unknown> = {
      behaviorType: behavior.type,
      couponTitle: coupon.title,
      couponId: coupon.id,
      businessId: coupon.businessId,
    }

    if (behavior.type === 'bogo') {
      response.unitPriceCents = behavior.unitPriceCents
      response.buyQuantity = behavior.buyQuantity
      response.freeQuantity = behavior.freeQuantity
    } else if (behavior.type === 'item_specific') {
      response.unitPriceCents = behavior.unitPriceCents
      response.discountPerUnitCents = behavior.discountPerUnitCents
    }

    return Response.json(response)
  },
})

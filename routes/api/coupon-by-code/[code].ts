import { define } from '../../../utils.ts'
import { auth } from '../../../lib/auth.ts'
import { db } from '../../../lib/db.ts'
import * as schema from '../../../db/schema.ts'
import { eq } from 'drizzle-orm'

export const handler = define.handlers({
  async GET(ctx) {
    const session = await auth.api.getSession({ headers: ctx.req.headers })
    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    if (session.user.role !== 'business' && session.user.role !== 'admin') {
      return new Response('Forbidden', { status: 403 })
    }

    // Look up business profile for business users
    let businessId: string | null = null
    if (session.user.role === 'business') {
      const [business] = await db.select().from(schema.businesses)
        .where(eq(schema.businesses.userId, session.user.id))
      if (!business) {
        return new Response('Business profile not found', { status: 404 })
      }
      businessId = business.id
    }

    const { code } = ctx.params

    const [redemption] = await db.select().from(schema.redemptions)
      .where(eq(schema.redemptions.id, code))
    if (!redemption) {
      return new Response('Redemption code not found', { status: 404 })
    }

    // Verify business ownership
    if (businessId && redemption.businessId !== businessId) {
      return new Response('Forbidden: Code belongs to another business', {
        status: 403,
      })
    }

    const [coupon] = await db.select().from(schema.coupons)
      .where(eq(schema.coupons.id, redemption.couponId))
    if (!coupon) {
      return new Response('Associated coupon not found', { status: 404 })
    }

    const behavior = coupon.behavior as {
      type: string
      [key: string]: unknown
    }

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

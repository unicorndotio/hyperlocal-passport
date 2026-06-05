import { define } from '../../../../utils.ts'
import { auth } from '../../../../lib/auth.ts'
import { kv } from '../../../../lib/kv.ts'
import {
  Coupon,
  generateRedemptionCode,
  Redemption,
} from '../../../../lib/coupon.ts'

export const handler = define.handlers({
  async POST(ctx) {
    const { id: couponId } = ctx.params
    const session = await auth.api.getSession({ headers: ctx.req.headers })

    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    const userId = session.user.id

    // 1. Fetch the coupon
    const couponRes = await kv.get<Coupon>(['coupons', couponId])
    const coupon = couponRes.value

    if (!coupon) {
      return new Response('Coupon not found', { status: 404 })
    }

    if (!coupon.isActive) {
      return new Response('Coupon is not active', { status: 400 })
    }

    // 2. Check validUntil
    if (coupon.validUntil && coupon.validUntil < Date.now()) {
      return new Response('Coupon has expired', { status: 400 })
    }

    // 3. Check globalLimit (pre-check, will be atomic later)
    if (coupon.globalLimit !== undefined && coupon.globalLimit !== null) {
      if (coupon.globalClaimedCount >= coupon.globalLimit) {
        return new Response('Global limit reached', { status: 400 })
      }
    }

    // 4. Check userMonthlyLimit
    if (coupon.userMonthlyLimit) {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .getTime()

      // List user redemptions to count for this coupon this month
      // Key: ["user_redemptions", userId, timestamp]
      const userRedemptions = kv.list<Redemption>({
        prefix: ['user_redemptions', userId],
      })

      let count = 0
      for await (const entry of userRedemptions) {
        const r = entry.value
        if (r.couponId === couponId && r.redeemedAt >= startOfMonth) {
          count++
        }
      }

      if (count >= coupon.userMonthlyLimit) {
        return new Response('User monthly limit reached', { status: 400 })
      }
    }

    // 5. Generate redemption code and attempt atomic update
    const redemptionId = generateRedemptionCode()
    const now = Date.now()

    const redemption: Redemption = {
      id: redemptionId,
      couponId: coupon.id,
      businessId: coupon.businessId,
      userId: userId,
      status: 'active',
      redeemedAt: now,
    }

    const atomic = kv.atomic()
      .check(couponRes) // Ensure coupon hasn't changed since we read it
      .check({ key: ['redemptions', redemptionId], versionstamp: null }) // Ensure code is unique
      .set(['redemptions', redemptionId], redemption)
      .set(['user_redemptions', userId, now], redemption)

    // Increment globalClaimedCount if limit exists
    const updatedCoupon = {
      ...coupon,
      globalClaimedCount: coupon.globalClaimedCount + 1,
    }
    atomic.set(['coupons', couponId], updatedCoupon)

    const result = await atomic.commit()

    if (!result.ok) {
      return new Response(
        'Conflict or race condition occurred. Please try again.',
        { status: 409 },
      )
    }

    return Response.json(redemption, { status: 201 })
  },
})

import { define } from '../../../../utils.ts'
import { auth } from '../../../../lib/auth.ts'
import { kv } from '../../../../lib/kv.ts'
import { redemptionCountKey } from '../../../../lib/analytics.ts'
import {
  Coupon,
  generateRedemptionCode,
  Redemption,
} from '../../../../lib/coupon.ts'
import { validateRedemption } from '../../../../lib/coupon-engine.ts'

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

    // 2. Read analytics redemption counter for global cap enforcement
    const analyticsKey = redemptionCountKey(couponId)
    const analyticsRes = await kv.get<number>(analyticsKey)
    const redemptionCount = analyticsRes.value ?? 0

    // 3. Check validity via CouponEngine
    const validation = validateRedemption(coupon, {
      globalRedemptionCount: redemptionCount,
    })
    if (!validation.valid) {
      return new Response(validation.reason, { status: 400 })
    }

    // 4. Check userMonthlyLimit
    const now = new Date()
    const yearMonth = `${now.getFullYear()}-${now.getMonth() + 1}`
    const monthlyCounterKey = [
      'user_coupon_monthly_count',
      userId,
      couponId,
      yearMonth,
    ]
    const monthlyCounterRes = await kv.get<number>(monthlyCounterKey)
    const currentMonthlyCount = monthlyCounterRes.value || 0

    if (
      coupon.restrictions.userCap &&
      currentMonthlyCount >= coupon.restrictions.userCap
    ) {
      return new Response('User limit reached', { status: 400 })
    }

    // 5. Generate redemption code and attempt atomic update
    const redemptionId = generateRedemptionCode()
    const nowMs = Date.now()

    const redemption: Redemption = {
      id: redemptionId,
      couponId: coupon.id,
      businessId: coupon.businessId,
      userId: userId,
      status: 'active',
      redeemedAt: nowMs,
    }

    const atomic = kv.atomic()
      .check(couponRes) // Ensure coupon hasn't changed since we read it
      .check(analyticsRes) // Ensure analytics counter hasn't changed
      .check(monthlyCounterRes) // Ensure user limit hasn't changed
      .check({ key: ['redemptions', redemptionId], versionstamp: null }) // Ensure code is unique
      .set(['redemptions', redemptionId], redemption)
      .set(['user_redemptions', userId, nowMs], redemption)
      .set(monthlyCounterKey, currentMonthlyCount + 1)
      .set(analyticsKey, redemptionCount + 1)

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

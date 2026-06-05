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

    if (coupon.userMonthlyLimit && currentMonthlyCount >= coupon.userMonthlyLimit) {
      return new Response('User monthly limit reached', { status: 400 })
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
      .check(monthlyCounterRes) // Ensure user limit hasn't changed
      .check({ key: ['redemptions', redemptionId], versionstamp: null }) // Ensure code is unique
      .set(['redemptions', redemptionId], redemption)
      .set(['user_redemptions', userId, nowMs], redemption)
      .set(monthlyCounterKey, currentMonthlyCount + 1)

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

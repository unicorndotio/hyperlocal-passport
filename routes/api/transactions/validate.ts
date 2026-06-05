import { define } from '@/utils.ts'
import { auth } from '@/lib/auth.ts'
import { kv } from '@/lib/kv.ts'
import { getDenoKvAdapterRaw } from '@/lib/kv-adapter.ts'
import type { Business } from '@/lib/business.ts'
import { Coupon, Redemption, Transaction } from '@/lib/coupon.ts'

const adapter = getDenoKvAdapterRaw(kv)

export const handler = define.handlers({
  async POST(ctx) {
    const session = await auth.api.getSession({ headers: ctx.req.headers })
    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    if (session.user.role !== 'business' && session.user.role !== 'admin') {
      return new Response(
        'Forbidden: Only business owners or admins can validate transactions',
        { status: 403 },
      )
    }

    let body
    try {
      body = await ctx.req.json()
    } catch {
      return new Response('Invalid JSON body', { status: 400 })
    }

    const { code, amountCents } = body
    if (!code) {
      return new Response('Missing redemption code', { status: 400 })
    }
    if (typeof amountCents !== 'number' || amountCents <= 0) {
      return new Response('Invalid amountCents: must be a positive number', {
        status: 400,
      })
    }

    // 1. Find business associated with the user
    const business = await adapter.findOne<Business>({
      model: 'businesses',
      where: [{ field: 'userId', value: session.user.id }],
    })

    if (!business && session.user.role === 'business') {
      return new Response('Business profile not found for this user', {
        status: 404,
      })
    }

    // For admins without a business profile, we'll allow validation
    // but skip the ownership check if we want, OR we require they have a business.
    // Techspec implies it must belong to "the requesting business".
    if (!business) {
      return new Response(
        'A business profile is required to validate transactions',
        { status: 403 },
      )
    }

    const businessId = business.id

    // 2. Fetch Redemption
    const redemptionRes = await kv.get<Redemption>(['redemptions', code])
    const redemption = redemptionRes.value
    if (!redemption) {
      return new Response('Redemption code not found', { status: 404 })
    }

    // 3. Verify ownership and status
    if (redemption.businessId !== businessId) {
      return new Response('Redemption code belongs to another business', {
        status: 403,
      })
    }
    if (redemption.status !== 'active') {
      return new Response(`Redemption is already ${redemption.status}`, {
        status: 400,
      })
    }

    // 4. Fetch Coupon
    const couponRes = await kv.get<Coupon>(['coupons', redemption.couponId])
    const coupon = couponRes.value
    if (!coupon) {
      return new Response('Associated coupon not found', { status: 404 })
    }

    // 5. Verify Coupon validity
    if (!coupon.isActive) {
      return new Response('Coupon is no longer active', { status: 400 })
    }
    if (coupon.validUntil && coupon.validUntil < Date.now()) {
      return new Response('Coupon has expired', { status: 400 })
    }

    // 6. Calculate Math
    const discountPercent = coupon.discountPercent || 0
    const discountApplied = Math.floor(amountCents * (discountPercent / 100))
    const finalAmount = amountCents - discountApplied

    // 7. Atomic Update
    const transactionId = crypto.randomUUID()
    const now = Date.now()

    const transaction: Transaction = {
      id: transactionId,
      redemptionId: redemption.id,
      couponId: coupon.id,
      businessId: businessId,
      userId: redemption.userId,
      totalAmount: amountCents,
      discountApplied,
      finalAmount,
      timestamp: now,
    }

    const updatedRedemption: Redemption = {
      ...redemption,
      status: 'used',
      usedAt: now,
    }

    const atomic = kv.atomic()
      .check(redemptionRes)
      .set(['redemptions', code], updatedRedemption)
      .set(
        ['user_redemptions', redemption.userId, redemption.redeemedAt],
        updatedRedemption,
      )
      .set(['transactions', transactionId], transaction)
      .set(['business_transactions', businessId, now], transaction)
      .set(['user_transactions', redemption.userId, now], transaction)

    const result = await atomic.commit()
    if (!result.ok) {
      return new Response(
        'Conflict: Redemption may have been processed already',
        { status: 409 },
      )
    }

    return Response.json({
      transaction,
      redemption: updatedRedemption,
    })
  },
})

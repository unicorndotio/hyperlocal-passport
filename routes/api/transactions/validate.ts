import { define } from '@/utils.ts'
import { auth } from '@/lib/auth.ts'
import { kv } from '@/lib/kv.ts'
import { getDenoKvAdapterRaw } from '@/lib/kv-adapter.ts'
import type { Business } from '@/lib/business.ts'
import { Coupon, Redemption, Transaction } from '@/lib/coupon.ts'
import {
  calculate as couponCalculate,
  checkMinimumPurchase,
  validateRedemption,
} from '@/lib/coupon-engine.ts'
import { validationCountKey } from '@/lib/analytics.ts'

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

    const { code, amountCents, quantity } = body
    if (!code) {
      return new Response('Missing redemption code', { status: 400 })
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
    const validityCheck = validateRedemption(coupon)
    if (!validityCheck.valid) {
      return new Response(validityCheck.reason, { status: 400 })
    }

    // 6. Validate amountCents/quantity based on behavior type
    const behaviorType = coupon.behavior.type
    const isQuantityBased = behaviorType === 'bogo' ||
      behaviorType === 'item_specific'

    if (isQuantityBased) {
      if (
        typeof quantity !== 'number' || quantity <= 0 ||
        !Number.isInteger(quantity)
      ) {
        return new Response(
          `Quantity is required for ${behaviorType} coupons and must be a positive integer`,
          { status: 400 },
        )
      }
      if (amountCents !== undefined && amountCents !== null) {
        if (typeof amountCents !== 'number' || amountCents <= 0) {
          return new Response(
            'Invalid amountCents: must be a positive number',
            { status: 400 },
          )
        }
        const unitPrice = 'unitPriceCents' in coupon.behavior
          ? coupon.behavior.unitPriceCents
          : 0
        const expectedCents = unitPrice * quantity
        if (amountCents !== expectedCents) {
          return new Response(
            `amountCents mismatch: expected ${expectedCents}, got ${amountCents}`,
            { status: 400 },
          )
        }
      }
    } else {
      if (typeof amountCents !== 'number' || amountCents <= 0) {
        return new Response('Invalid amountCents: must be a positive number', {
          status: 400,
        })
      }
    }

    // 7. Calculate discount using CouponEngine
    const calcResult = couponCalculate({
      behavior: coupon.behavior,
      amountCents: amountCents ?? 0,
      quantity: quantity ?? undefined,
    })

    // 8. Check minimum purchase value
    if (
      !checkMinimumPurchase(
        calcResult.totalAmountCents,
        coupon.restrictions.minimumPurchaseValueCents,
      )
    ) {
      const minVal = coupon.restrictions.minimumPurchaseValueCents!
      return new Response(
        `Minimum purchase value of R$ ${(minVal / 100).toFixed(2)} not met`,
        { status: 400 },
      )
    }

    // 9. Read analytics validation counter
    const validationKey = validationCountKey(coupon.id)
    const validationRes = await kv.get<number>(validationKey)
    const validationCount = validationRes.value ?? 0

    // 10. Atomic Update
    const transactionId = crypto.randomUUID()
    const now = Date.now()

    const transaction: Transaction = {
      id: transactionId,
      redemptionId: redemption.id,
      couponId: coupon.id,
      businessId: businessId,
      userId: redemption.userId,
      totalAmountCents: calcResult.totalAmountCents,
      discountAppliedCents: calcResult.discountAppliedCents,
      finalAmountCents: calcResult.finalAmountCents,
      timestamp: now,
    }

    const updatedRedemption: Redemption = {
      ...redemption,
      status: 'used',
      usedAt: now,
    }

    const atomic = kv.atomic()
      .check(redemptionRes)
      .check(validationRes)
      .set(['redemptions', code], updatedRedemption)
      .set(
        ['user_redemptions', redemption.userId, redemption.redeemedAt],
        updatedRedemption,
      )
      .set(['transactions', transactionId], transaction)
      .set(['business_transactions', businessId, now], transaction)
      .set(['user_transactions', redemption.userId, now], transaction)
      .set(validationKey, validationCount + 1)

    const result = await atomic.commit()
    if (!result.ok) {
      return new Response(
        'Conflict: Redemption may have been processed already',
        { status: 409 },
      )
    }

    const responseQuantity =
      behaviorType === 'bogo' || behaviorType === 'item_specific'
        ? (quantity ?? undefined)
        : undefined
    const unitPriceCents = 'unitPriceCents' in coupon.behavior
      ? coupon.behavior.unitPriceCents
      : undefined

    return Response.json({
      transaction,
      redemption: updatedRedemption,
      behaviorType,
      quantity: responseQuantity,
      unitPriceCents,
    })
  },
})

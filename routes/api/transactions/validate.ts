import { define } from '@/utils.ts'
import { auth } from '@/lib/auth.ts'
import { db } from '@/lib/db.ts'
import * as schema from '@/db/schema.ts'
import { eq, sql } from 'drizzle-orm'
import type { Business } from '@/lib/business.ts'
import { Coupon, Redemption, Transaction } from '@/lib/coupon.ts'
import {
  calculate as couponCalculate,
  checkMinimumPurchase,
  validateRedemption,
} from '@/lib/coupon-engine.ts'

class TransactionError extends Error {
  statusCode: number
  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
  }
}

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
    const [business] = await db.select().from(schema.businesses)
      .where(eq(schema.businesses.userId, session.user.id))

    if (!business && session.user.role === 'business') {
      return new Response('Business profile not found for this user', {
        status: 404,
      })
    }

    if (!business) {
      return new Response(
        'A business profile is required to validate transactions',
        { status: 403 },
      )
    }

    const businessId = business.id

    try {
      const result = await db.transaction(async (tx) => {
        // 2. Fetch Redemption
        const [redemption] = await tx.select().from(schema.redemptions)
          .where(eq(schema.redemptions.id, code))

        if (!redemption) {
          throw new TransactionError('Redemption code not found', 404)
        }

        // 3. Verify ownership and status
        if (redemption.businessId !== businessId) {
          throw new TransactionError(
            'Redemption code belongs to another business',
            403,
          )
        }

        if (redemption.status !== 'active') {
          throw new TransactionError(
            `Redemption is already ${redemption.status}`,
            400,
          )
        }

        // 4. Fetch Coupon
        const [coupon] = await tx.select().from(schema.coupons)
          .where(eq(schema.coupons.id, redemption.couponId))

        if (!coupon) {
          throw new TransactionError('Associated coupon not found', 404)
        }

        // 5. Verify Coupon validity
        const validityCheck = validateRedemption(coupon as unknown as Coupon)
        if (!validityCheck.valid) {
          throw new TransactionError(validityCheck.reason!, 400)
        }

        // 6. Validate amountCents/quantity based on behavior type
        const behavior = coupon.behavior as Record<string, unknown>
        const behaviorType = behavior.type as string
        const isQuantityBased = behaviorType === 'bogo' ||
          behaviorType === 'item_specific'

        if (isQuantityBased) {
          if (
            typeof quantity !== 'number' || quantity <= 0 ||
            !Number.isInteger(quantity)
          ) {
            throw new TransactionError(
              `Quantity is required for ${behaviorType} coupons and must be a positive integer`,
              400,
            )
          }
          if (amountCents !== undefined && amountCents !== null) {
            if (typeof amountCents !== 'number' || amountCents <= 0) {
              throw new TransactionError(
                'Invalid amountCents: must be a positive number',
                400,
              )
            }
            const unitPrice = 'unitPriceCents' in behavior
              ? behavior.unitPriceCents as number
              : 0
            const expectedCents = unitPrice * quantity
            if (amountCents !== expectedCents) {
              throw new TransactionError(
                `amountCents mismatch: expected ${expectedCents}, got ${amountCents}`,
                400,
              )
            }
          }
        } else {
          if (typeof amountCents !== 'number' || amountCents <= 0) {
            throw new TransactionError(
              'Invalid amountCents: must be a positive number',
              400,
            )
          }
        }

        // 7. Calculate discount using CouponEngine
        const calcResult = couponCalculate({
          behavior: coupon.behavior as Coupon['behavior'],
          amountCents: amountCents ?? 0,
          quantity: quantity ?? undefined,
        })

        // 8. Check minimum purchase value
        const restrictions = coupon.restrictions as Record<string, unknown>
        if (
          !checkMinimumPurchase(
            calcResult.totalAmountCents,
            restrictions.minimumPurchaseValueCents as number | undefined,
          )
        ) {
          const minVal = restrictions.minimumPurchaseValueCents as number
          throw new TransactionError(
            `Minimum purchase value of R$ ${(minVal / 100).toFixed(2)} not met`,
            400,
          )
        }

        // 9. Create transaction record
        const transactionId = crypto.randomUUID()
        const now = new Date()

        const [newTransaction] = await tx.insert(schema.transactions).values({
          id: transactionId,
          redemptionId: redemption.id,
          couponId: coupon.id,
          businessId: businessId,
          userId: redemption.userId,
          totalAmountCents: calcResult.totalAmountCents,
          discountAppliedCents: calcResult.discountAppliedCents,
          finalAmountCents: calcResult.finalAmountCents,
          timestamp: now,
        }).returning()

        // 10. Update redemption status to 'used'
        await tx.update(schema.redemptions)
          .set({ status: 'used', usedAt: now })
          .where(eq(schema.redemptions.id, code))

        // 11. Increment analytics validation counter (UPSERT)
        const analyticsId = crypto.randomUUID()
        await tx.execute(
          sql`INSERT INTO coupon_analytics (id, coupon_id, validations)
              VALUES (${analyticsId}, ${coupon.id}, 1)
              ON CONFLICT (coupon_id)
              DO UPDATE SET validations = coupon_analytics.validations + 1`,
        )

        const responseQuantity =
          behaviorType === 'bogo' || behaviorType === 'item_specific'
            ? (quantity ?? undefined)
            : undefined
        const unitPriceCents = 'unitPriceCents' in behavior
          ? behavior.unitPriceCents as number | undefined
          : undefined

        return {
          transaction: {
            id: newTransaction.id,
            redemptionId: newTransaction.redemptionId,
            couponId: newTransaction.couponId,
            businessId: newTransaction.businessId,
            userId: newTransaction.userId,
            totalAmountCents: newTransaction.totalAmountCents,
            discountAppliedCents: newTransaction.discountAppliedCents,
            finalAmountCents: newTransaction.finalAmountCents,
            timestamp: newTransaction.timestamp.getTime(),
          },
          redemption: {
            id: redemption.id,
            couponId: redemption.couponId,
            businessId: redemption.businessId,
            userId: redemption.userId,
            status: 'used',
            redeemedAt: redemption.redeemedAt.getTime(),
            usedAt: now.getTime(),
          },
          behaviorType,
          quantity: responseQuantity,
          unitPriceCents,
        }
      }, { isolationLevel: 'serializable' })

      return Response.json(result)
    } catch (err) {
      if (err instanceof TransactionError) {
        return new Response(err.message, { status: err.statusCode })
      }
      if (err instanceof Error) {
        const msg = err.message
        if (
          msg.includes('could not serialize access') ||
          msg.includes('40001') ||
          msg.includes('deadlock detected')
        ) {
          return new Response(
            'Conflict or race condition occurred. Please try again.',
            { status: 409 },
          )
        }
      }
      throw err
    }
  },
})

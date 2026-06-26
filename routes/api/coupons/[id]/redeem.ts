import { define } from '../../../../utils.ts'
import { auth } from '../../../../lib/auth.ts'
import { db } from '../../../../lib/db.ts'
import * as schema from '../../../../db/schema.ts'
import { and, count, eq, gte, sql } from 'drizzle-orm'
import { generateRedemptionCode } from '../../../../lib/coupon.ts'
import type { Coupon } from '../../../../lib/coupon.ts'
import { validateRedemption } from '../../../../lib/coupon-engine.ts'

class TransactionError extends Error {
  statusCode: number
  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
  }
}

export const handler = define.handlers({
  async POST(ctx) {
    const { id: couponId } = ctx.params
    const session = await auth.api.getSession({ headers: ctx.req.headers })

    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    const userId = session.user.id

    try {
      const redemption = await db.transaction(async (tx) => {
        const [coupon] = await tx.select().from(schema.coupons)
          .where(eq(schema.coupons.id, couponId))
        if (!coupon) throw new TransactionError('Coupon not found', 404)

        if (!coupon.isActive) {
          throw new TransactionError('Coupon is not active', 400)
        }

        const [analytics] = await tx.select().from(schema.couponAnalytics)
          .where(eq(schema.couponAnalytics.couponId, couponId))
        const globalRedemptionCount = analytics?.redemptions ?? 0

        const now = new Date()
        const startOfMonth = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
        )
        const [monthlyResult] = await tx.select({ count: count() })
          .from(schema.redemptions)
          .where(
            and(
              eq(schema.redemptions.userId, userId),
              eq(schema.redemptions.couponId, couponId),
              gte(schema.redemptions.redeemedAt, startOfMonth),
            ),
          )
        const userMonthlyCount = monthlyResult?.count ?? 0

        const validation = validateRedemption(
          coupon as unknown as Coupon,
          {
            globalRedemptionCount,
            userRedemptionCount: userMonthlyCount,
          },
        )
        if (!validation.valid) {
          throw new TransactionError(validation.reason!, 400)
        }

        const redemptionId = generateRedemptionCode()
        const [newRedemption] = await tx.insert(schema.redemptions).values({
          id: redemptionId,
          couponId: coupon.id,
          businessId: coupon.businessId,
          userId,
          status: 'active',
        }).returning()

        const analyticsId = crypto.randomUUID()
        await tx.execute(
          sql`INSERT INTO coupon_analytics (id, coupon_id, redemptions)
              VALUES (${analyticsId}, ${coupon.id}, 1)
              ON CONFLICT (coupon_id)
              DO UPDATE SET redemptions = coupon_analytics.redemptions + 1`,
        )

        return {
          id: newRedemption.id,
          couponId: newRedemption.couponId,
          businessId: newRedemption.businessId,
          userId: newRedemption.userId,
          status: newRedemption.status,
          redeemedAt: newRedemption.redeemedAt?.getTime() ?? Date.now(),
        }
      }, { isolationLevel: 'serializable' })

      return Response.json(redemption, { status: 201 })
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

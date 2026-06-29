import { define } from '../../../../utils.ts'
import { auth } from '../../../../lib/auth.ts'
import { db } from '../../../../lib/db.ts'
import * as schema from '../../../../db/schema.ts'
import { and, eq } from 'drizzle-orm'

export const handler = define.handlers({
  async GET(ctx) {
    const session = await auth.api.getSession({ headers: ctx.req.headers })

    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    if (session.user.role !== 'resident') {
      return new Response('Forbidden', { status: 403 })
    }

    const userId = session.user.id

    const rows = await db.select({
      businessId: schema.redemptions.businessId,
      businessName: schema.businesses.name,
      discountAppliedCents: schema.transactions.discountAppliedCents,
    })
      .from(schema.redemptions)
      .innerJoin(
        schema.transactions,
        eq(schema.redemptions.id, schema.transactions.redemptionId),
      )
      .innerJoin(
        schema.businesses,
        eq(schema.redemptions.businessId, schema.businesses.id),
      )
      .where(
        and(
          eq(schema.redemptions.userId, userId),
          eq(schema.redemptions.status, 'used'),
        ),
      )

    const byBusinessMap = new Map<
      string,
      { businessId: string; businessName: string; savingsCents: number; count: number }
    >()

    for (const row of rows) {
      const existing = byBusinessMap.get(row.businessId)
      if (existing) {
        existing.savingsCents += row.discountAppliedCents
        existing.count += 1
      } else {
        byBusinessMap.set(row.businessId, {
          businessId: row.businessId,
          businessName: row.businessName,
          savingsCents: row.discountAppliedCents,
          count: 1,
        })
      }
    }

    const totalSavingsCents = Array.from(byBusinessMap.values()).reduce(
      (sum, b) => sum + b.savingsCents,
      0,
    )

    return Response.json({
      totalSavingsCents,
      totalRedemptions: rows.length,
      byBusiness: Array.from(byBusinessMap.values()),
    })
  },
})

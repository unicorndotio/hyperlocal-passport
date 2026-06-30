import { db } from './db.ts'
import { businesses, redemptions, transactions } from '../db/schema.ts'
import { and, eq } from 'drizzle-orm'

export interface SavingsByBusiness {
  businessId: string
  businessName: string
  savingsCents: number
  count: number
}

export interface SavingsSummary {
  totalSavingsCents: number
  totalRedemptions: number
  byBusiness: SavingsByBusiness[]
}

export async function getSavingsSummary(
  userId: string,
): Promise<SavingsSummary> {
  const rows = await db.select({
    businessId: redemptions.businessId,
    businessName: businesses.name,
    discountAppliedCents: transactions.discountAppliedCents,
  })
    .from(redemptions)
    .innerJoin(
      transactions,
      eq(redemptions.id, transactions.redemptionId),
    )
    .innerJoin(
      businesses,
      eq(redemptions.businessId, businesses.id),
    )
    .where(
      and(
        eq(redemptions.userId, userId),
        eq(redemptions.status, 'used'),
      ),
    )

  const byBusinessMap = new Map<string, SavingsByBusiness>()

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

  return {
    totalSavingsCents,
    totalRedemptions: rows.length,
    byBusiness: Array.from(byBusinessMap.values()),
  }
}

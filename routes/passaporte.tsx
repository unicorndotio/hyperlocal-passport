import { define } from '../utils.ts'
import { page } from 'fresh'
import { auth } from '../lib/auth.ts'
import { db } from '../lib/db.ts'
import { businesses, redemptions, transactions, users } from '../db/schema.ts'
import { and, desc, eq } from 'drizzle-orm'
import { Redemption } from '../lib/coupon.ts'
import { Head } from 'fresh/runtime'
import PassportCover from '../islands/PassportCover.tsx'
import BottomNav from '../components/BottomNav.tsx'

interface SavingsByBusiness {
  businessId: string
  businessName: string
  savingsCents: number
  count: number
}

interface SavingsSummary {
  totalSavingsCents: number
  totalRedemptions: number
  byBusiness: SavingsByBusiness[]
}

export const handler = define.handlers({
  async GET(ctx) {
    const session = await auth.api.getSession({ headers: ctx.req.headers })

    if (!session) {
      return ctx.redirect('/login')
    }

    const userId = session.user.id

    const [userRow] = await db.select({
      status: users.status,
      name: users.name,
    })
      .from(users)
      .where(eq(users.id, userId))

    const rows = await db.select({
      id: redemptions.id,
      couponId: redemptions.couponId,
      businessId: redemptions.businessId,
      userId: redemptions.userId,
      status: redemptions.status,
      redeemedAt: redemptions.redeemedAt,
      usedAt: redemptions.usedAt,
      businessName: businesses.name,
    })
      .from(redemptions)
      .innerJoin(businesses, eq(redemptions.businessId, businesses.id))
      .where(
        and(
          eq(redemptions.userId, userId),
          eq(redemptions.status, 'active'),
        ),
      )
      .orderBy(desc(redemptions.redeemedAt))

    const activeRedemptions: (Redemption & { businessName: string })[] = rows
      .map((r) => ({
        id: r.id,
        couponId: r.couponId,
        businessId: r.businessId,
        userId: r.userId,
        status: r.status as 'active' | 'used' | 'expired',
        redeemedAt: r.redeemedAt?.getTime() ?? Date.now(),
        usedAt: r.usedAt?.getTime(),
        businessName: r.businessName,
      }))

    const savingsRows = await db.select({
      businessId: transactions.businessId,
      businessName: businesses.name,
      savingsCents: transactions.discountAppliedCents,
    })
      .from(transactions)
      .innerJoin(businesses, eq(transactions.businessId, businesses.id))
      .where(eq(transactions.userId, userId))

    const totalSavingsCents = savingsRows.reduce(
      (sum, r) => sum + r.savingsCents,
      0,
    )

    const byBusinessMap = new Map<string, SavingsByBusiness>()
    for (const r of savingsRows) {
      const existing = byBusinessMap.get(r.businessId)
      if (existing) {
        existing.savingsCents += r.savingsCents
        existing.count += 1
      } else {
        byBusinessMap.set(r.businessId, {
          businessId: r.businessId,
          businessName: r.businessName,
          savingsCents: r.savingsCents,
          count: 1,
        })
      }
    }

    const savingsHistory: SavingsSummary = {
      totalSavingsCents,
      totalRedemptions: savingsRows.length,
      byBusiness: Array.from(byBusinessMap.values()),
    }

    return page({
      redemptions: activeRedemptions,
      savingsHistory,
      userStatus: (userRow?.status ?? 'pending') as
        | 'approved'
        | 'pending'
        | 'rejected',
      residentName: userRow?.name ?? 'Residente',
    })
  },
})

export default define.page<typeof handler>(function PassaportePage(ctx) {
  const { redemptions, savingsHistory, userStatus, residentName } = ctx.data

  return (
    <div class='px-4 py-6 max-w-md mx-auto min-h-screen bg-background'>
      <Head>
        <title>Meu Passaporte - Passaporte Local</title>
      </Head>

      <header class='mb-8 px-2'>
        <h1 class='text-3xl font-black text-primary mb-2 tracking-tight'>
          Meu Passaporte
        </h1>
        <p class='text-muted-foreground text-sm font-bold uppercase tracking-tighter opacity-70'>
          Seus cupons ativos para usar no caixa.
        </p>
      </header>

      <PassportCover
        status={userStatus}
        redemptions={redemptions.map((r) => ({
          id: r.id,
          businessName: r.businessName,
          redeemedAt: r.redeemedAt,
        }))}
        savingsHistory={savingsHistory}
        residentName={residentName}
      />

      <BottomNav active='passaporte' />
      <div class='h-24' />
    </div>
  )
})

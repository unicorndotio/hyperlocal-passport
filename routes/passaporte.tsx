import { define } from '../utils.ts'
import { page } from 'fresh'
import { db } from '../lib/db.ts'
import { businesses, redemptions, users } from '../db/schema.ts'
import { and, desc, eq } from 'drizzle-orm'
import { Redemption } from '../lib/coupon.ts'
import { getSavingsSummary } from '../lib/savings.ts'
import { Head } from 'fresh/runtime'
import PassportCover from '../islands/PassportCover.tsx'
import BottomNav from '../components/BottomNav.tsx'

export const handler = define.handlers({
  async GET(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.redirect('/login')
    }

    const userId = user.id

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

    const savingsHistory = await getSavingsSummary(userId)

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

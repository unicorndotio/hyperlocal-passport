import { define } from '../../../../utils.ts'
import { auth } from '../../../../lib/auth.ts'
import { db } from '../../../../lib/db.ts'
import * as schema from '../../../../db/schema.ts'
import { desc, eq } from 'drizzle-orm'

export const handler = define.handlers({
  async GET(ctx) {
    const session = await auth.api.getSession({ headers: ctx.req.headers })

    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    const userId = session.user.id

    const rows = await db.select()
      .from(schema.redemptions)
      .where(eq(schema.redemptions.userId, userId))
      .orderBy(desc(schema.redemptions.redeemedAt))

    const activeRedemptions = rows
      .filter((r) => r.status === 'active')
      .map((r) => ({
        id: r.id,
        couponId: r.couponId,
        businessId: r.businessId,
        userId: r.userId,
        status: r.status,
        redeemedAt: r.redeemedAt?.getTime() ?? Date.now(),
        usedAt: r.usedAt?.getTime(),
      }))

    return Response.json(activeRedemptions)
  },
})

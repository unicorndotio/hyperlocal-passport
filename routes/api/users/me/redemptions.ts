import { define } from '../../../../utils.ts'
import { auth } from '../../../../lib/auth.ts'
import { db } from '../../../../lib/db.ts'
import * as schema from '../../../../db/schema.ts'
import { and, desc, eq } from 'drizzle-orm'

export const handler = define.handlers({
  async GET(ctx) {
    const session = await auth.api.getSession({ headers: ctx.req.headers })

    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    const userId = session.user.id

    const activeRedemptions = await db.select()
      .from(schema.redemptions)
      .where(
        and(
          eq(schema.redemptions.userId, userId),
          eq(schema.redemptions.status, 'active'),
        ),
      )
      .orderBy(desc(schema.redemptions.redeemedAt))
      .then((rows) =>
        rows.map((r) => ({
          id: r.id,
          couponId: r.couponId,
          businessId: r.businessId,
          userId: r.userId,
          status: r.status,
          redeemedAt: r.redeemedAt?.getTime() ?? Date.now(),
          usedAt: r.usedAt?.getTime(),
        }))
      )

    return Response.json(activeRedemptions)
  },
})

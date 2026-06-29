import { define } from '../../../../utils.ts'
import { db } from '../../../../lib/db.ts'
import * as schema from '../../../../db/schema.ts'
import { eq } from 'drizzle-orm'
import { validateBehavior } from '../../../../lib/coupon.ts'
import { refreshFeedView } from '../../../../lib/feed.ts'

export const handler = define.handlers({
  async PUT(ctx) {
    const { id } = ctx.params

    const [coupon] = await db
      .select()
      .from(schema.coupons)
      .where(eq(schema.coupons.id, id))
      .limit(1)

    if (!coupon) {
      return new Response(JSON.stringify({ error: 'Coupon not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let updateData: Record<string, unknown>
    try {
      updateData = await ctx.req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (
      updateData.behavior !== undefined &&
      updateData.behavior !== null
    ) {
      const result = validateBehavior(updateData.behavior)
      if (!result.valid) {
        return new Response(JSON.stringify({ error: result.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    const [updated] = await db
      .update(schema.coupons)
      .set(updateData)
      .where(eq(schema.coupons.id, id))
      .returning()

    try {
      await refreshFeedView(db)
    } catch (err) {
      console.error(
        'Failed to refresh feed view after admin coupon update:',
        err,
      )
    }

    return Response.json(updated)
  },

  async DELETE(ctx) {
    const { id } = ctx.params

    const [coupon] = await db
      .select()
      .from(schema.coupons)
      .where(eq(schema.coupons.id, id))
      .limit(1)

    if (!coupon) {
      return new Response(JSON.stringify({ error: 'Coupon not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await db
      .delete(schema.coupons)
      .where(eq(schema.coupons.id, id))

    return new Response(null, { status: 204 })
  },
})

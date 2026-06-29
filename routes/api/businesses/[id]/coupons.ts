import { define } from '../../../../utils.ts'
import { db } from '../../../../lib/db.ts'
import * as schema from '../../../../db/schema.ts'
import { eq } from 'drizzle-orm'
import { validateBehavior } from '../../../../lib/coupon.ts'
import { refreshFeedView } from '../../../../lib/feed.ts'

export const handler = define.handlers({
  async GET(ctx) {
    const { id: businessId } = ctx.params
    const coupons = await db
      .select()
      .from(schema.coupons)
      .where(eq(schema.coupons.businessId, businessId))
    return Response.json(coupons)
  },

  async POST(ctx) {
    const { id: businessId } = ctx.params
    let data
    try {
      data = await ctx.req.json()
    } catch {
      return new Response('Invalid JSON', { status: 400 })
    }

    if (!data.title) {
      return new Response('Title is required', { status: 400 })
    }

    let behavior
    if (data.behavior !== undefined) {
      const result = validateBehavior(data.behavior)
      if (!result.valid) {
        return new Response(result.message, { status: 400 })
      }
      behavior = result.behavior
    } else {
      behavior = { type: 'percentage_discount', percent: 10 }
    }

    const [coupon] = await db
      .insert(schema.coupons)
      .values({
        id: crypto.randomUUID(),
        businessId,
        title: data.title,
        description: data.description,
        behavior,
        restrictions: data.restrictions || {},
        isActive: data.isActive !== false,
      })
      .returning()

    try {
      await refreshFeedView(db)
    } catch (err) {
      console.error('Failed to refresh feed view after coupon creation:', err)
    }

    return Response.json(coupon, { status: 201 })
  },
})

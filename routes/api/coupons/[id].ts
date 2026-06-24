import { define } from '../../../utils.ts'
import { db } from '../../../lib/db.ts'
import * as schema from '../../../db/schema.ts'
import { eq } from 'drizzle-orm'
import { auth } from '../../../lib/auth.ts'
import type { Coupon } from '../../../lib/coupon.ts'
import { validateBehavior } from '../../../lib/coupon.ts'

function validateUpdateData(data: Record<string, unknown>): string | null {
  if (data.behavior !== undefined) {
    const result = validateBehavior(data.behavior)
    if (!result.valid) return result.message
  }
  return null
}

async function handleUpdate(ctx: {
  req: Request
  params: Record<string, string>
}) {
  const session = await auth.api.getSession({ headers: ctx.req.headers })
  if (!session) return new Response('Unauthorized', { status: 401 })

  const { id } = ctx.params
  const [coupon] = await db.select().from(schema.coupons)
    .where(eq(schema.coupons.id, id))
  if (!coupon) return new Response('Coupon Not Found', { status: 404 })

  if (session.user.role !== 'admin') {
    const [business] = await db.select().from(schema.businesses)
      .where(eq(schema.businesses.userId, session.user.id))
    if (!business || business.id !== coupon.businessId) {
      return new Response('Forbidden: You do not own this coupon', {
        status: 403,
      })
    }
  }

  let updateData
  try {
    updateData = await ctx.req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const validationError = validateUpdateData(updateData)
  if (validationError) {
    return new Response(validationError, { status: 400 })
  }

  const [updated] = await db.update(schema.coupons)
    .set(updateData)
    .where(eq(schema.coupons.id, id))
    .returning()

  return Response.json(updated)
}

export const handler = define.handlers({
  async GET(ctx) {
    const { id } = ctx.params
    const [coupon] = await db.select().from(schema.coupons)
      .where(eq(schema.coupons.id, id))
    if (!coupon) return new Response('Not Found', { status: 404 })
    return Response.json(coupon)
  },

  PUT(ctx) {
    return handleUpdate(ctx)
  },

  PATCH(ctx) {
    return handleUpdate(ctx)
  },

  async DELETE(ctx) {
    const session = await auth.api.getSession({ headers: ctx.req.headers })
    if (!session) return new Response('Unauthorized', { status: 401 })

    const { id } = ctx.params
    const [coupon] = await db.select().from(schema.coupons)
      .where(eq(schema.coupons.id, id))
    if (!coupon) return new Response('Coupon Not Found', { status: 404 })

    if (session.user.role !== 'admin') {
      const [business] = await db.select().from(schema.businesses)
        .where(eq(schema.businesses.userId, session.user.id))
      if (!business || business.id !== coupon.businessId) {
        return new Response('Forbidden: You do not own this coupon', {
          status: 403,
        })
      }
    }

    await db.delete(schema.coupons)
      .where(eq(schema.coupons.id, id))
    return new Response(null, { status: 204 })
  },
})

import { define } from '../../../utils.ts'
import { getDenoKvAdapterRaw } from '../../../lib/kv-adapter.ts'
import { auth } from '../../../lib/auth.ts'
import type { Business } from '../../../lib/business.ts'
import type { Coupon } from '../../../lib/coupon.ts'

const kv = await Deno.openKv()
const adapter = getDenoKvAdapterRaw(kv)

export const handler = define.handlers({
  async GET(ctx) {
    const { id } = ctx.params
    const coupon = await adapter.findOne<Coupon>({
      model: 'coupons',
      where: [{ field: 'id', value: id }],
    })
    if (!coupon) return new Response('Not Found', { status: 404 })
    return Response.json(coupon)
  },

  async PUT(ctx) {
    const session = await auth.api.getSession({ headers: ctx.req.headers })
    if (!session) return new Response('Unauthorized', { status: 401 })

    const { id } = ctx.params
    const coupon = await adapter.findOne<Coupon>({
      model: 'coupons',
      where: [{ field: 'id', value: id }],
    })
    if (!coupon) return new Response('Coupon Not Found', { status: 404 })

    // Ownership check
    if (session.user.role !== 'admin') {
      const business = await adapter.findOne<Business>({
        model: 'businesses',
        where: [{ field: 'userId', value: session.user.id }],
      })
      if (!business || business.id !== coupon.businessId) {
        return new Response('Forbidden: You do not own this coupon', { status: 403 })
      }
    }

    let updateData
    try {
      updateData = await ctx.req.json()
    } catch {
      return new Response('Invalid JSON', { status: 400 })
    }

    const updated = await adapter.update({
      model: 'coupons',
      where: [{ field: 'id', value: id }],
      update: updateData,
    })

    return Response.json(updated)
  },

  async DELETE(ctx) {
    const session = await auth.api.getSession({ headers: ctx.req.headers })
    if (!session) return new Response('Unauthorized', { status: 401 })

    const { id } = ctx.params
    const coupon = await adapter.findOne<Coupon>({
      model: 'coupons',
      where: [{ field: 'id', value: id }],
    })
    if (!coupon) return new Response('Coupon Not Found', { status: 404 })

    // Ownership check
    if (session.user.role !== 'admin') {
      const business = await adapter.findOne<Business>({
        model: 'businesses',
        where: [{ field: 'userId', value: session.user.id }],
      })
      if (!business || business.id !== coupon.businessId) {
        return new Response('Forbidden: You do not own this coupon', { status: 403 })
      }
    }

    await adapter.delete({
      model: 'coupons',
      where: [{ field: 'id', value: id }],
    })
    return new Response(null, { status: 204 })
  },
})

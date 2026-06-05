import { define } from '../../../utils.ts'
import { getDenoKvAdapterRaw } from '../../../lib/kv-adapter.ts'

const kv = await Deno.openKv()
const adapter = getDenoKvAdapterRaw(kv)

export const handler = define.handlers({
  async GET(ctx) {
    const { id } = ctx.params
    const coupon = await adapter.findOne({
      model: 'coupons',
      where: [{ field: 'id', value: id }],
    })
    if (!coupon) return new Response('Not Found', { status: 404 })
    return Response.json(coupon)
  },

  async PUT(ctx) {
    const { id } = ctx.params
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

    if (!updated) return new Response('Not Found', { status: 404 })
    return Response.json(updated)
  },

  async DELETE(ctx) {
    const { id } = ctx.params
    await adapter.delete({
      model: 'coupons',
      where: [{ field: 'id', value: id }],
    })
    return new Response(null, { status: 204 })
  },
})

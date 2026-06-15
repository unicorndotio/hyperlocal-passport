import { define } from '../../../../utils.ts'
import { kv } from '../../../../lib/kv.ts'
import { getDenoKvAdapterRaw } from '../../../../lib/kv-adapter.ts'
import type { Coupon } from '../../../../lib/coupon.ts'
import { validateBehavior } from '../../../../lib/coupon.ts'

const adapter = getDenoKvAdapterRaw(kv)

export const handler = define.handlers({
  async PUT(ctx) {
    const { id } = ctx.params

    const coupon = await adapter.findOne<Coupon>({
      model: 'coupons',
      where: [{ field: 'id', value: id }],
    })
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

    const updated = await adapter.update({
      model: 'coupons',
      where: [{ field: 'id', value: id }],
      update: updateData,
    })

    return Response.json(updated)
  },

  async DELETE(ctx) {
    const { id } = ctx.params

    const coupon = await adapter.findOne<Coupon>({
      model: 'coupons',
      where: [{ field: 'id', value: id }],
    })
    if (!coupon) {
      return new Response(JSON.stringify({ error: 'Coupon not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await adapter.delete({
      model: 'coupons',
      where: [{ field: 'id', value: id }],
    })

    return new Response(null, { status: 204 })
  },
})

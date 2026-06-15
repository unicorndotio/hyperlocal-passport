import { define } from '../../../../utils.ts'
import { kv } from '../../../../lib/kv.ts'
import { getDenoKvAdapterRaw } from '../../../../lib/kv-adapter.ts'
import { validateBehavior } from '../../../../lib/coupon.ts'
const adapter = getDenoKvAdapterRaw(kv)

export const handler = define.handlers({
  async GET(ctx) {
    const { id: businessId } = ctx.params
    const coupons = await adapter.findMany({
      model: 'coupons',
      where: [{ field: 'businessId', value: businessId }],
    })
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

    const coupon = await adapter.create({
      model: 'coupons',
      data: {
        businessId,
        title: data.title,
        description: data.description,
        behavior,
        restrictions: data.restrictions || {},
        isActive: data.isActive !== false,
        createdAt: new Date().toISOString(),
      },
    })

    return Response.json(coupon, { status: 201 })
  },
})

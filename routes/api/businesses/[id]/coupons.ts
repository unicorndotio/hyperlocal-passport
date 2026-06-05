import { define } from '../../../../utils.ts'
import { getDenoKvAdapterRaw } from '../../../../lib/kv-adapter.ts'

const kv = await Deno.openKv()
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

    const coupon = await adapter.create({
      model: 'coupons',
      data: {
        businessId,
        type: data.type || 'basic',
        title: data.title,
        discountPercent: data.discountPercent,
        description: data.description,
        globalLimit: data.globalLimit,
        globalClaimedCount: 0,
        userMonthlyLimit: data.userMonthlyLimit,
        validUntil: data.validUntil,
        isActive: data.isActive !== false,
        createdAt: new Date().toISOString(),
      },
    })

    return Response.json(coupon, { status: 201 })
  },
})

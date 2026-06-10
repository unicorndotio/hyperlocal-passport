import { define } from '../../../../../utils.ts'
import { kv } from '../../../../../lib/kv.ts'

export async function handleToggle(
  businessId: string,
  isActive?: boolean,
): Promise<Response> {
  const businessEntry = await kv.get<Record<string, unknown>>([
    'businesses',
    businessId,
  ])
  if (!businessEntry.value) {
    return new Response(JSON.stringify({ error: 'Business not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const business = businessEntry.value
  const newIsActive = isActive !== undefined ? isActive : !business.isActive

  business.isActive = newIsActive

  const atomic = kv.atomic()
    .check(businessEntry)
    .set(['businesses', businessId], business)

  const result = await atomic.commit()
  if (!result.ok) {
    return new Response(
      JSON.stringify({ error: 'Failed to update business status' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }

  return new Response(JSON.stringify(business), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const handler = define.handlers({
  async PUT(ctx) {
    const businessId = ctx.params.id

    let body: { isActive?: boolean }
    try {
      body = await ctx.req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return await handleToggle(businessId, body.isActive)
  },
})

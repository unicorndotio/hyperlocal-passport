import { define } from '../../../../../utils.ts'
import { db } from '../../../../../lib/db.ts'
import * as schema from '../../../../../db/schema.ts'
import { eq } from 'drizzle-orm'

export async function handleToggle(
  businessId: string,
  isActive?: boolean,
): Promise<Response> {
  const [business] = await db
    .select()
    .from(schema.businesses)
    .where(eq(schema.businesses.id, businessId))
    .limit(1)

  if (!business) {
    return new Response(JSON.stringify({ error: 'Business not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const newIsActive = isActive !== undefined ? isActive : !business.isActive

  const [updated] = await db
    .update(schema.businesses)
    .set({ isActive: newIsActive })
    .where(eq(schema.businesses.id, businessId))
    .returning()

  return new Response(JSON.stringify(updated), {
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

import { define } from '../../../../../utils.ts'
import { db } from '../../../../../lib/db.ts'
import * as schema from '../../../../../db/schema.ts'
import { eq } from 'drizzle-orm'

export async function handleToggle(
  businessId: string,
  isActive?: boolean,
  expirationDate?: Date | null,
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

  const updateFields: Record<string, unknown> = { isActive: newIsActive }
  if (expirationDate !== undefined) {
    updateFields.expirationDate = expirationDate
  }

  const [updated] = await db
    .update(schema.businesses)
    .set(updateFields)
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

    let body: { isActive?: boolean; expirationDate?: string | null }
    try {
      body = await ctx.req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let expirationDate: Date | null | undefined = undefined
    if (body.expirationDate !== undefined) {
      const parsed = body.expirationDate ? new Date(body.expirationDate) : null
      if (parsed !== null && isNaN(parsed.getTime())) {
        return new Response(
          JSON.stringify({ error: 'Invalid expirationDate' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        )
      }
      expirationDate = parsed
    }

    return await handleToggle(businessId, body.isActive, expirationDate)
  },
})

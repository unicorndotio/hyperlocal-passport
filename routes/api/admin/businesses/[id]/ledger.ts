import { define } from '../../../../../utils.ts'
import { db } from '../../../../../lib/db.ts'
import * as schema from '../../../../../db/schema.ts'
import { eq } from 'drizzle-orm'

export async function handleLedgerPayment(
  businessId: string,
  amountCents: number,
  months: number,
  paymentDate: Date,
): Promise<Response> {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return new Response(
      JSON.stringify({ error: 'amountCents must be a positive integer' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }
  if (!Number.isInteger(months) || months <= 0) {
    return new Response(
      JSON.stringify({ error: 'months must be a positive integer' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const result = await db.transaction(async (tx) => {
    const [business] = await tx
      .select()
      .from(schema.businesses)
      .where(eq(schema.businesses.id, businessId))
      .limit(1)

    if (!business) {
      return { error: 'Business not found', status: 404 }
    }

    const baseDate = business.expirationDate
      ? new Date(business.expirationDate)
      : new Date()
    const newExpirationDate = new Date(baseDate)
    newExpirationDate.setMonth(newExpirationDate.getMonth() + months)

    await tx.insert(schema.partnerLedger).values({
      businessId,
      amountCents,
      months,
      paymentDate,
    })

    const [updated] = await tx
      .update(schema.businesses)
      .set({
        isActive: true,
        expirationDate: newExpirationDate,
      })
      .where(eq(schema.businesses.id, businessId))
      .returning()

    return { business: updated }
  })

  if ('error' in result) {
    return new Response(
      JSON.stringify({ error: result.error }),
      {
        status: result.status,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }

  return new Response(JSON.stringify(result.business), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const handler = define.handlers({
  async POST(ctx) {
    const businessId = ctx.params.id

    let body: { amountCents?: number; months?: number; paymentDate?: string }
    try {
      body = await ctx.req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (
      body.amountCents == null || body.months == null ||
      body.paymentDate == null
    ) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: amountCents, months, paymentDate',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const paymentDate = new Date(body.paymentDate)
    if (isNaN(paymentDate.getTime())) {
      return new Response(
        JSON.stringify({ error: 'Invalid paymentDate' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    return await handleLedgerPayment(
      businessId,
      body.amountCents,
      body.months,
      paymentDate,
    )
  },
})

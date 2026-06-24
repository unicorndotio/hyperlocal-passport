import { define } from '../../../../../utils.ts'
import { db } from '../../../../../lib/db.ts'
import * as schema from '../../../../../db/schema.ts'
import { eq } from 'drizzle-orm'

export async function handleReviewSignal(
  signalId: string,
  newStatus: string = 'approved',
): Promise<Response> {
  const [signal] = await db
    .select()
    .from(schema.signals)
    .where(eq(schema.signals.id, signalId))
    .limit(1)

  if (!signal) {
    return new Response(JSON.stringify({ error: 'Signal not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (signal.status !== 'pending') {
    return new Response(JSON.stringify(signal), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const [updated] = await db
    .update(schema.signals)
    .set({ status: newStatus })
    .where(eq(schema.signals.id, signalId))
    .returning()

  return new Response(JSON.stringify(updated), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const handler = define.handlers({
  async PUT(ctx) {
    const signalId = ctx.params.id
    let body: { status?: string }
    try {
      body = await ctx.req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const newStatus = body.status || 'approved'
    if (newStatus !== 'approved' && newStatus !== 'rejected') {
      return new Response(
        JSON.stringify({ error: 'Status must be "approved" or "rejected"' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    return await handleReviewSignal(signalId, newStatus)
  },
})

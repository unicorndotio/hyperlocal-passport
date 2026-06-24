import { define } from '../../../utils.ts'
import { db } from '../../../lib/db.ts'
import * as schema from '../../../db/schema.ts'
import { validateSignalInput } from '../../../lib/signals.ts'

export async function handleCreateSignal(
  body: { category?: string; description?: string },
  residentId: string,
): Promise<Response> {
  const validationError = validateSignalInput(body)
  if (validationError) {
    return new Response(JSON.stringify({ error: validationError }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const category = body.category!.trim()
  const description = body.description!.trim()
  const signalId = crypto.randomUUID()

  try {
    const [signal] = await db.insert(schema.signals).values({
      id: signalId,
      userId: residentId,
      category,
      description,
    }).returning()

    return new Response(JSON.stringify(signal), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Failed to create signal:', err)
    return new Response(
      JSON.stringify({ error: 'Failed to create signal, please retry' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}

export const handler = define.handlers({
  async POST(ctx) {
    const user = ctx.state.user
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (user.role !== 'resident') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Residents only' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    let body: { category?: string; description?: string }
    try {
      body = await ctx.req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return await handleCreateSignal(body, user.id)
  },
})

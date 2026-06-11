import { define } from '../../../utils.ts'
import { kv } from '../../../lib/kv.ts'
import {
  type DemandSignal,
  getCategoryCountKey,
  getCategoryIndexKey,
  getRateLimitKey,
  getSignalKey,
  getTodayDate,
  validateSignalInput,
} from '../../../lib/signals.ts'

const MAX_SIGNALS_PER_DAY = 5

export async function handleCreateSignal(
  kvInstance: Deno.Kv,
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
  const today = getTodayDate()
  const rateLimitKey = getRateLimitKey(residentId, today)

  const rateLimitEntry = await kvInstance.get<number>(rateLimitKey)
  const currentCount = rateLimitEntry.value ?? 0

  if (currentCount >= MAX_SIGNALS_PER_DAY) {
    return new Response(
      JSON.stringify({
        error:
          `Rate limit exceeded. Maximum ${MAX_SIGNALS_PER_DAY} signals per day.`,
      }),
      {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }

  const signalId = crypto.randomUUID()
  const now = Date.now()

  const signal: DemandSignal = {
    id: signalId,
    category,
    description,
    residentId,
    createdAt: now,
    reviewed: false,
  }

  const countKey = getCategoryCountKey(category)
  const countEntry = await kvInstance.get<number>(countKey)

  const atomic = kvInstance.atomic()
    .check(countEntry)
    .set(getSignalKey(signalId), signal)
    .set(getCategoryIndexKey(category, now, signalId), {
      signalId,
      reviewed: false,
    })
    .set(rateLimitKey, currentCount + 1)
    .set(countKey, (countEntry.value ?? 0) + 1)

  const result = await atomic.commit()

  if (!result.ok) {
    return new Response(
      JSON.stringify({ error: 'Failed to create signal, please retry' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }

  return new Response(JSON.stringify(signal), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  })
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

    return await handleCreateSignal(kv, body, user.id)
  },
})

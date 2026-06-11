import { define } from '../../../../../utils.ts'
import { kv } from '../../../../../lib/kv.ts'
import {
  type DemandSignal,
  getCategoryIndexKey,
  getSignalKey,
} from '../../../../../lib/signals.ts'

export async function handleReviewSignal(
  kvInstance: Deno.Kv,
  signalId: string,
): Promise<Response> {
  const signalEntry = await kvInstance.get<DemandSignal>(getSignalKey(signalId))

  if (!signalEntry.value) {
    return new Response(JSON.stringify({ error: 'Signal not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const signal = signalEntry.value

  if (signal.reviewed) {
    return new Response(JSON.stringify(signal), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  signal.reviewed = true

  const categoryIndexKey = getCategoryIndexKey(
    signal.category,
    signal.createdAt,
    signalId,
  )
  const atomic = kvInstance.atomic()
    .check(signalEntry)
    .set(getSignalKey(signalId), signal)
    .set(categoryIndexKey, { signalId, reviewed: true })

  const result = await atomic.commit()
  if (!result.ok) {
    return new Response(
      JSON.stringify({ error: 'Failed to review signal, please retry' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }

  return new Response(JSON.stringify(signal), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const handler = define.handlers({
  async PUT(ctx) {
    const signalId = ctx.params.id
    return await handleReviewSignal(kv, signalId)
  },
})

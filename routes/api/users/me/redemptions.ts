import { define } from '../../../../utils.ts'
import { auth } from '../../../../lib/auth.ts'
import { kv } from '../../../../lib/kv.ts'
import { Redemption } from '../../../../lib/coupon.ts'

export const handler = define.handlers({
  async GET(ctx) {
    const session = await auth.api.getSession({ headers: ctx.req.headers })

    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    const userId = session.user.id

    // List user redemptions
    // Key: ["user_redemptions", userId, timestamp]
    const entries = kv.list<Redemption>({ 
      prefix: ['user_redemptions', userId] 
    }, {
      reverse: true // Newest first
    })
    
    const redemptions: Redemption[] = []
    for await (const entry of entries) {
      redemptions.push(entry.value)
    }

    // Filter by status 'active' if needed, but usually we want to show active ones in Passaporte
    // The requirement says: "MUST show a list of the user's currently active (un-used) redemptions."
    // So we filter for 'active'.
    const activeRedemptions = redemptions.filter(r => r.status === 'active')

    return Response.json(activeRedemptions)
  }
})

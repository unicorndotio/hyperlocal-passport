import { define } from '../../../../utils.ts'
import { getSavingsSummary } from '../../../../lib/savings.ts'

export const handler = define.handlers({
  async GET(ctx) {
    const user = ctx.state.user

    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    if (user.role !== 'resident') {
      return new Response('Forbidden', { status: 403 })
    }

    const userId = user.id
    const summary = await getSavingsSummary(userId)

    return Response.json(summary)
  },
})

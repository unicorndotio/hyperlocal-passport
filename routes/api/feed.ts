import { define } from '../../utils.ts'
import { db } from '../../lib/db.ts'
import { queryFeed } from '../../lib/feed.ts'

export const handler = define.handlers({
  async GET(ctx) {
    const url = new URL(ctx.req.url)
    const cursor = url.searchParams.get('cursor') || undefined
    const limitParam = url.searchParams.get('limit')
    const parsedLimit = limitParam ? parseInt(limitParam, 10) : NaN
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
      ? parsedLimit
      : undefined
    const userId = ctx.state.user?.id ?? null
    const result = await queryFeed(db, userId, cursor, limit)
    return Response.json(result)
  },
})

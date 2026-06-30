import { define } from '../../../utils.ts'
import { db } from '../../../lib/db.ts'
import * as schema from '../../../db/schema.ts'
import { eq } from 'drizzle-orm'
import { refreshFeedView } from '../../../lib/feed.ts'

export const handler = define.handlers({
  async PUT(ctx) {
    const user = ctx.state.user
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      )
    }
    if (user.role !== 'business') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Business access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const [business] = await db.select().from(schema.businesses)
      .where(eq(schema.businesses.userId, user.id))
      .limit(1)
    if (!business) {
      return new Response(
        JSON.stringify({ error: 'Business not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const postId = ctx.params.id
    const [existing] = await db.select().from(schema.merchantPosts)
      .where(eq(schema.merchantPosts.id, postId))
      .limit(1)
    if (!existing) {
      return new Response(
        JSON.stringify({ error: 'Post not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      )
    }
    if (existing.businessId !== business.id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Not your post' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      )
    }

    let json: Record<string, unknown>
    try {
      json = await ctx.req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const title = json.title as string | undefined
    const body = json.body as string | undefined

    if (json.imageUrl !== undefined) {
      return new Response(
        JSON.stringify({
          error: 'Image must be updated via multipart/form-data',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (title !== undefined && !title.trim()) {
      return new Response(
        JSON.stringify({ error: 'Title cannot be empty' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }
    if (title !== undefined && title.trim().length > 255) {
      return new Response(
        JSON.stringify({ error: 'Title must be at most 255 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = title.trim()
    if (body !== undefined) updateData.body = body || null
    if (json.removeImage === true) updateData.imageUrl = null
    updateData.updatedAt = new Date()

    const [updated] = await db.update(schema.merchantPosts)
      .set(updateData)
      .where(eq(schema.merchantPosts.id, postId))
      .returning()

    try {
      await refreshFeedView(db)
    } catch (err) {
      console.error('Failed to refresh feed view after post update:', err)
    }

    return Response.json(updated)
  },

  async DELETE(ctx) {
    const user = ctx.state.user
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      )
    }
    if (user.role !== 'business') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Business access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const [business] = await db.select().from(schema.businesses)
      .where(eq(schema.businesses.userId, user.id))
      .limit(1)
    if (!business) {
      return new Response(
        JSON.stringify({ error: 'Business not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const postId = ctx.params.id
    const [existing] = await db.select().from(schema.merchantPosts)
      .where(eq(schema.merchantPosts.id, postId))
      .limit(1)
    if (!existing) {
      return new Response(
        JSON.stringify({ error: 'Post not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      )
    }
    if (existing.businessId !== business.id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Not your post' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      )
    }

    await db.delete(schema.merchantPosts)
      .where(eq(schema.merchantPosts.id, postId))

    try {
      await refreshFeedView(db)
    } catch (err) {
      console.error('Failed to refresh feed view after post deletion:', err)
    }

    return new Response(null, { status: 204 })
  },
})

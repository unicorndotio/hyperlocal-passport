import { define } from '../../../utils.ts'
import { db } from '../../../lib/db.ts'
import * as schema from '../../../db/schema.ts'
import { desc, eq } from 'drizzle-orm'
import { uploadFile } from '../../../lib/storage.ts'
import { refreshFeedView } from '../../../lib/feed.ts'

export const handler = define.handlers({
  async POST(ctx) {
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

    let title: string
    let body: string | undefined
    let imageUrl: string | undefined

    const contentType = ctx.req.headers.get('content-type') || ''
    if (contentType.includes('multipart/form-data')) {
      let formData: FormData
      try {
        formData = await ctx.req.formData()
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid multipart form data' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        )
      }
      title = (formData.get('title') as string) || ''
      body = (formData.get('body') as string) || undefined
      const imageFile = formData.get('image') as File | null
      if (imageFile && imageFile.size > 0) {
        try {
          const filename = await uploadFile(imageFile, { isPublic: true })
          const baseUrl = Deno.env.get('APP_BASE_URL') ||
            'http://localhost:8000'
          imageUrl = `${baseUrl}/api/uploads/${filename}`
        } catch (err) {
          return new Response(
            JSON.stringify({
              error: err instanceof Error ? err.message : 'Upload failed',
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          )
        }
      }
    } else {
      let json: Record<string, unknown>
      try {
        json = await ctx.req.json()
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON body' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        )
      }
      if (json.imageUrl) {
        return new Response(
          JSON.stringify({
            error: 'Image must be uploaded via multipart/form-data',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        )
      }
      title = (json.title as string) || ''
      body = (json.body as string) || undefined
      imageUrl = undefined
    }

    if (!title.trim()) {
      return new Response(
        JSON.stringify({ error: 'Title is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }
    if (title.trim().length > 255) {
      return new Response(
        JSON.stringify({ error: 'Title must be at most 255 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }
    if (body && body.length > 10000) {
      return new Response(
        JSON.stringify({ error: 'Body must be at most 10000 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const [post] = await db.insert(schema.merchantPosts).values({
      id: crypto.randomUUID(),
      businessId: business.id,
      title: title.trim(),
      body: body?.trim() || null,
      imageUrl: imageUrl || null,
      isVisible: false,
    }).returning()

    try {
      await refreshFeedView(db)
    } catch (err) {
      console.error('Failed to refresh feed view after post creation:', err)
    }

    return Response.json(post, { status: 201 })
  },

  async GET(ctx) {
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

    const posts = await db.select().from(schema.merchantPosts)
      .where(eq(schema.merchantPosts.businessId, business.id))
      .orderBy(desc(schema.merchantPosts.createdAt))

    return Response.json(posts)
  },
})

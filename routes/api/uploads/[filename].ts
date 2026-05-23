import { Context } from 'fresh'
import { join } from 'https://deno.land/std@0.224.0/path/mod.ts'
import { auth } from '../../../lib/auth.ts'

const kv = await Deno.openKv()

interface FileMetadata {
  userId: string
  isPublic: boolean
}

export const handler = {
  async GET(req: Request, ctx: Context<unknown>) {
    const filename = ctx.params.filename
    if (!filename) {
      return new Response(
        JSON.stringify({ error: 'Filename parameter is missing' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Lookup metadata in Deno KV
    const metaEntry = await kv.get<FileMetadata>(['file_metadata', filename])
    const metadata = metaEntry.value

    // Determine access: default to private if no metadata is found
    const isPublic = metadata?.isPublic ?? false
    const ownerId = metadata?.userId ?? ''

    if (!isPublic) {
      // Perform authorization checks against Better Auth session
      const session = await auth.api.getSession({
        headers: req.headers,
      })

      if (!session) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const user = session.user
      const isOwner = ownerId && user.id === ownerId
      const isAdmin = user.role === 'admin'

      if (!isOwner && !isAdmin) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    // Resolve uploads directory and full file path
    const uploadsDir = Deno.env.get('UPLOADS_DIR') || '/app/uploads'
    const filePath = join(uploadsDir, filename)

    // Determine Content-Type header based on file extension
    const ext = filename.split('.').pop()?.toLowerCase() || ''
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'pdf': 'application/pdf',
      'txt': 'text/plain',
    }
    const contentType = mimeTypes[ext] || 'application/octet-stream'

    try {
      const file = await Deno.open(filePath, { read: true })
      return new Response(file.readable, {
        headers: {
          'Content-Type': contentType,
        },
      })
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        return new Response(JSON.stringify({ error: 'File not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  },
}

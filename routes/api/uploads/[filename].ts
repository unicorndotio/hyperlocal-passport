import { define } from '../../../utils.ts'
import { join } from 'https://deno.land/std@0.224.0/path/mod.ts'
import { auth } from '../../../lib/auth.ts'
import { kv } from '../../../lib/kv.ts'
import { json } from '../../../lib/utils.ts'

interface FileMetadata {
  userId: string
  isPublic: boolean
}

const mimeTypes: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  pdf: 'application/pdf',
}

export async function handleGetUpload(
  req: Request,
  filename: string,
): Promise<Response> {
  if (!filename) return json({ error: 'Filename parameter is missing' }, 400)

  const metaEntry = await kv.get<FileMetadata>(['file_metadata', filename])
  const metadata = metaEntry.value
  const isPublic = metadata?.isPublic ?? false
  const ownerId = metadata?.userId ?? ''

  if (!isPublic) {
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session) return json({ error: 'Unauthorized' }, 401)
    const user = session.user
    if (!(ownerId && user.id === ownerId) && user.role !== 'admin') {
      return json({ error: 'Forbidden' }, 403)
    }
  }

  const uploadsDir = Deno.env.get('UPLOADS_DIR') || '/app/uploads'
  const filePath = join(uploadsDir, filename)
  const ext = filename.split('.').pop()?.toLowerCase() || ''

  try {
    const file = await Deno.open(filePath, { read: true })
    return new Response(file.readable, {
      headers: { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' },
    })
  } catch (err) {
    const status = err instanceof Deno.errors.NotFound ? 404 : 500
    const error = err instanceof Deno.errors.NotFound
      ? 'File not found'
      : 'Internal Server Error'
    return json({ error }, status)
  }
}

// Fresh v2 route handler
export const handler = define.handlers({
  GET(ctx) {
    return handleGetUpload(ctx.req, ctx.params.filename)
  },
})

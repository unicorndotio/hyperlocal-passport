import { join } from 'https://deno.land/std@0.224.0/path/mod.ts'
import { eq } from 'npm:drizzle-orm@0.38.2'
import { db } from './db.ts'
import * as schema from '../db/schema.ts'

/**
 * Uploads a file/blob to the local filesystem under the UPLOADS_DIR directory.
 * Generates a unique UUID filename and returns it.
 * Saves access control metadata to PostgreSQL.
 */
export async function uploadFile(
  file: Blob | File,
  options?: { userId?: string; isPublic?: boolean },
): Promise<string> {
  const uploadsDir = Deno.env.get('UPLOADS_DIR') || '/app/uploads'

  // Ensure uploads directory exists
  await Deno.mkdir(uploadsDir, { recursive: true })

  // Validate input file is not empty
  if (file.size === 0) {
    throw new Error('File is empty')
  }

  // Determine file extension and validate type
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf']
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
  ]

  let ext = ''
  if (file instanceof File && file.name) {
    const dotIndex = file.name.lastIndexOf('.')
    if (dotIndex !== -1) {
      ext = file.name.slice(dotIndex + 1).toLowerCase()
    }
  }

  const mimeType = file.type
  if (!ext && mimeType) {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'application/pdf': 'pdf',
    }
    ext = mimeToExt[mimeType] || ''
  }

  // Default to bin if no extension is found, but validate it
  if (!ext) {
    ext = 'bin'
  }

  if (
    !allowedExtensions.includes(ext) &&
    (mimeType && !allowedMimeTypes.includes(mimeType))
  ) {
    throw new Error('Invalid file type')
  }

  // Generate unique filename and save to filesystem
  const uuid = crypto.randomUUID()
  const filename = `${uuid}.${ext}`
  const filePath = join(uploadsDir, filename)

  const arrayBuffer = await file.arrayBuffer()
  await Deno.writeFile(filePath, new Uint8Array(arrayBuffer))

  // Persist access control metadata in PostgreSQL
  await db.insert(schema.fileMetadata).values({
    id: uuid,
    filename,
    userId: options?.userId || null,
    isPublic: options?.isPublic ?? false,
  })

  return filename
}

/**
 * Deletes a file from the local filesystem and its metadata from PostgreSQL.
 */
export async function deleteFile(filename: string): Promise<void> {
  const uploadsDir = Deno.env.get('UPLOADS_DIR') || '/app/uploads'
  const filePath = join(uploadsDir, filename)

  try {
    await Deno.remove(filePath)
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) {
      console.error(`Failed to delete file ${filePath}:`, err)
    }
  }

  await db.delete(schema.fileMetadata).where(
    eq(schema.fileMetadata.filename, filename),
  )
}

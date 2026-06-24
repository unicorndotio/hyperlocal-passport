import { define } from '../../../utils.ts'
import { db } from '../../../lib/db.ts'
import * as schema from '../../../db/schema.ts'
import { eq } from 'drizzle-orm'
import { uploadFile } from '../../../lib/storage.ts'
import { isValidCnpj, normalizeCnpj } from '../../../lib/business.ts'

export const handler = define.handlers({
  async GET(_ctx) {
    const businesses = await db.select().from(schema.businesses)
    return Response.json(businesses)
  },

  async POST(ctx) {
    let formData: FormData
    try {
      formData = await ctx.req.formData()
    } catch {
      return new Response('Invalid multipart form data', { status: 400 })
    }

    const nameInput = formData.get('name') as string
    const companyNameInput = formData.get('companyName') as string
    const name = nameInput || companyNameInput || ''
    const companyName = companyNameInput || nameInput || ''
    const cnpj = formData.get('cnpj') as string || ''
    const category = formData.get('category') as string || ''
    const description = formData.get('description') as string || ''
    const logo = formData.get('logo') as File | null
    const userId = formData.get('userId') as string || ''
    const isActive = formData.get('isActive') !== 'false'

    if (!name.trim()) {
      return new Response('Missing required field: name', { status: 400 })
    }
    const normalizedCnpj = normalizeCnpj(cnpj)
    if (!normalizedCnpj || !isValidCnpj(normalizedCnpj)) {
      return new Response('Missing or invalid CNPJ', { status: 400 })
    }

    if (!category.trim()) {
      return new Response('Missing required field: category', { status: 400 })
    }
    if (!logo || logo.size === 0) {
      return new Response('Missing required file: logo', { status: 400 })
    }
    if (!userId.trim()) {
      return new Response('Missing required field: userId', { status: 400 })
    }

    let logoUrl = ''
    try {
      const filename = await uploadFile(logo, { isPublic: true })
      const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'http://localhost:8000'
      logoUrl = `${appBaseUrl}/api/uploads/${filename}`
    } catch (err) {
      return new Response(
        err instanceof Error ? err.message : 'Upload failed',
        { status: 400 },
      )
    }

    try {
      const [business] = await db.transaction(async (tx) => {
        const existingCnpj = await tx
          .select()
          .from(schema.businesses)
          .where(eq(schema.businesses.cnpj, normalizedCnpj))
          .limit(1)

        if (existingCnpj.length > 0) {
          throw new Error('CNPJ already registered')
        }

        return tx
          .insert(schema.businesses)
          .values({
            id: crypto.randomUUID(),
            name,
            companyName,
            cnpj: normalizedCnpj,
            category,
            description,
            logoUrl,
            userId,
            isActive,
          })
          .returning()
      })

      await db
        .update(schema.users)
        .set({ role: 'business' })
        .where(eq(schema.users.id, userId))

      return Response.json(business, { status: 201 })
    } catch (err) {
      if (err instanceof Error && err.message === 'CNPJ already registered') {
        return new Response('CNPJ already registered', { status: 409 })
      }
      throw err
    }
  },
})

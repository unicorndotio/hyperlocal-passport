import { define } from '../../../utils.ts'
import { db } from '../../../lib/db.ts'
import * as schema from '../../../db/schema.ts'
import { eq } from 'drizzle-orm'
import { uploadFile } from '../../../lib/storage.ts'
import { isValidCnpj, normalizeCnpj } from '../../../lib/business.ts'

export const handler = define.handlers({
  async PUT(ctx) {
    const { id } = ctx.params
    const contentType = ctx.req.headers.get('content-type') || ''
    let updateData: Record<string, unknown> = {}

    if (contentType.includes('multipart/form-data')) {
      let formData: FormData
      try {
        formData = await ctx.req.formData()
      } catch {
        return new Response('Invalid multipart form data', { status: 400 })
      }

      const nameInput = formData.get('name') as string
      const companyNameInput = formData.get('companyName') as string
      if (nameInput || companyNameInput) {
        updateData.name = nameInput || companyNameInput
        updateData.companyName = companyNameInput || nameInput
      }

      const cnpj = formData.get('cnpj') as string
      if (cnpj) {
        if (!isValidCnpj(cnpj)) {
          return new Response('Invalid CNPJ', { status: 400 })
        }
        updateData.cnpj = normalizeCnpj(cnpj)
      }

      const category = formData.get('category') as string
      if (category) {
        updateData.category = category
      }

      const description = formData.get('description') as string
      if (description !== null) {
        updateData.description = description
      }

      const userId = formData.get('userId') as string
      if (userId) {
        updateData.userId = userId
        await db
          .update(schema.users)
          .set({ role: 'business' })
          .where(eq(schema.users.id, userId))
      }

      const isActiveStr = formData.get('isActive') as string
      if (isActiveStr !== null) {
        updateData.isActive = isActiveStr === 'true'
      }

      const logo = formData.get('logo') as File | null
      if (logo && logo.size > 0) {
        try {
          const filename = await uploadFile(logo, { isPublic: true })
          const appBaseUrl = Deno.env.get('APP_BASE_URL') ||
            'http://localhost:8000'
          updateData.logoUrl = `${appBaseUrl}/api/uploads/${filename}`
        } catch (err) {
          return new Response(
            err instanceof Error ? err.message : 'Upload failed',
            { status: 400 },
          )
        }
      }
    } else {
      const body = await ctx.req.json()
      if (typeof body !== 'object' || body === null) {
        return new Response('Invalid JSON body', { status: 400 })
      }
      const ALLOWED_FIELDS = [
        'name',
        'companyName',
        'cnpj',
        'category',
        'description',
        'isActive',
        'userId',
        'logoUrl',
      ]
      updateData = {}
      for (const key of ALLOWED_FIELDS) {
        if (key in body) {
          updateData[key] = body[key]
        }
      }

      const name = updateData.name
      const companyName = updateData.companyName
      if (typeof name === 'string' && typeof companyName !== 'string') {
        updateData.companyName = name
      } else if (typeof companyName === 'string' && typeof name !== 'string') {
        updateData.name = companyName
      }

      const cnpj = updateData.cnpj
      if (typeof cnpj === 'string') {
        if (!isValidCnpj(cnpj)) {
          return new Response('Invalid CNPJ', { status: 400 })
        }
        updateData.cnpj = normalizeCnpj(cnpj)
      }

      const userId = updateData.userId
      if (typeof userId === 'string') {
        await db
          .update(schema.users)
          .set({ role: 'business' })
          .where(eq(schema.users.id, userId))
      }
    }

    const [updated] = await db
      .update(schema.businesses)
      .set(updateData)
      .where(eq(schema.businesses.id, id))
      .returning()

    if (!updated) return new Response('Not Found', { status: 404 })
    return Response.json(updated)
  },

  async DELETE(ctx) {
    const { id } = ctx.params
    await db
      .delete(schema.businesses)
      .where(eq(schema.businesses.id, id))
    return new Response(null, { status: 204 })
  },
})

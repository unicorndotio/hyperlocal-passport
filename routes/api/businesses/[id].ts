import { define } from '../../../utils.ts'
import { kv } from '../../../lib/kv.ts'
import { getDenoKvAdapterRaw } from '../../../lib/kv-adapter.ts'
import { uploadFile } from '../../../lib/storage.ts'
import { isValidCnpj } from '../../../lib/business.ts'
const adapter = getDenoKvAdapterRaw(kv)

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
        updateData.cnpj = cnpj
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
        await adapter.update({
          model: 'user',
          where: [{ field: 'id', value: userId }],
          update: { role: 'business' },
        })
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
      updateData = body as Record<string, unknown>

      const name = updateData.name
      const companyName = updateData.companyName
      if (typeof name === 'string' && typeof companyName !== 'string') {
        updateData.companyName = name
      } else if (typeof companyName === 'string' && typeof name !== 'string') {
        updateData.name = companyName
      }

      const cnpj = updateData.cnpj
      if (typeof cnpj === 'string' && !isValidCnpj(cnpj)) {
        return new Response('Invalid CNPJ', { status: 400 })
      }

      const userId = updateData.userId
      if (typeof userId === 'string') {
        await adapter.update({
          model: 'user',
          where: [{ field: 'id', value: userId }],
          update: { role: 'business' },
        })
      }
    }

    const updated = await adapter.update({
      model: 'businesses',
      where: [{ field: 'id', value: id }],
      update: updateData,
    })

    if (!updated) return new Response('Not Found', { status: 404 })
    return Response.json(updated)
  },

  async DELETE(ctx) {
    const { id } = ctx.params
    await adapter.delete({
      model: 'businesses',
      where: [{ field: 'id', value: id }],
    })
    return new Response(null, { status: 204 })
  },
})

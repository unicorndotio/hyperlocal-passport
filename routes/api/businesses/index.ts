import { define } from '../../../utils.ts'
import { kv } from '../../../lib/kv.ts'
import { getDenoKvAdapterRaw } from '../../../lib/kv-adapter.ts'
import { uploadFile } from '../../../lib/storage.ts'
import { isValidCnpj, normalizeCnpj } from '../../../lib/business.ts'
const adapter = getDenoKvAdapterRaw(kv)

export const handler = define.handlers({
  async GET(_ctx) {
    const businesses = await adapter.findMany({ model: 'businesses' })
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

    // Validations
    if (!name.trim()) {
      return new Response('Missing required field: name', { status: 400 })
    }
    const normalizedCnpj = normalizeCnpj(cnpj)
    if (!normalizedCnpj || !isValidCnpj(normalizedCnpj)) {
      return new Response('Missing or invalid CNPJ', { status: 400 })
    }

    const existingCnpj = await kv.get(['businesses_by_cnpj', normalizedCnpj])
    if (existingCnpj.value !== null) {
      return new Response('CNPJ already registered', { status: 409 })
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

    // Logo upload
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

    // Save business profile
    const business = await adapter.create({
      model: 'businesses',
      data: {
        name,
        companyName,
        cnpj: normalizedCnpj,
        category,
        description,
        logoUrl,
        userId,
        isActive,
        createdAt: new Date().toISOString(),
      },
    })

    // Update the linked user's role to 'business'
    await adapter.update({
      model: 'user',
      where: [{ field: 'id', value: userId }],
      update: { role: 'business' },
    })

    return Response.json(business, { status: 201 })
  },
})

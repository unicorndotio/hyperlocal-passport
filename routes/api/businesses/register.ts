import { define } from '../../../utils.ts'
import { auth } from '../../../lib/auth.ts'
import { deleteFile, uploadFile } from '../../../lib/storage.ts'
import {
  isValidCnpj,
  normalizeCnpj,
  validateOpeningHours,
  validateSocialLinks,
} from '../../../lib/business.ts'
import { kv } from '../../../lib/kv.ts'
import { json } from '../../../lib/utils.ts'

export async function handleRegister(req: Request): Promise<Response> {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return json({ error: 'Invalid multipart form data' }, 400)
  }

  const name = formData.get('name')
  const companyName = formData.get('companyName')
  const cnpjRaw = formData.get('cnpj')
  const category = formData.get('category')
  const email = formData.get('email')
  const password = formData.get('password')
  const logo = formData.get('logo')
  const description = formData.get('description')

  let socialLinks: unknown = undefined
  let openingHours: unknown = undefined
  try {
    const sl = formData.get('socialLinks')
    if (sl && typeof sl === 'string') socialLinks = JSON.parse(sl)
    const oh = formData.get('openingHours')
    if (oh && typeof oh === 'string') openingHours = JSON.parse(oh)
  } catch {
    return json({ error: 'Invalid JSON in socialLinks or openingHours' }, 400)
  }

  if (!name || typeof name !== 'string' || !name.trim()) {
    return json({ error: 'Missing required field: name' }, 400)
  }
  if (!companyName || typeof companyName !== 'string' || !companyName.trim()) {
    return json({ error: 'Missing required field: companyName' }, 400)
  }
  if (!cnpjRaw || typeof cnpjRaw !== 'string' || !cnpjRaw.trim()) {
    return json({ error: 'Missing required field: CNPJ' }, 400)
  }
  if (!category || typeof category !== 'string' || !category.trim()) {
    return json({ error: 'Missing required field: category' }, 400)
  }
  if (!email || typeof email !== 'string' || !email.trim()) {
    return json({ error: 'Missing required field: email' }, 400)
  }
  if (!password || typeof password !== 'string' || !password.trim()) {
    return json({ error: 'Missing required field: password' }, 400)
  }
  if (!logo || !(logo instanceof File) || logo.size === 0) {
    return json({ error: 'Missing required file: logo' }, 400)
  }

  const cnpj = normalizeCnpj(cnpjRaw)
  if (!isValidCnpj(cnpj)) {
    return json({ error: 'Invalid CNPJ' }, 400)
  }

  const socialLinksError = validateSocialLinks(socialLinks)
  if (socialLinksError) {
    return json({ error: socialLinksError }, 400)
  }
  const openingHoursError = validateOpeningHours(openingHours)
  if (openingHoursError) {
    return json({ error: openingHoursError }, 400)
  }

  const normalizedEmail = email.trim().toLowerCase()

  const existingEmail = await kv.get(['users_by_email', normalizedEmail])
  if (existingEmail.value !== null) {
    return json({ error: 'Email already registered' }, 409)
  }

  const existingCnpj = await kv.get(['businesses_by_cnpj', cnpj])
  if (existingCnpj.value !== null) {
    return json({ error: 'CNPJ already registered' }, 409)
  }

  let logoFilename: string
  try {
    logoFilename = await uploadFile(logo, { isPublic: true })
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      400,
    )
  }

  const baseUrl = Deno.env.get('APP_BASE_URL') || 'http://localhost:8000'
  const logoUrl = `${baseUrl}/api/uploads/${logoFilename}`

  let userId: string
  try {
    const { user } = await auth.api.signUpEmail({
      body: {
        email: normalizedEmail,
        password,
        name: name.trim(),
        role: 'business',
        status: 'pending',
      },
    })
    userId = user.id
  } catch {
    await deleteFile(logoFilename).catch(() => {})
    return json({ error: 'Email already registered or system error' }, 409)
  }

  const businessId = crypto.randomUUID()
  const business = {
    id: businessId,
    userId,
    name: name.trim(),
    companyName: companyName.trim(),
    cnpj,
    category: category.trim(),
    description: typeof description === 'string' ? description.trim() : '',
    logoUrl,
    socialLinks: socialLinks || undefined,
    openingHours: openingHours || undefined,
    isActive: false,
    createdAt: new Date().toISOString(),
  }

  const result = await kv.atomic()
    .set(['businesses', businessId], business)
    .set(['businesses_by_cnpj', cnpj], businessId)
    .commit()

  if (!result.ok) {
    await Promise.allSettled([
      deleteFile(logoFilename),
      kv.delete(['user', userId]),
    ])
    return json({ error: 'Conflict or system error, please retry' }, 500)
  }

  return json({
    user: {
      id: userId,
      email: normalizedEmail,
      name: name.trim(),
      role: 'business',
      status: 'pending',
    },
    business,
  }, 201)
}

export const handler = define.handlers({
  POST(ctx) {
    return handleRegister(ctx.req)
  },
})

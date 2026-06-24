import { define } from '../../../utils.ts'
import { auth } from '../../../lib/auth.ts'
import { db } from '../../../lib/db.ts'
import * as schema from '../../../db/schema.ts'
import { eq } from 'drizzle-orm'
import { deleteFile, uploadFile } from '../../../lib/storage.ts'
import {
  isValidCnpj,
  normalizeCnpj,
  validateOpeningHours,
  validateSocialLinks,
} from '../../../lib/business.ts'
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
  if (!email || typeof email !== 'string' || !email.trim()) {
    return json({ error: 'Missing required field: email' }, 400)
  }
  if (!password || typeof password !== 'string' || !password.trim()) {
    return json({ error: 'Missing required field: password' }, 400)
  }

  if (
    description && typeof description === 'string' &&
    description.trim().length > 1000
  ) {
    return json({ error: 'Description must be at most 1000 characters' }, 400)
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

  // Check CNPJ uniqueness early
  const existingCnpj = await db
    .select()
    .from(schema.businesses)
    .where(eq(schema.businesses.cnpj, cnpj))
    .limit(1)

  if (existingCnpj.length > 0) {
    return json({ error: 'CNPJ already registered' }, 409)
  }

  let logoUrl = ''
  let logoFilename: string | undefined
  if (logo && logo instanceof File && logo.size > 0) {
    try {
      logoFilename = await uploadFile(logo, { isPublic: true })
      const baseUrl = Deno.env.get('APP_BASE_URL') || 'http://localhost:8000'
      logoUrl = `${baseUrl}/api/uploads/${logoFilename}`
    } catch (err) {
      return json(
        { error: err instanceof Error ? err.message : 'Upload failed' },
        400,
      )
    }
  }

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
  } catch (err) {
    if (logoFilename) await deleteFile(logoFilename).catch(() => {})
    if (
      err && typeof err === 'object' && 'body' in err &&
      err.body && typeof err.body === 'object' && 'code' in err.body &&
      err.body.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL'
    ) {
      return json({ error: 'Email already registered' }, 409)
    }
    const message = err instanceof Error ? err.message : 'System error'
    return json({ error: `Registration failed: ${message}` }, 500)
  }

  const businessId = crypto.randomUUID()

  try {
    await db.insert(schema.businesses).values({
      id: businessId,
      userId,
      name: name.trim(),
      companyName: companyName.trim(),
      cnpj,
      category: typeof category === 'string' ? category.trim() : '',
      description: typeof description === 'string' ? description.trim() : '',
      logoUrl,
      socialLinks: socialLinks || undefined,
      openingHours: openingHours || undefined,
      isActive: false,
    })
  } catch (err) {
    // Cleanup auth user and files on business insert failure
    const cleanup: Promise<unknown>[] = [
      db.delete(schema.users).where(eq(schema.users.id, userId)),
    ]
    if (logoFilename) cleanup.push(deleteFile(logoFilename))
    await Promise.allSettled(cleanup)

    if (
      err && typeof err === 'object' && 'code' in err &&
      err.code === '23505'
    ) {
      return json({ error: 'CNPJ already registered' }, 409)
    }
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
    business: {
      id: businessId,
      userId,
      name: name.trim(),
      companyName: companyName.trim(),
      cnpj,
      category: typeof category === 'string' ? category.trim() : '',
      description: typeof description === 'string' ? description.trim() : '',
      logoUrl,
      socialLinks: socialLinks || undefined,
      openingHours: openingHours || undefined,
      isActive: false,
    },
  }, 201)
}

export const handler = define.handlers({
  POST(ctx) {
    return handleRegister(ctx.req)
  },
})

import { define } from '../../../../utils.ts'
import type { SessionUser } from '../../../../utils.ts'
import { db } from '../../../../lib/db.ts'
import * as schema from '../../../../db/schema.ts'
import { eq } from 'drizzle-orm'
import { uploadFile } from '../../../../lib/storage.ts'
import {
  normalizeCep,
  validateBusinessCategory,
  validateCep,
  validateMapsUrl,
  validateOpeningHours,
  validateSocialLinks,
} from '../../../../lib/business.ts'
import { json } from '../../../../lib/utils.ts'

export async function handleProfileUpdate(
  req: Request,
  businessId: string,
  user: SessionUser,
): Promise<Response> {
  const [business] = await db
    .select()
    .from(schema.businesses)
    .where(eq(schema.businesses.id, businessId))
    .limit(1)

  if (!business) {
    return json({ error: 'Business not found' }, 404)
  }

  if (user.role !== 'admin' && business.userId !== user.id) {
    return json({ error: 'Forbidden: you do not own this business' }, 403)
  }

  const contentType = req.headers.get('content-type') || ''
  const updateData: Record<string, unknown> = {}

  if (contentType.includes('multipart/form-data')) {
    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return json({ error: 'Invalid multipart form data' }, 400)
    }

    const description = formData.get('description')
    if (description !== null && typeof description === 'string') {
      const trimmed = description.trim()
      if (trimmed.length > 1000) {
        return json(
          { error: 'Description must be at most 1000 characters' },
          400,
        )
      }
      updateData.description = trimmed
    }

    let socialLinks: unknown = undefined
    let openingHours: unknown = undefined
    try {
      const sl = formData.get('socialLinks')
      if (sl && typeof sl === 'string') socialLinks = JSON.parse(sl)
      const oh = formData.get('openingHours')
      if (oh && typeof oh === 'string') openingHours = JSON.parse(oh)
    } catch {
      return json(
        { error: 'Invalid JSON in socialLinks or openingHours' },
        400,
      )
    }

    if (socialLinks !== undefined) {
      const err = validateSocialLinks(socialLinks)
      if (err) return json({ error: err }, 400)
      updateData.socialLinks = socialLinks
    }

    const cep = formData.get('cep')
    if (cep !== null && typeof cep === 'string') {
      const trimmed = cep.trim()
      if (trimmed) {
        const err = validateCep(trimmed)
        if (err) return json({ error: err }, 400)
        updateData.cep = normalizeCep(trimmed)
      } else {
        updateData.cep = null
      }
    }

    const street = formData.get('street')
    if (street !== null && typeof street === 'string') {
      updateData.street = street.trim() || null
    }

    const number = formData.get('number')
    if (number !== null && typeof number === 'string') {
      updateData.number = number.trim() || null
    }

    const neighborhood = formData.get('neighborhood')
    if (neighborhood !== null && typeof neighborhood === 'string') {
      updateData.neighborhood = neighborhood.trim() || null
    }

    const mapsUrl = formData.get('mapsUrl')
    if (mapsUrl !== null && typeof mapsUrl === 'string') {
      const trimmed = mapsUrl.trim()
      if (trimmed) {
        const err = validateMapsUrl(trimmed)
        if (err) return json({ error: err }, 400)
        updateData.mapsUrl = trimmed
      } else {
        updateData.mapsUrl = null
      }
    }

    const category = formData.get('category')
    if (category !== null && typeof category === 'string') {
      const trimmed = category.trim()
      if (trimmed) {
        const err = validateBusinessCategory(trimmed)
        if (err) return json({ error: err }, 400)
        updateData.category = trimmed
      } else {
        updateData.category = null
      }
    }

    if (openingHours !== undefined) {
      const err = validateOpeningHours(openingHours)
      if (err) return json({ error: err }, 400)
      updateData.openingHours = openingHours
    }

    const logo = formData.get('logo') as File | null
    if (logo && logo.size > 0) {
      try {
        const filename = await uploadFile(logo, { isPublic: true })
        const appBaseUrl = Deno.env.get('APP_BASE_URL') ||
          'http://localhost:8000'
        updateData.logoUrl = `${appBaseUrl}/api/uploads/${filename}`
      } catch (err) {
        return json(
          { error: err instanceof Error ? err.message : 'Upload failed' },
          400,
        )
      }
    }
  } else {
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return json({ error: 'Invalid JSON body' }, 400)
    }
    if (typeof body !== 'object' || body === null) {
      return json({ error: 'Invalid JSON body' }, 400)
    }

    if ('description' in body) {
      if (typeof body.description !== 'string') {
        return json({ error: 'description must be a string' }, 400)
      }
      const trimmed = body.description.trim()
      if (trimmed.length > 1000) {
        return json(
          { error: 'Description must be at most 1000 characters' },
          400,
        )
      }
      updateData.description = trimmed
    }

    if ('socialLinks' in body) {
      const err = validateSocialLinks(body.socialLinks)
      if (err) return json({ error: err }, 400)
      updateData.socialLinks = body.socialLinks
    }

    if ('openingHours' in body) {
      const err = validateOpeningHours(body.openingHours)
      if (err) return json({ error: err }, 400)
      updateData.openingHours = body.openingHours
    }

    if ('cep' in body) {
      if (body.cep === null || body.cep === '') {
        updateData.cep = null
      } else {
        if (typeof body.cep !== 'string') {
          return json({ error: 'cep must be a string' }, 400)
        }
        const err = validateCep(body.cep)
        if (err) return json({ error: err }, 400)
        updateData.cep = normalizeCep(body.cep)
      }
    }

    if ('street' in body) {
      if (body.street === null || body.street === '') {
        updateData.street = null
      } else {
        if (typeof body.street !== 'string') {
          return json({ error: 'street must be a string' }, 400)
        }
        updateData.street = body.street.trim()
      }
    }

    if ('number' in body) {
      if (body.number === null || body.number === '') {
        updateData.number = null
      } else {
        if (typeof body.number !== 'string') {
          return json({ error: 'number must be a string' }, 400)
        }
        updateData.number = body.number.trim()
      }
    }

    if ('neighborhood' in body) {
      if (body.neighborhood === null || body.neighborhood === '') {
        updateData.neighborhood = null
      } else {
        if (typeof body.neighborhood !== 'string') {
          return json({ error: 'neighborhood must be a string' }, 400)
        }
        updateData.neighborhood = body.neighborhood.trim()
      }
    }

    if ('mapsUrl' in body) {
      if (body.mapsUrl === null || body.mapsUrl === '') {
        updateData.mapsUrl = null
      } else {
        if (typeof body.mapsUrl !== 'string') {
          return json({ error: 'mapsUrl must be a string' }, 400)
        }
        const err = validateMapsUrl(body.mapsUrl)
        if (err) return json({ error: err }, 400)
        updateData.mapsUrl = body.mapsUrl.trim()
      }
    }

    if ('category' in body) {
      if (body.category === null || body.category === '') {
        updateData.category = null
      } else {
        if (typeof body.category !== 'string') {
          return json({ error: 'category must be a string' }, 400)
        }
        const err = validateBusinessCategory(body.category)
        if (err) return json({ error: err }, 400)
        updateData.category = body.category.trim()
      }
    }

    if ('hasSeenMerchantOnboarding' in body) {
      if (typeof body.hasSeenMerchantOnboarding !== 'boolean') {
        return json(
          { error: 'hasSeenMerchantOnboarding must be a boolean' },
          400,
        )
      }
      updateData.hasSeenMerchantOnboarding = body.hasSeenMerchantOnboarding
    }
  }

  if (Object.keys(updateData).length === 0) {
    return json({ error: 'No valid fields to update' }, 400)
  }

  const [updated] = await db
    .update(schema.businesses)
    .set(updateData)
    .where(eq(schema.businesses.id, businessId))
    .returning()

  if (!updated) {
    return json({ error: 'Failed to update business' }, 500)
  }

  return json(updated, 200)
}

export const handler = define.handlers({
  PUT(ctx) {
    const { id } = ctx.params
    return handleProfileUpdate(ctx.req, id, ctx.state.user!)
  },
})

import { define } from '../../../../utils.ts'
import type { SessionUser } from '../../../../utils.ts'
import { kv } from '../../../../lib/kv.ts'
import { uploadFile } from '../../../../lib/storage.ts'
import {
  validateOpeningHours,
  validateSocialLinks,
} from '../../../../lib/business.ts'
import { json } from '../../../../lib/utils.ts'

export async function handleProfileUpdate(
  req: Request,
  businessId: string,
  user: SessionUser,
): Promise<Response> {
  const bizEntry = await kv.get<Record<string, unknown>>([
    'businesses',
    businessId,
  ])
  if (!bizEntry.value) {
    return json({ error: 'Business not found' }, 404)
  }

  const business = bizEntry.value

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
  }

  if (Object.keys(updateData).length === 0) {
    return json({ error: 'No valid fields to update' }, 400)
  }

  const updated = { ...business, ...updateData }
  const result = await kv.atomic()
    .set(['businesses', businessId], updated)
    .commit()

  if (!result.ok) {
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

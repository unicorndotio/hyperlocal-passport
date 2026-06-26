import { define } from '../../../utils.ts'
import { deleteFile, uploadFile } from '../../../lib/storage.ts'
import {
  formatWhatsApp,
  isValidCpf,
  isValidPhone,
  normalizeCpf,
} from '../../../lib/registration.ts'
import { db } from '../../../lib/db.ts'
import * as schema from '../../../db/schema.ts'
import { eq } from 'drizzle-orm'
import { json } from '../../../lib/utils.ts'

interface User {
  id: string
  name: string
  cpf: string
  email: string
  whatsapp: string
  role: 'resident' | 'business' | 'admin'
  status: 'pending' | 'approved' | 'rejected'
  documents: {
    idPhotoUrl: string
    residenceProofUrl: string
  }
  createdAt: number
}

export async function handleRegister(req: Request): Promise<Response> {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return json({ error: 'Invalid multipart form data' }, 400)
  }

  const name = formData.get('name')
  const cpfRaw = formData.get('cpf')
  const email = formData.get('email')
  const whatsappDial = formData.get('whatsappDial')
  const whatsappNumber = formData.get('whatsappNumber')
  const idPhoto = formData.get('idPhoto')
  const residenceProof = formData.get('residenceProof')

  if (!name || typeof name !== 'string' || !name.trim()) {
    return json({ error: 'Missing required field: name' }, 400)
  }
  if (!cpfRaw || typeof cpfRaw !== 'string') {
    return json({ error: 'Missing required field: cpf' }, 400)
  }
  if (!email || typeof email !== 'string' || !email.trim()) {
    return json({ error: 'Missing required field: email' }, 400)
  }
  if (!whatsappDial || typeof whatsappDial !== 'string') {
    return json({ error: 'Missing required field: whatsappDial' }, 400)
  }
  if (!whatsappNumber || typeof whatsappNumber !== 'string') {
    return json({ error: 'Missing required field: whatsappNumber' }, 400)
  }
  if (!idPhoto || !(idPhoto instanceof File)) {
    return json({ error: 'Missing required file: idPhoto' }, 400)
  }
  if (!residenceProof || !(residenceProof instanceof File)) {
    return json({ error: 'Missing required file: residenceProof' }, 400)
  }

  const cpf = normalizeCpf(cpfRaw)
  if (!isValidCpf(cpf)) {
    return json({ error: 'Invalid CPF' }, 400)
  }
  if (!isValidPhone(whatsappDial, whatsappNumber)) {
    return json({ error: 'Invalid WhatsApp number' }, 400)
  }

  const normalizedEmail = email.trim().toLowerCase()

  const userId = crypto.randomUUID()
  const baseUrl = Deno.env.get('APP_BASE_URL') || 'http://localhost:8000'

  let idPhotoFilename: string
  let residenceProofFilename: string
  try {
    idPhotoFilename = await uploadFile(idPhoto, { userId, isPublic: false })
    residenceProofFilename = await uploadFile(residenceProof, {
      userId,
      isPublic: false,
    })
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      400,
    )
  }

  const user: User = {
    id: userId,
    name: name.trim(),
    cpf,
    email: normalizedEmail,
    whatsapp: formatWhatsApp(whatsappDial, whatsappNumber),
    role: 'resident',
    status: 'pending',
    documents: {
      idPhotoUrl: `${baseUrl}/api/uploads/${idPhotoFilename}`,
      residenceProofUrl: `${baseUrl}/api/uploads/${residenceProofFilename}`,
    },
    createdAt: Date.now(),
  }

  try {
    await db.transaction(async (tx) => {
      // Check for duplicate CPF
      const existingCpf = await tx
        .select()
        .from(schema.users)
        .where(eq(schema.users.cpf, cpf))
        .limit(1)

      if (existingCpf.length > 0) {
        throw new Error('CPF already registered')
      }

      // Check for duplicate email
      const existingEmail = await tx
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, normalizedEmail))
        .limit(1)

      if (existingEmail.length > 0) {
        throw new Error('Email already registered')
      }

      // Insert user with status='pending'
      await tx.insert(schema.users).values({
        id: userId,
        name: name.trim(),
        cpf,
        email: normalizedEmail,
        phone: formatWhatsApp(whatsappDial, whatsappNumber),
        role: 'resident',
        status: 'pending',
        documents: {
          idPhotoUrl: `${baseUrl}/api/uploads/${idPhotoFilename}`,
          residenceProofUrl: `${baseUrl}/api/uploads/${residenceProofFilename}`,
        },
      })
    })
  } catch (err) {
    // Cleanup orphaned files on error
    await Promise.allSettled([
      deleteFile(idPhotoFilename),
      deleteFile(residenceProofFilename),
    ])

    const message = err instanceof Error
      ? err.message
      : 'Conflict or system error'
    if (message === 'CPF already registered') {
      return json({ error: message }, 409)
    }
    if (message === 'Email already registered') {
      return json({ error: message }, 409)
    }
    return json({ error: message }, 500)
  }

  return json(user, 201)
}

export const handler = define.handlers({
  POST(ctx) {
    return handleRegister(ctx.req)
  },
})

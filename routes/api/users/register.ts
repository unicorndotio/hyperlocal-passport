import { define } from '../../../utils.ts'
import { deleteFile, uploadFile } from '../../../lib/storage.ts'
import {
  formatWhatsApp,
  isValidCpf,
  isValidPhone,
  normalizeCpf,
} from '../../../lib/registration.ts'

const kv = await Deno.openKv()

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

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
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

  const [existingCpf, existingEmail] = await kv.getMany([
    ['users_by_cpf', cpf],
    ['users_by_email', normalizedEmail],
  ])

  if (existingCpf.value !== null) {
    return json({ error: 'CPF already registered' }, 409)
  }
  if (existingEmail.value !== null) {
    return json({ error: 'Email already registered' }, 409)
  }

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

  const result = await kv.atomic()
    .check(existingCpf) // Issue 001: Ensure CPF wasn't taken during upload
    .check(existingEmail) // Issue 009: Ensure email wasn't taken during upload
    .set(['user', userId], user) // Issue 003: singular 'user'
    .set(['users_by_cpf', cpf], userId)
    .set(['users_by_email', normalizedEmail], userId)
    .set(['approvals', 'pending', userId], {
      userId,
      createdAt: user.createdAt,
    })
    .commit()

  if (!result.ok) {
    // Issue 006: Cleanup orphaned files
    await Promise.allSettled([
      deleteFile(idPhotoFilename),
      deleteFile(residenceProofFilename),
    ])
    return json({ error: 'Conflict or system error, please retry' }, 500)
  }

  return json(user, 201)
}

export const handler = define.handlers({
  POST(ctx) {
    return handleRegister(ctx.req)
  },
})

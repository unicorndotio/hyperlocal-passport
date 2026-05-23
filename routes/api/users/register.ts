import { define } from '../../../utils.ts'
import { uploadFile } from '../../../lib/storage.ts'

const kv = await Deno.openKv()

interface User {
  id: string
  name: string
  cpf: string
  email: string
  role: 'resident' | 'business' | 'admin'
  status: 'pending' | 'approved' | 'rejected'
  documents: {
    idPhotoUrl: string
    residenceProofUrl: string
  }
  createdAt: number
}

function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, '')
}

function isValidCpfFormat(cpf: string): boolean {
  return /^\d{11}$/.test(cpf)
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
  if (!idPhoto || !(idPhoto instanceof File)) {
    return json({ error: 'Missing required file: idPhoto' }, 400)
  }
  if (!residenceProof || !(residenceProof instanceof File)) {
    return json({ error: 'Missing required file: residenceProof' }, 400)
  }

  const cpf = normalizeCpf(cpfRaw)
  if (!isValidCpfFormat(cpf)) {
    return json({ error: 'Invalid CPF format' }, 400)
  }

  const existing = await kv.get(['users_by_cpf', cpf])
  if (existing.value !== null) {
    return json({ error: 'CPF already registered' }, 409)
  }

  const userId = crypto.randomUUID()
  const baseUrl = Deno.env.get('APP_BASE_URL') || 'http://localhost:8000'

  let idPhotoFilename: string
  let residenceProofFilename: string
  try {
    idPhotoFilename = await uploadFile(idPhoto, { userId, isPublic: false })
    residenceProofFilename = await uploadFile(residenceProof, { userId, isPublic: false })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Upload failed' }, 400)
  }

  const user: User = {
    id: userId,
    name: name.trim(),
    cpf,
    email: email.trim(),
    role: 'resident',
    status: 'pending',
    documents: {
      idPhotoUrl: `${baseUrl}/api/uploads/${idPhotoFilename}`,
      residenceProofUrl: `${baseUrl}/api/uploads/${residenceProofFilename}`,
    },
    createdAt: Date.now(),
  }

  const result = await kv.atomic()
    .set(['users', userId], user)
    .set(['users_by_cpf', cpf], userId)
    .set(['approvals', 'pending', userId], { userId, createdAt: user.createdAt })
    .commit()

  if (!result.ok) {
    return json({ error: 'Failed to save user, please retry' }, 500)
  }

  return json(user, 201)
}

// Fresh v2 route handler (single ctx argument)
export const handler = define.handlers({
  POST(ctx) {
    return handleRegister(ctx.req)
  },
})

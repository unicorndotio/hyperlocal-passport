import { Context } from 'fresh'
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

export const handler = {
  async POST(req: Request, _ctx: Context<unknown>) {
    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid multipart form data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const name = formData.get('name')
    const cpfRaw = formData.get('cpf')
    const email = formData.get('email')
    const idPhoto = formData.get('idPhoto')
    const residenceProof = formData.get('residenceProof')

    // Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return new Response(JSON.stringify({ error: 'Missing required field: name' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (!cpfRaw || typeof cpfRaw !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing required field: cpf' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      return new Response(JSON.stringify({ error: 'Missing required field: email' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (!idPhoto || !(idPhoto instanceof File)) {
      return new Response(JSON.stringify({ error: 'Missing required file: idPhoto' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (!residenceProof || !(residenceProof instanceof File)) {
      return new Response(JSON.stringify({ error: 'Missing required file: residenceProof' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Validate CPF format
    const cpf = normalizeCpf(cpfRaw)
    if (!isValidCpfFormat(cpf)) {
      return new Response(JSON.stringify({ error: 'Invalid CPF format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Check CPF uniqueness
    const existing = await kv.get(['users_by_cpf', cpf])
    if (existing.value !== null) {
      return new Response(JSON.stringify({ error: 'CPF already registered' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const userId = crypto.randomUUID()
    const baseUrl = Deno.env.get('APP_BASE_URL') || 'http://localhost:8000'

    // Upload documents
    let idPhotoFilename: string
    let residenceProofFilename: string
    try {
      idPhotoFilename = await uploadFile(idPhoto, { userId, isPublic: false })
      residenceProofFilename = await uploadFile(residenceProof, { userId, isPublic: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const idPhotoUrl = `${baseUrl}/api/uploads/${idPhotoFilename}`
    const residenceProofUrl = `${baseUrl}/api/uploads/${residenceProofFilename}`

    const user: User = {
      id: userId,
      name: name.trim(),
      cpf,
      email: email.trim(),
      role: 'resident',
      status: 'pending',
      documents: { idPhotoUrl, residenceProofUrl },
      createdAt: Date.now(),
    }

    // Atomic write: user record + CPF index + pending approval
    const result = await kv.atomic()
      .set(['users', userId], user)
      .set(['users_by_cpf', cpf], userId)
      .set(['approvals', 'pending', userId], { userId, createdAt: user.createdAt })
      .commit()

    if (!result.ok) {
      return new Response(JSON.stringify({ error: 'Failed to save user, please retry' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(user), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  },
}

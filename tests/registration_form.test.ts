import {
  assertEquals,
  assertMatch,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import {
  formatCpfDisplay,
  isValidCpf,
  isValidFileType,
  normalizeCpf,
  validateForm,
} from '../lib/registration.ts'

// --- normalizeCpf ---

Deno.test('normalizeCpf strips dots and dash', () => {
  assertEquals(normalizeCpf('123.456.789-09'), '12345678909')
})

Deno.test('normalizeCpf leaves plain digits unchanged', () => {
  assertEquals(normalizeCpf('12345678909'), '12345678909')
})

Deno.test('normalizeCpf strips all non-digit characters', () => {
  assertEquals(normalizeCpf('abc123def456ghi789jk09'), '12345678909')
})

// --- isValidCpf ---

Deno.test('isValidCpf accepts valid CPF', () => {
  assertEquals(isValidCpf('529.982.247-25'), true)
})

Deno.test('isValidCpf accepts valid CPF without formatting', () => {
  assertEquals(isValidCpf('52998224725'), true)
})

Deno.test('isValidCpf rejects fewer than 11 digits', () => {
  assertEquals(isValidCpf('1234567890'), false)
})

Deno.test('isValidCpf rejects more than 11 digits', () => {
  assertEquals(isValidCpf('123456789012'), false)
})

Deno.test('isValidCpf rejects empty string', () => {
  assertEquals(isValidCpf(''), false)
})

Deno.test('isValidCpf rejects all-same-digit sequence', () => {
  assertEquals(isValidCpf('111.111.111-11'), false)
  assertEquals(isValidCpf('00000000000'), false)
})

Deno.test('isValidCpf rejects invalid checksum', () => {
  assertEquals(isValidCpf('123.456.789-00'), false)
})

Deno.test('isValidCpf rejects letters', () => {
  assertEquals(isValidCpf('abcdefghijk'), false)
})

// --- formatCpfDisplay ---

Deno.test('formatCpfDisplay formats partial input (3 digits)', () => {
  assertEquals(formatCpfDisplay('123'), '123')
})

Deno.test('formatCpfDisplay formats partial input (6 digits)', () => {
  assertEquals(formatCpfDisplay('123456'), '123.456')
})

Deno.test('formatCpfDisplay formats partial input (9 digits)', () => {
  assertEquals(formatCpfDisplay('123456789'), '123.456.789')
})

Deno.test('formatCpfDisplay formats full 11-digit CPF', () => {
  assertEquals(formatCpfDisplay('12345678909'), '123.456.789-09')
})

Deno.test('formatCpfDisplay handles already-formatted input', () => {
  assertEquals(formatCpfDisplay('123.456.789-09'), '123.456.789-09')
})

Deno.test('formatCpfDisplay truncates beyond 11 digits', () => {
  assertEquals(formatCpfDisplay('123456789099999'), '123.456.789-09')
})

// --- isValidFileType ---

Deno.test('isValidFileType accepts image/jpeg', () => {
  assertEquals(
    isValidFileType(new File([''], 'photo.jpg', { type: 'image/jpeg' })),
    true,
  )
})

Deno.test('isValidFileType accepts image/png', () => {
  assertEquals(
    isValidFileType(new File([''], 'photo.png', { type: 'image/png' })),
    true,
  )
})

Deno.test('isValidFileType accepts image/webp', () => {
  assertEquals(
    isValidFileType(new File([''], 'photo.webp', { type: 'image/webp' })),
    true,
  )
})

Deno.test('isValidFileType accepts application/pdf', () => {
  assertEquals(
    isValidFileType(new File([''], 'doc.pdf', { type: 'application/pdf' })),
    true,
  )
})

Deno.test('isValidFileType rejects image/gif', () => {
  assertEquals(
    isValidFileType(new File([''], 'anim.gif', { type: 'image/gif' })),
    false,
  )
})

Deno.test('isValidFileType rejects text/plain', () => {
  assertEquals(
    isValidFileType(new File([''], 'note.txt', { type: 'text/plain' })),
    false,
  )
})

Deno.test('isValidFileType rejects empty type', () => {
  assertEquals(isValidFileType(new File([''], 'unknown', { type: '' })), false)
})

// --- validateForm ---

function makeFile(type = 'image/jpeg') {
  return new File(['data'], 'file', { type })
}

Deno.test('validateForm returns error for empty name', () => {
  const errs = validateForm({
    name: '',
    cpf: '52998224725',
    email: 'a@b.com',
    whatsappDial: '+55',
    whatsappNumber: '48912345678',
    idPhoto: makeFile(),
    residenceProof: makeFile(),
  })
  assertEquals(typeof errs.name, 'string')
})

Deno.test('validateForm returns error for invalid CPF', () => {
  const errs = validateForm({
    name: 'Test',
    cpf: '123',
    email: 'a@b.com',
    whatsappDial: '+55',
    whatsappNumber: '48912345678',
    idPhoto: makeFile(),
    residenceProof: makeFile(),
  })
  assertEquals(typeof errs.cpf, 'string')
})

Deno.test('validateForm returns error for invalid email', () => {
  const errs = validateForm({
    name: 'Test',
    cpf: '52998224725',
    email: 'not-an-email',
    whatsappDial: '+55',
    whatsappNumber: '48912345678',
    idPhoto: makeFile(),
    residenceProof: makeFile(),
  })
  assertEquals(typeof errs.email, 'string')
})

Deno.test('validateForm returns error for missing idPhoto', () => {
  const errs = validateForm({
    name: 'Test',
    cpf: '52998224725',
    email: 'a@b.com',
    whatsappDial: '+55',
    whatsappNumber: '48912345678',
    idPhoto: null,
    residenceProof: makeFile(),
  })
  assertEquals(typeof errs.idPhoto, 'string')
})

Deno.test('validateForm returns error for invalid idPhoto type', () => {
  const errs = validateForm({
    name: 'Test',
    cpf: '52998224725',
    email: 'a@b.com',
    whatsappDial: '+55',
    whatsappNumber: '48912345678',
    idPhoto: makeFile('image/gif'),
    residenceProof: makeFile(),
  })
  assertEquals(typeof errs.idPhoto, 'string')
})

Deno.test('validateForm returns error for missing residenceProof', () => {
  const errs = validateForm({
    name: 'Test',
    cpf: '52998224725',
    email: 'a@b.com',
    whatsappDial: '+55',
    whatsappNumber: '48912345678',
    idPhoto: makeFile(),
    residenceProof: null,
  })
  assertEquals(typeof errs.residenceProof, 'string')
})

Deno.test('validateForm returns error for invalid residenceProof type', () => {
  const errs = validateForm({
    name: 'Test',
    cpf: '52998224725',
    email: 'a@b.com',
    whatsappDial: '+55',
    whatsappNumber: '48912345678',
    idPhoto: makeFile(),
    residenceProof: makeFile('text/plain'),
  })
  assertEquals(typeof errs.residenceProof, 'string')
})

Deno.test('validateForm returns no errors for valid input', () => {
  const errs = validateForm({
    name: 'João Silva',
    cpf: '52998224725',
    email: 'joao@example.com',
    whatsappDial: '+55',
    whatsappNumber: '48912345678',
    idPhoto: makeFile('image/jpeg'),
    residenceProof: makeFile('application/pdf'),
  })
  assertEquals(Object.keys(errs).length, 0)
})

// --- Integration: fetch mock ---

Deno.test('fetch integration: 201 response returns success body', async () => {
  const originalFetch = globalThis.fetch
  let capturedUrl = ''
  let capturedMethod = ''

  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = input.toString()
    capturedMethod = init?.method ?? 'GET'
    return Promise.resolve(
      new Response(
        JSON.stringify({
          id: 'abc',
          name: 'Test',
          cpf: '52998224725',
          status: 'pending',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      ),
    )
  }

  const form = new FormData()
  form.append('name', 'Test User')
  form.append('cpf', '52998224725')
  form.append('email', 'test@example.com')
  form.append('idPhoto', new File(['data'], 'id.jpg', { type: 'image/jpeg' }))
  form.append(
    'residenceProof',
    new File(['data'], 'proof.pdf', { type: 'application/pdf' }),
  )

  const res = await fetch('/api/users/register', { method: 'POST', body: form })
  assertEquals(res.status, 201)
  const body = await res.json()
  assertEquals(body.status, 'pending')

  assertMatch(capturedUrl, /\/api\/users\/register$/)
  assertEquals(capturedMethod, 'POST')

  globalThis.fetch = originalFetch
})

Deno.test('fetch integration: 409 response returns error body', async () => {
  const originalFetch = globalThis.fetch

  globalThis.fetch = () => {
    return Promise.resolve(
      new Response(
        JSON.stringify({ error: 'CPF already registered' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } },
      ),
    )
  }

  const form = new FormData()
  form.append('name', 'Duplicate User')
  form.append('cpf', '52998224725')
  form.append('email', 'dup@example.com')
  form.append('idPhoto', new File(['data'], 'id.jpg', { type: 'image/jpeg' }))
  form.append(
    'residenceProof',
    new File(['data'], 'proof.pdf', { type: 'application/pdf' }),
  )

  const res = await fetch('/api/users/register', { method: 'POST', body: form })
  assertEquals(res.status, 409)
  const body = await res.json()
  assertEquals(body.error, 'CPF already registered')

  globalThis.fetch = originalFetch
})

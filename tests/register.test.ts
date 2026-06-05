import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { handleRegister } from '../routes/api/users/register.ts'

// Helper to build a multipart FormData request
function makeRegisterRequest(fields: Record<string, string | File>): Request {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value)
  }
  return new Request('http://localhost:8000/api/users/register', {
    method: 'POST',
    body: form,
  })
}

function makeFile(name: string, content = 'data', type = 'image/jpeg'): File {
  return new File([content], name, { type })
}

Deno.test('POST /api/users/register', async (t) => {
  // Use a temp uploads dir to avoid polluting the project
  const testUploadsDir = await Deno.makeTempDir({
    prefix: 'local_passport_register_test_',
  })
  const originalUploadsDir = Deno.env.get('UPLOADS_DIR')
  const originalBaseUrl = Deno.env.get('APP_BASE_URL')
  Deno.env.set('UPLOADS_DIR', testUploadsDir)
  Deno.env.set('APP_BASE_URL', 'http://localhost:8000')

  const kv = await Deno.openKv()

  // Unique CPF for integration test to avoid cross-test pollution
  const integrationCpf = '98765432100'

  // Cleanup helper
  async function cleanupCpf(cpf: string) {
    const entry = await kv.get<string>(['users_by_cpf', cpf])
    if (entry.value) {
      const userId = entry.value
      const userRes = await kv.get<{ email?: string }>(['user', userId])
      if (userRes.value) {
        const user = userRes.value
        if (user.email) {
          await kv.delete(['users_by_email', user.email.toLowerCase()])
        }
      }
      await kv.delete(['user', userId])
      await kv.delete(['users_by_cpf', cpf])
      await kv.delete(['approvals', 'pending', userId])
    }
  }

  await cleanupCpf(integrationCpf)
  await kv.delete(['users_by_email', 'carlos@example.com'])

  // --- Unit tests: validation ---

  await t.step('rejects request with missing name', async () => {
    const req = makeRegisterRequest({
      cpf: '12345678901',
      email: 'test@example.com',
      whatsappDial: '+55',
      whatsappNumber: '48912345678',
      idPhoto: makeFile('id.jpg'),
      residenceProof: makeFile('proof.jpg'),
    })
    const res = await handleRegister(req)
    assertEquals(res.status, 400)
    const body = await res.json()
    assertExists(body.error)
  })

  await t.step('rejects request with missing cpf', async () => {
    const req = makeRegisterRequest({
      name: 'João Silva',
      email: 'test@example.com',
      whatsappDial: '+55',
      whatsappNumber: '48912345678',
      idPhoto: makeFile('id.jpg'),
      residenceProof: makeFile('proof.jpg'),
    })
    const res = await handleRegister(req)
    assertEquals(res.status, 400)
    const body = await res.json()
    assertExists(body.error)
  })

  await t.step('rejects request with missing email', async () => {
    const req = makeRegisterRequest({
      name: 'João Silva',
      cpf: '12345678901',
      whatsappDial: '+55',
      whatsappNumber: '48912345678',
      idPhoto: makeFile('id.jpg'),
      residenceProof: makeFile('proof.jpg'),
    })
    const res = await handleRegister(req)
    assertEquals(res.status, 400)
    const body = await res.json()
    assertExists(body.error)
  })

  await t.step('rejects request with missing idPhoto', async () => {
    const req = makeRegisterRequest({
      name: 'João Silva',
      cpf: '12345678901',
      email: 'test@example.com',
      whatsappDial: '+55',
      whatsappNumber: '48912345678',
      residenceProof: makeFile('proof.jpg'),
    })
    const res = await handleRegister(req)
    assertEquals(res.status, 400)
    const body = await res.json()
    assertExists(body.error)
  })

  await t.step('rejects request with missing residenceProof', async () => {
    const req = makeRegisterRequest({
      name: 'João Silva',
      cpf: '12345678901',
      email: 'test@example.com',
      whatsappDial: '+55',
      whatsappNumber: '48912345678',
      idPhoto: makeFile('id.jpg'),
    })
    const res = await handleRegister(req)
    assertEquals(res.status, 400)
    const body = await res.json()
    assertExists(body.error)
  })

  await t.step('rejects invalid CPF format (too short)', async () => {
    const req = makeRegisterRequest({
      name: 'João Silva',
      cpf: '1234',
      email: 'test@example.com',
      whatsappDial: '+55',
      whatsappNumber: '48912345678',
      idPhoto: makeFile('id.jpg'),
      residenceProof: makeFile('proof.jpg'),
    })
    const res = await handleRegister(req)
    assertEquals(res.status, 400)
    const body = await res.json()
    assertExists(body.error)
  })

  await t.step('accepts CPF with punctuation (normalizes it)', async () => {
    // Use a CPF that won't conflict — we'll clean up after
    const cpfWithPunctuation = '987.654.321-00'
    const normalizedCpf = '98765432100'
    const email = 'punctuation@example.com'
    await cleanupCpf(normalizedCpf)
    await kv.delete(['users_by_email', email])

    const req = makeRegisterRequest({
      name: 'Maria Souza',
      cpf: cpfWithPunctuation,
      email: email,
      whatsappDial: '+55',
      whatsappNumber: '48912345678',
      idPhoto: makeFile('id.jpg'),
      residenceProof: makeFile('proof.jpg'),
    })
    const res = await handleRegister(req)
    assertEquals(res.status, 201)
    const body = await res.json()
    assertEquals(body.cpf, normalizedCpf)

    // Cleanup
    await cleanupCpf(normalizedCpf)
  })

  await t.step('rejects duplicate CPF with 409', async () => {
    const cpf = '12345678909'
    const email1 = 'first@example.com'
    const email2 = 'second@example.com'
    await cleanupCpf(cpf)
    await kv.delete(['users_by_email', email1])
    await kv.delete(['users_by_email', email2])

    // First registration
    const req1 = makeRegisterRequest({
      name: 'First User',
      cpf,
      email: email1,
      whatsappDial: '+55',
      whatsappNumber: '48912345678',
      idPhoto: makeFile('id.jpg'),
      residenceProof: makeFile('proof.jpg'),
    })
    const res1 = await handleRegister(req1)
    assertEquals(res1.status, 201)

    // Second registration with same CPF
    const req2 = makeRegisterRequest({
      name: 'Second User',
      cpf,
      email: email2,
      whatsappDial: '+55',
      whatsappNumber: '48912345678',
      idPhoto: makeFile('id.jpg'),
      residenceProof: makeFile('proof.jpg'),
    })
    const res2 = await handleRegister(req2)
    assertEquals(res2.status, 409)
    const body = await res2.json()
    assertExists(body.error)

    // Cleanup
    await cleanupCpf(cpf)
  })

  await t.step('rejects duplicate email with 409', async () => {
    const email = 'duplicate@example.com'
    const cpf1 = '98765432100'
    const cpf2 = '12345678909'
    await cleanupCpf(cpf1)
    await cleanupCpf(cpf2)
    await kv.delete(['users_by_email', email])

    // Pre-register first user
    const req1 = makeRegisterRequest({
      name: 'User 1',
      cpf: cpf1,
      email: email,
      whatsappDial: '+55',
      whatsappNumber: '48912345678',
      idPhoto: makeFile('id1.jpg'),
      residenceProof: makeFile('proof1.jpg'),
    })
    const res1 = await handleRegister(req1)
    if (res1.status !== 201) {
      console.error('First registration failed:', await res1.json())
    }
    assertEquals(res1.status, 201)

    // Try to register second user with same email
    const req2 = makeRegisterRequest({
      name: 'User 2',
      cpf: cpf2,
      email: email,
      whatsappDial: '+55',
      whatsappNumber: '48912345678',
      idPhoto: makeFile('id2.jpg'),
      residenceProof: makeFile('proof2.jpg'),
    })
    const res = await handleRegister(req2)
    if (res.status !== 409) {
      console.error('Second registration response:', await res.json())
    }
    assertEquals(res.status, 409)
    const body = await res.json()
    assertEquals(body.error, 'Email already registered')

    await cleanupCpf(cpf1)
    await cleanupCpf(cpf2)
    await kv.delete(['users_by_email', email.toLowerCase()])
  })

  // --- Integration test ---

  await t.step(
    'complete multipart request stores user, 2 files, and returns 201',
    async () => {
      const idPhotoContent = 'fake-id-photo-bytes'
      const proofContent = 'fake-proof-bytes'

      const req = makeRegisterRequest({
        name: 'Carlos Oliveira',
        cpf: integrationCpf,
        email: 'carlos@example.com',
        whatsappDial: '+55',
        whatsappNumber: '48912345678',
        idPhoto: new File([idPhotoContent], 'id.jpg', { type: 'image/jpeg' }),
        residenceProof: new File([proofContent], 'proof.pdf', {
          type: 'application/pdf',
        }),
      })

      const res = await handleRegister(req)
      assertEquals(res.status, 201)

      const user = await res.json()
      assertEquals(user.name, 'Carlos Oliveira')
      assertEquals(user.cpf, integrationCpf)
      assertEquals(user.email, 'carlos@example.com')
      assertEquals(user.role, 'resident')
      assertEquals(user.status, 'pending')
      assertExists(user.id)
      assertExists(user.documents?.idPhotoUrl)
      assertExists(user.documents?.residenceProofUrl)

      // Verify URLs use APP_BASE_URL
      assertEquals(
        user.documents.idPhotoUrl.startsWith(
          'http://localhost:8000/api/uploads/',
        ),
        true,
      )
      assertEquals(
        user.documents.residenceProofUrl.startsWith(
          'http://localhost:8000/api/uploads/',
        ),
        true,
      )

      // Verify user stored in KV
      const kvUser = await kv.get(['user', user.id])
      assertExists(kvUser.value)
      assertEquals((kvUser.value as { cpf: string }).cpf, integrationCpf)

      // Verify CPF index stored in KV
      const kvCpfIndex = await kv.get(['users_by_cpf', integrationCpf])
      assertEquals(kvCpfIndex.value, user.id)

      // Verify pending approval entry stored in KV
      const kvApproval = await kv.get(['approvals', 'pending', user.id])
      assertExists(kvApproval.value)

      // Verify files were written to disk
      const idPhotoFilename = user.documents.idPhotoUrl.split('/').pop()!
      const proofFilename = user.documents.residenceProofUrl.split('/').pop()!

      const idPhotoBytes = await Deno.readFile(
        `${testUploadsDir}/${idPhotoFilename}`,
      )
      assertEquals(new TextDecoder().decode(idPhotoBytes), idPhotoContent)

      const proofBytes = await Deno.readFile(
        `${testUploadsDir}/${proofFilename}`,
      )
      assertEquals(new TextDecoder().decode(proofBytes), proofContent)

      // Cleanup
      await cleanupCpf(integrationCpf)
    },
  )

  // Restore env
  if (originalUploadsDir) {
    Deno.env.set('UPLOADS_DIR', originalUploadsDir)
  } else {
    Deno.env.delete('UPLOADS_DIR')
  }
  if (originalBaseUrl) {
    Deno.env.set('APP_BASE_URL', originalBaseUrl)
  } else {
    Deno.env.delete('APP_BASE_URL')
  }

  try {
    await Deno.remove(testUploadsDir, { recursive: true })
  } catch (_) {
    // ignore
  }

  kv.close()
})

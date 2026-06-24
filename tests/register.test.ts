import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { handleRegister } from '../routes/api/users/register.ts'
import { db } from '../lib/db.ts'
import * as schema from '../db/schema.ts'
import { eq } from 'drizzle-orm'

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

Deno.test({
  name: 'POST /api/users/register',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    // Use a temp uploads dir to avoid polluting the project
    const testUploadsDir = await Deno.makeTempDir({
      prefix: 'local_passport_register_test_',
    })
    const originalUploadsDir = Deno.env.get('UPLOADS_DIR')
    const originalBaseUrl = Deno.env.get('APP_BASE_URL')
    Deno.env.set('UPLOADS_DIR', testUploadsDir)
    Deno.env.set('APP_BASE_URL', 'http://localhost:8000')

    // Unique CPF for integration test to avoid cross-test pollution
    const integrationCpf = '98765432100'

    // Cleanup helper using Drizzle
    async function cleanupCpf(cpf: string) {
      const [user] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.cpf, cpf))
        .limit(1)
      if (user) {
        await db.delete(schema.users).where(eq(schema.users.id, user.id))
      }
    }

    await cleanupCpf(integrationCpf)
    await db.delete(schema.users).where(
      eq(schema.users.email, 'carlos@example.com'),
    )

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
      const cpfWithPunctuation = '987.654.321-00'
      const normalizedCpf = '98765432100'
      const email = 'punctuation@example.com'
      await cleanupCpf(normalizedCpf)
      await db.delete(schema.users).where(eq(schema.users.email, email))

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

    await t.step('rejects request with invalid whatsappDial', async () => {
      const req = makeRegisterRequest({
        name: 'João Silva',
        cpf: '12345678901',
        email: 'whatsapp@example.com',
        whatsappDial: '',
        whatsappNumber: '48912345678',
        idPhoto: makeFile('id.jpg'),
        residenceProof: makeFile('proof.jpg'),
      })
      const res = await handleRegister(req)
      assertEquals(res.status, 400)
      const body = await res.json()
      assertExists(body.error)
    })

    await t.step('rejects request with invalid whatsappNumber', async () => {
      const req = makeRegisterRequest({
        name: 'João Silva',
        cpf: '12345678901',
        email: 'whatsapp2@example.com',
        whatsappDial: '+55',
        whatsappNumber: '',
        idPhoto: makeFile('id.jpg'),
        residenceProof: makeFile('proof.jpg'),
      })
      const res = await handleRegister(req)
      assertEquals(res.status, 400)
      const body = await res.json()
      assertExists(body.error)
    })

    await t.step('rejects non-matching dial+number combination', async () => {
      const req = makeRegisterRequest({
        name: 'João Silva',
        cpf: '12345678909',
        email: 'phonecheck@example.com',
        whatsappDial: '+55',
        whatsappNumber: '12345',
        idPhoto: makeFile('id.jpg'),
        residenceProof: makeFile('proof.jpg'),
      })
      const res = await handleRegister(req)
      assertEquals(res.status, 400)
      const body = await res.json()
      assertEquals(body.error, 'Invalid WhatsApp number')
    })

    await t.step('rejects invalid multipart form data', async () => {
      const req = new Request('http://localhost:8000/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: 'not a valid form data body',
      })
      const res = await handleRegister(req)
      assertEquals(res.status, 400)
      const body = await res.json()
      assertEquals(body.error, 'Invalid multipart form data')
    })

    await t.step(
      'returns upload error when uploadFile fails (empty file)',
      async () => {
        const cpf = '12345678909'
        const email = 'uploadfail@example.com'
        await cleanupCpf(cpf)
        await db.delete(schema.users).where(eq(schema.users.email, email))
        const req = makeRegisterRequest({
          name: 'João Silva',
          cpf,
          email,
          whatsappDial: '+55',
          whatsappNumber: '48912345678',
          idPhoto: new File([], 'empty.jpg', { type: 'image/jpeg' }),
          residenceProof: makeFile('proof.jpg'),
        })
        const res = await handleRegister(req)
        assertEquals(res.status, 400)
        const body = await res.json()
        assertEquals(body.error, 'File is empty')
      },
    )

    await t.step('rejects duplicate CPF with 409', async () => {
      const cpf = '12345678909'
      const email1 = 'first@example.com'
      const email2 = 'second@example.com'
      await cleanupCpf(cpf)
      await db.delete(schema.users).where(eq(schema.users.email, email1))
      await db.delete(schema.users).where(eq(schema.users.email, email2))

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
      await db.delete(schema.users).where(eq(schema.users.email, email))

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
      await db.delete(schema.users).where(
        eq(schema.users.email, email.toLowerCase()),
      )
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

        // Verify user stored in database
        const [dbUser] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, user.id))
          .limit(1)
        assertExists(dbUser)
        assertEquals(dbUser.cpf, integrationCpf)

        // Verify CPF unique constraint is enforced
        const [dbUserByCpf] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.cpf, integrationCpf))
          .limit(1)
        assertExists(dbUserByCpf)
        assertEquals(dbUserByCpf.id, user.id)

        // Verify status is 'pending'
        assertEquals(dbUser.status, 'pending')

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
  },
})

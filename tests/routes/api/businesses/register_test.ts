import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { handleRegister } from '../../../../routes/api/businesses/register.ts'
import { kv } from '../../../../lib/kv.ts'

function makeRegisterRequest(
  fields: Record<string, string | File>,
): Request {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value)
  }
  return new Request('http://localhost:8000/api/businesses/register', {
    method: 'POST',
    body: form,
  })
}

function makeFile(name: string, content = 'data', type = 'image/jpeg'): File {
  return new File([content], name, { type })
}

const validFields: Record<string, string | File> = {
  name: 'Minha Empresa',
  companyName: 'Minha Empresa Ltda',
  cnpj: '11222333000181',
  category: 'Alimentação',
  email: 'empresa@test.com',
  password: 'Senha@123',
  logo: makeFile('logo.png'),
}

Deno.test('POST /api/businesses/register', async (t) => {
  const testUploadsDir = await Deno.makeTempDir({
    prefix: 'local_passport_business_register_test_',
  })
  const originalUploadsDir = Deno.env.get('UPLOADS_DIR')
  const originalBaseUrl = Deno.env.get('APP_BASE_URL')
  Deno.env.set('UPLOADS_DIR', testUploadsDir)
  Deno.env.set('APP_BASE_URL', 'http://localhost:8000')

  const integrationEmail = `business_int_${Date.now()}@test.com`
  const integrationCnpj = '11222333000181'

  async function cleanupBusiness(cnpj: string, email: string) {
    const cnpjEntry = await kv.get<string>(['businesses_by_cnpj', cnpj])
    if (cnpjEntry.value) {
      const bizId = cnpjEntry.value
      await kv.delete(['businesses', bizId])
      await kv.delete(['businesses_by_cnpj', cnpj])
    }
    const emailEntry = await kv.get<string>([
      'users_by_email',
      email.toLowerCase(),
    ])
    if (emailEntry.value) {
      const uid = emailEntry.value
      await kv.delete(['user', uid])
      await kv.delete(['users_by_email', email.toLowerCase()])
    }
  }

  await cleanupBusiness(integrationCnpj, integrationEmail)

  // --- Validation tests ---

  await t.step('rejects missing name', async () => {
    const fields = { ...validFields }
    delete (fields as Record<string, unknown>).name
    const res = await handleRegister(makeRegisterRequest(fields))
    assertEquals(res.status, 400)
    const body = await res.json()
    assertExists(body.error)
    assertEquals(body.error, 'Missing required field: name')
  })

  await t.step('rejects missing companyName', async () => {
    const fields = { ...validFields }
    delete (fields as Record<string, unknown>).companyName
    const res = await handleRegister(makeRegisterRequest(fields))
    assertEquals(res.status, 400)
    const body = await res.json()
    assertExists(body.error)
    assertEquals(body.error, 'Missing required field: companyName')
  })

  await t.step('rejects missing CNPJ', async () => {
    const fields = { ...validFields }
    delete (fields as Record<string, unknown>).cnpj
    const res = await handleRegister(makeRegisterRequest(fields))
    assertEquals(res.status, 400)
    const body = await res.json()
    assertEquals(body.error, 'Missing required field: CNPJ')
  })

  await t.step('rejects missing category', async () => {
    const fields = { ...validFields }
    delete (fields as Record<string, unknown>).category
    const res = await handleRegister(makeRegisterRequest(fields))
    assertEquals(res.status, 400)
    const body = await res.json()
    assertEquals(body.error, 'Missing required field: category')
  })

  await t.step('rejects missing email', async () => {
    const fields = { ...validFields }
    delete (fields as Record<string, unknown>).email
    const res = await handleRegister(makeRegisterRequest(fields))
    assertEquals(res.status, 400)
    const body = await res.json()
    assertEquals(body.error, 'Missing required field: email')
  })

  await t.step('rejects missing password', async () => {
    const fields = { ...validFields }
    delete (fields as Record<string, unknown>).password
    const res = await handleRegister(makeRegisterRequest(fields))
    assertEquals(res.status, 400)
    const body = await res.json()
    assertEquals(body.error, 'Missing required field: password')
  })

  await t.step('rejects missing logo', async () => {
    const fields = { ...validFields }
    delete (fields as Record<string, unknown>).logo
    const res = await handleRegister(makeRegisterRequest(fields))
    assertEquals(res.status, 400)
    const body = await res.json()
    assertExists(body.error)
    assertEquals(body.error, 'Missing required file: logo')
  })

  await t.step('rejects invalid CNPJ', async () => {
    const res = await handleRegister(
      makeRegisterRequest({ ...validFields, cnpj: '12345678901234' }),
    )
    assertEquals(res.status, 400)
    const body = await res.json()
    assertEquals(body.error, 'Invalid CNPJ')
  })

  await t.step('accepts CNPJ with punctuation (normalizes it)', async () => {
    const email = `cnpj_punct_${Date.now()}@test.com`
    const cnpj = '11.222.333/0001-81'
    const normalizedCnpj = '11222333000181'
    await cleanupBusiness(normalizedCnpj, email)

    const res = await handleRegister(
      makeRegisterRequest({
        ...validFields,
        cnpj,
        email,
        password: 'Test@123',
      }),
    )
    assertEquals(res.status, 201)
    const body = await res.json()
    assertEquals(body.business.cnpj, normalizedCnpj)

    await cleanupBusiness(normalizedCnpj, email)
  })

  await t.step('rejects invalid multipart form data', async () => {
    const req = new Request('http://localhost:8000/api/businesses/register', {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data' },
      body: 'not a valid form data body',
    })
    const res = await handleRegister(req)
    assertEquals(res.status, 400)
    const body = await res.json()
    assertEquals(body.error, 'Invalid multipart form data')
  })

  await t.step('rejects empty logo file', async () => {
    const email = `upload_fail_${Date.now()}@test.com`
    await cleanupBusiness('11222333000181', email)
    const res = await handleRegister(
      makeRegisterRequest({
        ...validFields,
        email,
        password: 'Test@123',
        logo: new File([], 'empty.jpg', { type: 'image/jpeg' }),
      }),
    )
    assertEquals(res.status, 400)
    const body = await res.json()
    assertEquals(body.error, 'Missing required file: logo')
  })

  // --- Duplicate detection tests ---

  await t.step('rejects duplicate email with 409', async () => {
    const email = `dup_email_${Date.now()}@test.com`
    const cnpj = '11222333000181'
    await cleanupBusiness(cnpj, email)

    const res1 = await handleRegister(
      makeRegisterRequest({
        ...validFields,
        email,
        cnpj,
        password: 'Test@123',
      }),
    )
    assertEquals(res1.status, 201)

    const res2 = await handleRegister(
      makeRegisterRequest({
        ...validFields,
        email,
        cnpj,
        password: 'Test@123',
      }),
    )
    assertEquals(res2.status, 409)
    const body = await res2.json()
    assertExists(body.error)

    await cleanupBusiness(cnpj, email)
  })

  await t.step('rejects duplicate CNPJ with 409', async () => {
    const email1 = `dup_cnpj_1_${Date.now()}@test.com`
    const email2 = `dup_cnpj_2_${Date.now()}@test.com`
    const cnpj = '11222333000181'
    await cleanupBusiness(cnpj, email1)
    await cleanupBusiness(cnpj, email2)

    const res1 = await handleRegister(
      makeRegisterRequest({
        ...validFields,
        email: email1,
        cnpj,
        password: 'Test@123',
      }),
    )
    assertEquals(res1.status, 201)

    const res2 = await handleRegister(
      makeRegisterRequest({
        ...validFields,
        email: email2,
        cnpj,
        password: 'Test@123',
      }),
    )
    assertEquals(res2.status, 409)
    const body = await res2.json()
    assertExists(body.error)

    await cleanupBusiness(cnpj, email1)
    await cleanupBusiness(cnpj, email2)
  })

  // --- Integration test ---

  await t.step(
    'complete registration stores user, business, files, and returns 201',
    async () => {
      const logoContent = 'fake-logo-bytes'

      const res = await handleRegister(
        makeRegisterRequest({
          name: 'Minha Empresa',
          companyName: 'Minha Empresa Ltda',
          cnpj: integrationCnpj,
          category: 'Alimentação',
          email: integrationEmail,
          password: 'Senha@123',
          logo: new File([logoContent], 'logo.png', { type: 'image/png' }),
          description: 'Uma ótima empresa',
          socialLinks: JSON.stringify({
            instagram: 'https://instagram.com/minhaempresa',
          }),
          openingHours: JSON.stringify({
            monday: { open: '09:00', close: '18:00' },
          }),
        }),
      )

      assertEquals(res.status, 201)

      const body = await res.json()
      assertEquals(body.user.role, 'business')
      assertEquals(body.user.status, 'pending')
      assertEquals(body.user.email, integrationEmail)
      assertExists(body.user.id)

      assertEquals(body.business.name, 'Minha Empresa')
      assertEquals(body.business.companyName, 'Minha Empresa Ltda')
      assertEquals(body.business.cnpj, integrationCnpj)
      assertEquals(body.business.category, 'Alimentação')
      assertEquals(body.business.description, 'Uma ótima empresa')
      assertEquals(body.business.isActive, false)
      assertEquals(body.business.userId, body.user.id)
      assertExists(body.business.id)
      assertExists(body.business.logoUrl)
      assertEquals(
        body.business.socialLinks.instagram,
        'https://instagram.com/minhaempresa',
      )
      assertEquals(body.business.openingHours.monday.open, '09:00')
      assertEquals(body.business.openingHours.monday.close, '18:00')

      assertEquals(
        body.business.logoUrl.startsWith('http://localhost:8000/api/uploads/'),
        true,
      )

      const kvBusiness = await kv.get(['businesses', body.business.id])
      assertExists(kvBusiness.value)

      const kvCnpjIndex = await kv.get(['businesses_by_cnpj', integrationCnpj])
      assertEquals(kvCnpjIndex.value, body.business.id)

      const logoFilename = body.business.logoUrl.split('/').pop()!
      const logoBytes = await Deno.readFile(
        `${testUploadsDir}/${logoFilename}`,
      )
      assertEquals(new TextDecoder().decode(logoBytes), logoContent)

      await cleanupBusiness(integrationCnpj, integrationEmail)
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
  } catch {
    // ignore
  }
})

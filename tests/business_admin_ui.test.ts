import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { render } from 'npm:preact-render-to-string@^6.6.3'
import { h } from 'npm:preact@^10.27.2'
import {
  formatCnpjDisplay,
  isValidCnpj,
  normalizeCnpj,
  validateBusinessForm,
} from '../lib/business.ts'
import BusinessManager from '../islands/BusinessManager.tsx'
import { handler as indexHandler } from '../routes/api/businesses/index.ts'
import { handler as detailHandler } from '../routes/api/businesses/[id].ts'

const kv = await Deno.openKv()

Deno.test('Business Admin - CNPJ Helpers', async (t) => {
  await t.step('normalizeCnpj strips special characters', () => {
    assertEquals(normalizeCnpj('12.345.678/0001-90'), '12345678000190')
    assertEquals(normalizeCnpj('60316817000103'), '60316817000103')
  })

  await t.step('formatCnpjDisplay formats CNPJ', () => {
    assertEquals(formatCnpjDisplay('12345678000190'), '12.345.678/0001-90')
  })

  await t.step('isValidCnpj detects valid/invalid CNPJs', () => {
    assertEquals(isValidCnpj('12.345.678/0001-95'), true)
    assertEquals(isValidCnpj('60.316.817/0001-03'), true)
    assertEquals(isValidCnpj('12.345.678/0001-00'), false) // invalid checksum
    assertEquals(isValidCnpj('00000000000000'), false) // repeating
    assertEquals(isValidCnpj('123'), false) // short
  })
})

Deno.test('Business Admin Form - validation rules', async (t) => {
  await t.step('returns error for empty company name', () => {
    const errs = validateBusinessForm({
      name: '',
      cnpj: '12.345.678/0001-95',
      category: 'Alimentação',
      logo: null,
      userId: 'user_123',
    })
    assertEquals(errs.name, 'Nome da empresa é obrigatório.')
  })

  await t.step('returns error for invalid CNPJ', () => {
    const errs = validateBusinessForm({
      name: 'Test Store',
      cnpj: '12.345.678/0001-00',
      category: 'Alimentação',
      logo: null,
      userId: 'user_123',
    })
    assertEquals(errs.cnpj, 'CNPJ inválido. Informe 14 dígitos.')
  })

  await t.step('returns error for missing logo when creating', () => {
    const errs = validateBusinessForm({
      name: 'Test Store',
      cnpj: '12.345.678/0001-95',
      category: 'Alimentação',
      logo: null,
      userId: 'user_123',
      isEdit: false,
    })
    assertEquals(errs.logo, 'Logotipo é obrigatório.')
  })

  await t.step('no error for missing logo when editing', () => {
    const errs = validateBusinessForm({
      name: 'Test Store',
      cnpj: '12.345.678/0001-95',
      category: 'Alimentação',
      logo: null,
      userId: 'user_123',
      isEdit: true,
    })
    assertEquals(errs.logo, undefined)
  })

  await t.step('returns error for missing category', () => {
    const errs = validateBusinessForm({
      name: 'Test Store',
      cnpj: '12.345.678/0001-95',
      category: '',
      logo: null,
      userId: 'user_123',
    })
    assertEquals(errs.category, 'Categoria é obrigatória.')
  })

  await t.step('returns error for missing userId', () => {
    const errs = validateBusinessForm({
      name: 'Test Store',
      cnpj: '12.345.678/0001-95',
      category: 'Alimentação',
      logo: null,
      userId: '',
    })
    assertEquals(errs.userId, 'Associação de usuário é obrigatória.')
  })
})

Deno.test('BusinessManager UI - Unit Tests', async (t) => {
  const originalFetch = globalThis.fetch

  globalThis.fetch = (input: RequestInfo | URL): Promise<Response> => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
      ? input.href
      : input.url
    if (url.includes('/api/businesses')) {
      return Promise.resolve(
        new Response(JSON.stringify([
          {
            id: 'b-1',
            name: 'Empresa Teste',
            cnpj: '12345678000195',
            category: 'Alimentação',
            logoUrl: 'http://localhost/logo.png',
            userId: 'u-1',
            isActive: true,
          },
        ])),
      )
    }
    if (url.includes('/api/admin/users')) {
      return Promise.resolve(
        new Response(JSON.stringify([
          { id: 'u-1', name: 'User 1', email: 'u1@test.com', role: 'resident' },
        ])),
      )
    }
    return Promise.resolve(new Response('{}'))
  }

  await t.step('renders loading state initially', () => {
    const html = render(h(BusinessManager, {}))
    assertEquals(html.includes('Carregando dados das empresas...'), true)
  })

  globalThis.fetch = originalFetch
})

Deno.test('Business API Endpoints Integration', async (t) => {
  const testUserId = `test-user-${crypto.randomUUID()}`
  let createdBusinessId = ''

  // Set up mock UPLOADS_DIR for local storage
  const originalUploadsDir = Deno.env.get('UPLOADS_DIR')
  const tempUploadsDir = await Deno.makeTempDir()
  Deno.env.set('UPLOADS_DIR', tempUploadsDir)

  // Create test user in KV
  await kv.set(['user', testUserId], {
    id: testUserId,
    name: 'Test Business User',
    email: 'bizuser@example.com',
    role: 'resident',
  })

  try {
    await t.step('POST /api/businesses rejects missing name', async () => {
      const formData = new FormData()
      formData.append('cnpj', '12345678000195')
      formData.append('category', 'Alimentação')
      formData.append('userId', testUserId)
      formData.append(
        'logo',
        new Blob(['img'], { type: 'image/png' }),
        'logo.png',
      )
      const req = new Request('http://localhost:8000/api/businesses', {
        method: 'POST',
        body: formData,
      })
      const res = await (indexHandler.POST as (
        ctx: { req: Request },
      ) => Response | Promise<Response>)({ req })
      assertEquals(res.status, 400)
    })

    await t.step('POST /api/businesses rejects invalid CNPJ', async () => {
      const formData = new FormData()
      formData.append('name', 'Test')
      formData.append('cnpj', '12345678901234') // invalid checksum
      formData.append('category', 'Alimentação')
      formData.append('userId', testUserId)
      formData.append(
        'logo',
        new Blob(['img'], { type: 'image/png' }),
        'logo.png',
      )
      const req = new Request('http://localhost:8000/api/businesses', {
        method: 'POST',
        body: formData,
      })
      const res = await (indexHandler.POST as (
        ctx: { req: Request },
      ) => Response | Promise<Response>)({ req })
      assertEquals(res.status, 400)
    })

    await t.step('POST /api/businesses rejects missing category', async () => {
      const formData = new FormData()
      formData.append('name', 'Test')
      formData.append('cnpj', '12345678000195')
      formData.append('userId', testUserId)
      formData.append(
        'logo',
        new Blob(['img'], { type: 'image/png' }),
        'logo.png',
      )
      const req = new Request('http://localhost:8000/api/businesses', {
        method: 'POST',
        body: formData,
      })
      const res = await (indexHandler.POST as (
        ctx: { req: Request },
      ) => Response | Promise<Response>)({ req })
      assertEquals(res.status, 400)
    })

    await t.step('POST /api/businesses rejects missing logo', async () => {
      const formData = new FormData()
      formData.append('name', 'Test')
      formData.append('cnpj', '12345678000195')
      formData.append('category', 'Alimentação')
      formData.append('userId', testUserId)
      const req = new Request('http://localhost:8000/api/businesses', {
        method: 'POST',
        body: formData,
      })
      const res = await (indexHandler.POST as (
        ctx: { req: Request },
      ) => Response | Promise<Response>)({ req })
      assertEquals(res.status, 400)
    })

    await t.step('POST /api/businesses rejects missing userId', async () => {
      const formData = new FormData()
      formData.append('name', 'Test')
      formData.append('cnpj', '12345678000195')
      formData.append('category', 'Alimentação')
      formData.append(
        'logo',
        new Blob(['img'], { type: 'image/png' }),
        'logo.png',
      )
      const req = new Request('http://localhost:8000/api/businesses', {
        method: 'POST',
        body: formData,
      })
      const res = await (indexHandler.POST as (
        ctx: { req: Request },
      ) => Response | Promise<Response>)({ req })
      assertEquals(res.status, 400)
    })

    await t.step(
      'POST /api/businesses creates business and updates user role',
      async () => {
        const formData = new FormData()
        formData.append('name', 'Gourmet Burguer')
        formData.append('cnpj', '12345678000195')
        formData.append('category', 'Alimentação')
        formData.append('userId', testUserId)
        formData.append('description', 'Os melhores hambúrgueres')

        const logoBlob = new Blob(['fake-image-binary-data'], {
          type: 'image/png',
        })
        formData.append('logo', logoBlob, 'logo.png')

        const req = new Request('http://localhost:8000/api/businesses', {
          method: 'POST',
          body: formData,
        })

        const postHandler = indexHandler.POST as (
          ctx: { req: Request },
        ) => Response | Promise<Response>
        const res = await postHandler({ req })
        assertEquals(res.status, 201)

        const business = await res.json()
        assertExists(business.id)
        createdBusinessId = business.id
        assertEquals(business.name, 'Gourmet Burguer')
        assertEquals(business.companyName, 'Gourmet Burguer')
        assertEquals(business.cnpj, '12345678000195')
        assertEquals(business.category, 'Alimentação')

        // Verify logo URL was constructed
        assertExists(business.logoUrl)
        assertEquals(business.logoUrl.includes('/api/uploads/'), true)

        // Verify that user role got updated to 'business'
        const userEntry = await kv.get(['user', testUserId])
        assertEquals(
          (userEntry.value as Record<string, unknown>).role,
          'business',
        )
      },
    )

    await t.step(
      'GET /api/businesses returns the list of businesses',
      async () => {
        const req = new Request('http://localhost:8000/api/businesses')
        const getHandler = indexHandler.GET as (
          ctx: { req: Request },
        ) => Response | Promise<Response>
        const res = await getHandler({ req })
        assertEquals(res.status, 200)

        const list = await res.json() as Array<Record<string, unknown>>
        const found = list.find((b) => b.id === createdBusinessId)
        assertExists(found)
        assertEquals(found.name, 'Gourmet Burguer')
      },
    )

    await t.step('PUT /api/businesses/:id updates business data', async () => {
      const req = new Request(
        `http://localhost:8000/api/businesses/${createdBusinessId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: 'Hambúrgueres artesanais atualizados',
            isActive: false,
          }),
        },
      )

      const putHandler = detailHandler.PUT as (
        ctx: { req: Request; params: Record<string, string> },
      ) => Response | Promise<Response>
      const res = await putHandler({
        req,
        params: { id: createdBusinessId },
      })
      assertEquals(res.status, 200)

      const updated = await res.json()
      assertEquals(updated.description, 'Hambúrgueres artesanais atualizados')
      assertEquals(updated.isActive, false)
    })

    await t.step('PUT /api/businesses/:id rejects invalid CNPJ', async () => {
      const req = new Request(
        `http://localhost:8000/api/businesses/${createdBusinessId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cnpj: '00000000000000' }),
        },
      )
      const res = await (detailHandler.PUT as (
        ctx: { req: Request; params: Record<string, string> },
      ) => Response | Promise<Response>)({
        req,
        params: { id: createdBusinessId },
      })
      assertEquals(res.status, 400)
    })

    await t.step(
      'PUT /api/businesses/:id returns 404 for non-existent',
      async () => {
        const req = new Request(
          'http://localhost:8000/api/businesses/nonexistent',
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Ghost' }),
          },
        )
        const res = await (detailHandler.PUT as (
          ctx: { req: Request; params: Record<string, string> },
        ) => Response | Promise<Response>)({
          req,
          params: { id: 'nonexistent' },
        })
        assertEquals(res.status, 404)
      },
    )

    await t.step(
      'PUT /api/businesses/:id rejects invalid JSON body',
      async () => {
        const req = new Request(
          `http://localhost:8000/api/businesses/${createdBusinessId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: 'null',
          },
        )
        const res = await (detailHandler.PUT as (
          ctx: { req: Request; params: Record<string, string> },
        ) => Response | Promise<Response>)({
          req,
          params: { id: createdBusinessId },
        })
        assertEquals(res.status, 400)
      },
    )

    await t.step(
      'PUT /api/businesses/:id with multipart updates business',
      async () => {
        const formData = new FormData()
        formData.append('name', 'Updated Multipart Name')
        formData.append('companyName', 'Updated Company')
        formData.append('cnpj', '60316817000103')
        formData.append('category', 'Lazer')
        formData.append('description', 'Updated via multipart')
        formData.append('userId', testUserId)
        formData.append('isActive', 'false')
        const logoBlob = new Blob(['new-logo-data'], { type: 'image/png' })
        formData.append('logo', logoBlob, 'logo.png')

        const req = new Request(
          `http://localhost:8000/api/businesses/${createdBusinessId}`,
          {
            method: 'PUT',
            body: formData,
          },
        )
        const res = await (detailHandler.PUT as (
          ctx: { req: Request; params: Record<string, string> },
        ) => Response | Promise<Response>)({
          req,
          params: { id: createdBusinessId },
        })
        assertEquals(res.status, 200)
        const updated = await res.json()
        assertEquals(updated.name, 'Updated Multipart Name')
        assertEquals(updated.companyName, 'Updated Company')
        assertEquals(updated.cnpj, '60316817000103')
        assertEquals(updated.category, 'Lazer')
        assertEquals(updated.description, 'Updated via multipart')
        assertEquals(updated.isActive, false)
      },
    )

    await t.step('PUT multipart with invalid CNPJ returns 400', async () => {
      const formData = new FormData()
      formData.append('cnpj', '00000000000000')
      const req = new Request(
        `http://localhost:8000/api/businesses/${createdBusinessId}`,
        {
          method: 'PUT',
          body: formData,
        },
      )
      const res = await (detailHandler.PUT as (
        ctx: { req: Request; params: Record<string, string> },
      ) => Response | Promise<Response>)({
        req,
        params: { id: createdBusinessId },
      })
      assertEquals(res.status, 400)
      assertEquals(await res.text(), 'Invalid CNPJ')
    })

    await t.step(
      'PUT with invalid multipart form data returns 400',
      async () => {
        const req = new Request(
          `http://localhost:8000/api/businesses/${createdBusinessId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'multipart/form-data' },
            body: 'not a valid form data body',
          },
        )
        const res = await (detailHandler.PUT as (
          ctx: { req: Request; params: Record<string, string> },
        ) => Response | Promise<Response>)({
          req,
          params: { id: createdBusinessId },
        })
        assertEquals(res.status, 400)
        assertEquals(await res.text(), 'Invalid multipart form data')
      },
    )

    await t.step(
      'DELETE /api/businesses/:id removes business profile',
      async () => {
        const req = new Request(
          `http://localhost:8000/api/businesses/${createdBusinessId}`,
          {
            method: 'DELETE',
          },
        )

        const deleteHandler = detailHandler.DELETE as (
          ctx: { req: Request; params: Record<string, string> },
        ) => Response | Promise<Response>
        const res = await deleteHandler({
          req,
          params: { id: createdBusinessId },
        })
        assertEquals(res.status, 204)

        // Verify it is deleted from list
        const getReq = new Request('http://localhost:8000/api/businesses')
        const getHandler2 = indexHandler.GET as (
          ctx: { req: Request },
        ) => Response | Promise<Response>
        const getRes = await getHandler2({ req: getReq })
        const list = await getRes.json() as Array<Record<string, unknown>>
        const found = list.find((b) => b.id === createdBusinessId)
        assertEquals(found, undefined)
      },
    )
  } finally {
    // Cleanup
    await kv.delete(['user', testUserId])
    if (createdBusinessId) {
      await kv.delete(['businesses', createdBusinessId])
    }

    // Clean up temporary uploads directory
    try {
      await Deno.remove(tempUploadsDir, { recursive: true })
    } catch {
      // Directory may not exist
    }

    // Restore original uploads directory env var
    if (originalUploadsDir) {
      Deno.env.set('UPLOADS_DIR', originalUploadsDir)
    } else {
      Deno.env.delete('UPLOADS_DIR')
    }
  }
})

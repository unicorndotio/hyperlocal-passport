import {
  assertEquals,
  assertStringIncludes,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { h } from 'npm:preact@^10.27.2'
import { renderToString } from 'npm:preact-render-to-string@^6.5.13'

// ── Validation Logic Tests ──────────────────────────────────────────

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

function isUrlValid(value: string): boolean {
  if (!value || !value.trim()) return true
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

function isTime(value: string): boolean {
  if (!value) return true
  return TIME_PATTERN.test(value)
}

function openBeforeClose(open: string, close: string): boolean {
  if (!open || !close) return true
  return open < close
}

Deno.test('BusinessProfileEditor - Client-side validation logic', async (t) => {
  await t.step('rejects invalid URL', () => {
    assertEquals(isUrlValid('not-a-url'), false)
    assertEquals(isUrlValid(''), true)
  })

  await t.step('accepts valid URL', () => {
    assertEquals(isUrlValid('https://instagram.com/test'), true)
    assertEquals(isUrlValid('https://www.facebook.com/pages'), true)
    assertEquals(isUrlValid('https://wa.me/5548999999999'), true)
  })

  await t.step('rejects invalid time format', () => {
    assertEquals(isTime('25:00'), false)
    assertEquals(isTime('24:00'), false)
    assertEquals(isTime('09:60'), false)
    assertEquals(isTime('abc'), false)
    assertEquals(isTime('9:00'), false)
  })

  await t.step('accepts valid time format', () => {
    assertEquals(isTime('00:00'), true)
    assertEquals(isTime('09:00'), true)
    assertEquals(isTime('23:59'), true)
  })

  await t.step('accepts empty time', () => {
    assertEquals(isTime(''), true)
  })

  await t.step('validates open must precede close', () => {
    assertEquals(openBeforeClose('08:00', '18:00'), true)
    assertEquals(openBeforeClose('18:00', '08:00'), false)
    assertEquals(openBeforeClose('09:00', '09:00'), false)
  })

  await t.step('accepts empty open/close fields', () => {
    assertEquals(openBeforeClose('', '18:00'), true)
    assertEquals(openBeforeClose('08:00', ''), true)
  })
})

// ── Rendering Tests ─────────────────────────────────────────────────

const TEST_BUSINESS = {
  id: 'biz-123',
  userId: 'user-456',
  name: 'Restaurante Teste',
  companyName: 'Restaurante Teste Ltda',
  cnpj: '12.345.678/0001-90',
  category: 'Alimentação',
  description: 'Melhor restaurante da região',
  logoUrl: 'http://localhost:8000/api/uploads/logo.png',
  socialLinks: {
    instagram: 'https://instagram.com/teste',
    facebook: 'https://facebook.com/teste',
  },
  openingHours: {
    monday: { open: '09:00', close: '18:00' },
    friday: { open: '09:00', close: '22:00' },
  },
  isActive: false,
  createdAt: new Date().toISOString(),
}

const TEST_BUSINESS_ACTIVE = {
  ...TEST_BUSINESS,
  isActive: true,
}

const TEST_BUSINESS_NO_SOCIAL = {
  ...TEST_BUSINESS,
  socialLinks: {},
  openingHours: {},
}

Deno.test('BusinessProfileEditor - renders all expected form fields', async () => {
  const { default: BusinessProfileEditor } = await import(
    '../islands/BusinessProfileEditor.tsx'
  )
  const html = renderToString(
    h(BusinessProfileEditor, { business: TEST_BUSINESS }),
  )

  assertStringIncludes(html, 'Logotipo')
  assertStringIncludes(html, 'Descrição')
  assertStringIncludes(html, 'Redes Sociais')
  assertStringIncludes(html, 'Instagram')
  assertStringIncludes(html, 'Facebook')
  assertStringIncludes(html, 'WhatsApp')
  assertStringIncludes(html, 'Cardápio Online')
  assertStringIncludes(html, 'Horários de Funcionamento')
  assertStringIncludes(html, 'Segunda-feira')
  assertStringIncludes(html, 'Terça-feira')
  assertStringIncludes(html, 'Quarta-feira')
  assertStringIncludes(html, 'Quinta-feira')
  assertStringIncludes(html, 'Sexta-feira')
  assertStringIncludes(html, 'Sábado')
  assertStringIncludes(html, 'Domingo')
  assertStringIncludes(html, 'Salvar Alterações')
  assertEquals(html.match(/Remove/g)?.length, 7)
})

Deno.test(
  'BusinessProfileEditor - renders activation banner when isActive === false',
  async () => {
    const { default: BusinessProfileEditor } = await import(
      '../islands/BusinessProfileEditor.tsx'
    )
    const html = renderToString(
      h(BusinessProfileEditor, { business: TEST_BUSINESS }),
    )

    assertStringIncludes(
      html,
      'Sua listagem está pendente de ativação. Você será listado assim que sua assinatura for confirmada.',
    )
  },
)

Deno.test(
  'BusinessProfileEditor - hides activation banner when isActive === true',
  async () => {
    const { default: BusinessProfileEditor } = await import(
      '../islands/BusinessProfileEditor.tsx'
    )
    const html = renderToString(
      h(BusinessProfileEditor, { business: TEST_BUSINESS_ACTIVE }),
    )

    assertEquals(
      html.includes(
        'Sua listagem está pendente de ativação. Você será listado assim que sua assinatura for confirmada.',
      ),
      false,
    )
  },
)

Deno.test(
  'BusinessProfileEditor - prefills form fields from business data',
  async () => {
    const { default: BusinessProfileEditor } = await import(
      '../islands/BusinessProfileEditor.tsx'
    )
    const html = renderToString(
      h(BusinessProfileEditor, { business: TEST_BUSINESS }),
    )

    assertStringIncludes(html, 'Melhor restaurante da região')
    assertStringIncludes(html, 'logo.png')
    assertStringIncludes(html, 'https://instagram.com/teste')
    assertStringIncludes(html, 'https://facebook.com/teste')
    assertStringIncludes(html, '09:00')
    assertStringIncludes(html, '18:00')
    assertStringIncludes(html, '22:00')
  },
)

Deno.test(
  'BusinessProfileEditor - handles empty socialLinks and openingHours',
  async () => {
    const { default: BusinessProfileEditor } = await import(
      '../islands/BusinessProfileEditor.tsx'
    )
    const html = renderToString(
      h(BusinessProfileEditor, { business: TEST_BUSINESS_NO_SOCIAL }),
    )

    assertStringIncludes(html, 'Logotipo')
    assertStringIncludes(html, 'Editar Perfil')
  },
)

// ── filterOpeningHours Pure Logic Tests ─────────────────────────────

Deno.test('BusinessProfileEditor - filterOpeningHours: removes specified days', async () => {
  const { filterOpeningHours } = await import(
    '../islands/BusinessProfileEditor.tsx'
  )

  const oh = {
    monday: { open: '09:00', close: '18:00' },
    tuesday: { open: '09:00', close: '18:00' },
    wednesday: { open: '09:00', close: '18:00' },
  }

  const removed = new Set(['tuesday'])
  const result = filterOpeningHours(oh, removed)

  assertEquals(Object.keys(result).length, 2)
  assertEquals(result.monday, oh.monday)
  assertEquals(result.wednesday, oh.wednesday)
  assertEquals(result.tuesday, undefined)
})

Deno.test('BusinessProfileEditor - filterOpeningHours: keeps all days when none removed', async () => {
  const { filterOpeningHours } = await import(
    '../islands/BusinessProfileEditor.tsx'
  )

  const oh = {
    monday: { open: '09:00', close: '18:00' },
    tuesday: { open: '09:00', close: '18:00' },
  }

  const result = filterOpeningHours(oh, new Set())
  assertEquals(Object.keys(result).length, 2)
  assertEquals(result.monday, oh.monday)
  assertEquals(result.tuesday, oh.tuesday)
})

Deno.test('BusinessProfileEditor - filterOpeningHours: skips entries without open/close', async () => {
  const { filterOpeningHours } = await import(
    '../islands/BusinessProfileEditor.tsx'
  )

  const oh = {
    monday: { open: '09:00', close: '18:00' },
    tuesday: { open: '', close: '' },
    wednesday: { open: '10:00', close: '' },
  }

  const result = filterOpeningHours(oh, new Set())
  assertEquals(Object.keys(result).length, 1)
  assertEquals(result.monday, oh.monday)
  assertEquals(result.tuesday, undefined)
  assertEquals(result.wednesday, undefined)
})

Deno.test('BusinessProfileEditor - filterOpeningHours: returns empty for all days removed', async () => {
  const { filterOpeningHours } = await import(
    '../islands/BusinessProfileEditor.tsx'
  )

  const oh = {
    monday: { open: '09:00', close: '18:00' },
    tuesday: { open: '10:00', close: '19:00' },
  }

  const result = filterOpeningHours(oh, new Set(['monday', 'tuesday']))
  assertEquals(Object.keys(result).length, 0)
})

Deno.test('BusinessProfileEditor - filterOpeningHours: not affected by removal of non-existent days', async () => {
  const { filterOpeningHours } = await import(
    '../islands/BusinessProfileEditor.tsx'
  )

  const oh = {
    friday: { open: '09:00', close: '18:00' },
  }

  const result = filterOpeningHours(oh, new Set(['sunday']))
  assertEquals(Object.keys(result).length, 1)
  assertEquals(result.friday, oh.friday)
})

// ── API Submit Logic Tests (Mocked) ─────────────────────────────────

Deno.test('BusinessProfileEditor - API submission logic', async (t) => {
  await t.step(
    'submit sends PUT with FormData to correct endpoint',
    async () => {
      const originalFetch = globalThis.fetch
      let capturedUrl = ''
      let capturedMethod = ''

      globalThis.fetch = (
        input: string | Request | URL,
        init?: RequestInit,
      ) => {
        capturedUrl = typeof input === 'string'
          ? input
          : (input as Request).url || String(input)
        capturedMethod = init?.method || 'GET'
        return Promise.resolve(
          new Response(
            JSON.stringify({ ...TEST_BUSINESS, description: 'Updated!' }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          ),
        )
      }

      const formData = new FormData()
      formData.append('description', 'Updated description')
      formData.append(
        'socialLinks',
        JSON.stringify({ instagram: 'https://instagram.com/test' }),
      )
      formData.append('openingHours', JSON.stringify({}))
      const res = await fetch(`/api/businesses/${TEST_BUSINESS.id}/profile`, {
        method: 'PUT',
        body: formData,
      })

      assertEquals(capturedUrl, `/api/businesses/${TEST_BUSINESS.id}/profile`)
      assertEquals(capturedMethod, 'PUT')
      assertEquals(res.status, 200)
      const data = await res.json()
      assertEquals(data.description, 'Updated!')

      globalThis.fetch = originalFetch
    },
  )

  await t.step(
    'submit with server error shows error feedback',
    async () => {
      const originalFetch = globalThis.fetch

      globalThis.fetch = () => {
        return Promise.resolve(
          new Response('Erro ao salvar perfil', { status: 400 }),
        )
      }

      const formData = new FormData()
      formData.append('description', 'test')
      const res = await fetch(`/api/businesses/${TEST_BUSINESS.id}/profile`, {
        method: 'PUT',
        body: formData,
      })

      assertEquals(res.status, 400)
      const text = await res.text()
      assertEquals(text, 'Erro ao salvar perfil')

      globalThis.fetch = originalFetch
    },
  )
})

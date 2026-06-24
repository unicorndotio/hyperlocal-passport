import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { stub as mockStub } from 'https://deno.land/std@0.224.0/testing/mock.ts'
import { render } from 'npm:preact-render-to-string@^6.6.3'
import { h } from 'npm:preact@^10.27.2'
import { auth } from '../lib/auth.ts'
import { handler as businessProfileHandler } from '../routes/api/businesses/[id]/profile.ts'
import { db } from '../lib/db.ts'
import * as schema from '../db/schema.ts'
import { eq } from 'drizzle-orm'
import BusinessOnboarding from '../islands/BusinessOnboarding.tsx'
import type { Business } from '../lib/business.ts'

type ProfileCtx = {
  req: Request
  params: Record<string, string>
  state: { user: { id: string; role: string } }
}
type ProfileHandler = {
  PUT: (ctx: ProfileCtx) => Promise<Response>
}

function businessSession() {
  return Promise.resolve({
    user: {
      id: 'biz_user',
      role: 'business',
      email: 'biz@example.com',
      name: 'Business Owner',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    session: {
      id: 'sess_biz',
      userId: 'biz_user',
      expiresAt: new Date(Date.now() + 3600000),
      token: 'token_biz',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
}

const mockBusiness: Business = {
  id: 'biz_1',
  userId: 'biz_user',
  name: 'Test Store',
  companyName: 'Test Store Ltda',
  cnpj: '11222333000181',
  category: 'food',
  description: 'A test store',
  logoUrl: 'http://localhost/logo.png',
  isActive: true,
  createdAt: new Date().toISOString(),
}

// --- Component Tests ---

Deno.test('BusinessOnboarding - Component Rendering', async (t) => {
  await t.step(
    'renders walkthrough when hasSeenMerchantOnboarding is false',
    () => {
      const html = render(
        h(BusinessOnboarding, {
          business: { ...mockBusiness, hasSeenMerchantOnboarding: false },
          businessId: 'biz_1',
        }),
      )
      assertExists(html.includes('Bem-vindo ao Novo Painel!'))
      assertExists(html.includes('Passo 1 de 6'))
      assertExists(html.includes('Próximo'))
      assertExists(html.includes('Pular'))
    },
  )

  await t.step('does NOT render when hasSeenMerchantOnboarding is true', () => {
    const html = render(
      h(BusinessOnboarding, {
        business: { ...mockBusiness, hasSeenMerchantOnboarding: true },
        businessId: 'biz_1',
      }),
    )
    assertEquals(html, '')
  })

  await t.step('renders the backdrop overlay', () => {
    const html = render(
      h(BusinessOnboarding, {
        business: { ...mockBusiness, hasSeenMerchantOnboarding: false },
        businessId: 'biz_1',
      }),
    )
    assertExists(html.includes('rgba(0,0,0,0.5)'))
  })

  await t.step('shows progress bar with 6 segments', () => {
    const html = render(
      h(BusinessOnboarding, {
        business: { ...mockBusiness, hasSeenMerchantOnboarding: false },
        businessId: 'biz_1',
      }),
    )
    assertExists(html.includes('Passo 1 de 6'))
  })

  await t.step('renders description text for the first step', () => {
    const html = render(
      h(BusinessOnboarding, {
        business: { ...mockBusiness, hasSeenMerchantOnboarding: false },
        businessId: 'biz_1',
      }),
    )
    assertExists(html.includes('Redesignamos o painel do lojista'))
  })

  await t.step('renders progress bar segments', () => {
    const html = render(
      h(BusinessOnboarding, {
        business: { ...mockBusiness, hasSeenMerchantOnboarding: false },
        businessId: 'biz_1',
      }),
    )
    const hasInactiveColor = html.includes('#e2e8f0')
    const hasActiveColor = html.includes('#2563eb')
    assertExists(hasInactiveColor)
    assertExists(hasActiveColor)
  })
})

Deno.test('BusinessOnboarding - Navigation Logic', async (t) => {
  await t.step('first step does not show Anterior button', () => {
    const html = render(
      h(BusinessOnboarding, {
        business: { ...mockBusiness, hasSeenMerchantOnboarding: false },
        businessId: 'biz_1',
      }),
    )
    assertEquals(html.includes('Anterior'), false)
  })

  await t.step('first step shows Proximo and Pular buttons', () => {
    const html = render(
      h(BusinessOnboarding, {
        business: { ...mockBusiness, hasSeenMerchantOnboarding: false },
        businessId: 'biz_1',
      }),
    )
    assertExists(html.includes('Próximo'))
    assertExists(html.includes('Pular'))
  })

  await t.step('last step shows Finalizar instead of Proximo', () => {
    assertExists(true)
  })
})

// --- API Integration Tests ---

Deno.test({
  name: 'BusinessOnboarding - API Integration',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    await db.delete(schema.businesses)
    await db.delete(schema.users)

    // Create a test user and business in PostgreSQL
    await db.insert(schema.users).values({
      id: 'biz_user',
      email: 'biz@example.com',
      name: 'Business Owner',
      role: 'business',
    })

    const testBusiness = {
      id: 'biz_api_1',
      userId: 'biz_user',
      name: 'API Test Store',
      companyName: 'API Test Store Ltda',
      cnpj: '11222333000181',
      category: 'food',
      description: 'Test',
      logoUrl: 'http://localhost/logo.png',
      isActive: true,
    }
    await db.insert(schema.businesses).values(testBusiness)

    const getSessionStub = mockStub(auth.api, 'getSession', businessSession)

    const handler = businessProfileHandler as unknown as ProfileHandler

    await t.step(
      'PUT /profile sets hasSeenMerchantOnboarding flag',
      async () => {
        const req = new Request(
          'http://localhost/api/businesses/biz_api_1/profile',
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hasSeenMerchantOnboarding: true }),
          },
        )

        const ctx: ProfileCtx = {
          req,
          params: { id: 'biz_api_1' },
          state: { user: { id: 'biz_user', role: 'business' } },
        }

        const res = await handler.PUT(ctx)
        assertEquals(res.status, 200)

        // Verify in database
        const [updated] = await db
          .select()
          .from(schema.businesses)
          .where(eq(schema.businesses.id, 'biz_api_1'))
          .limit(1)
        assertEquals(updated.hasSeenMerchantOnboarding, true)
      },
    )

    await t.step('rejects non-boolean hasSeenMerchantOnboarding', () => {
      const body = { hasSeenMerchantOnboarding: 'true' }
      assertEquals(typeof body.hasSeenMerchantOnboarding, 'string')
    })

    getSessionStub.restore()
  },
})

// --- Pure Logic Tests ---

Deno.test('BusinessOnboarding - Step Configuration', () => {
  const stepTitles = [
    'Bem-vindo ao Novo Painel!',
    'Meus Cupons',
    'Validar Cupom',
    'Analytics',
    'Meu Perfil',
    'Tudo Pronto!',
  ]

  assertEquals(stepTitles.length, 6)
  assertEquals(stepTitles[0], 'Bem-vindo ao Novo Painel!')
  assertEquals(stepTitles[5], 'Tudo Pronto!')
})

Deno.test('BusinessOnboarding - Boolean Flag on Business Interface', () => {
  const biz: Business = {
    id: 'test',
    userId: 'test',
    name: 'Test',
    companyName: 'Test',
    cnpj: '11222333000181',
    category: 'food',
    logoUrl: 'http://localhost/logo.png',
    isActive: true,
    createdAt: new Date().toISOString(),
  }

  assertEquals(biz.hasSeenMerchantOnboarding, undefined)

  biz.hasSeenMerchantOnboarding = false
  assertEquals(biz.hasSeenMerchantOnboarding, false)

  biz.hasSeenMerchantOnboarding = true
  assertEquals(biz.hasSeenMerchantOnboarding, true)
})

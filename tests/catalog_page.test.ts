import {
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { render } from 'npm:preact-render-to-string@^6.6.3'
import { h } from 'npm:preact@^10.27.2'
import CatalogPage from '../routes/catalog.tsx'
import type { Business } from '../lib/business.ts'

Deno.test('CatalogPage component', async (t) => {
  const emptyBusinesses: Business[] = []
  const categories = ['Todos', 'Alimentação', 'Lazer']

  await t.step('renders page title and subtitle', () => {
    const html = render(
      h(CatalogPage as unknown as (props: Record<string, unknown>) => ReturnType<typeof h>, {
        data: {
          businesses: emptyBusinesses,
          categories,
          selectedCategory: 'Todos',
        },
      }),
    )
    assertExists(html.includes('Comércio Local'))
    assertExists(html.includes('Descubra benefícios exclusivos no seu bairro.'))
  })

  await t.step('renders empty state when no businesses', () => {
    const html = render(
      h(CatalogPage as unknown as (props: Record<string, unknown>) => ReturnType<typeof h>, {
        data: {
          businesses: emptyBusinesses,
          categories,
          selectedCategory: 'Todos',
        },
      }),
    )
    assertExists(html.includes('Nenhuma empresa encontrada nesta categoria.'))
  })

  await t.step('renders categories filter with Todos selected by default', () => {
    const html = render(
      h(CatalogPage as unknown as (props: Record<string, unknown>) => ReturnType<typeof h>, {
        data: {
          businesses: emptyBusinesses,
          categories,
          selectedCategory: 'Todos',
        },
      }),
    )
    assertExists(html.includes('Todos'))
    assertExists(html.includes('Alimentação'))
    assertExists(html.includes('Lazer'))
    assertExists(html.includes('/catalog'))
  })

  await t.step('renders business cards when businesses exist', () => {
    const businesses: Business[] = [
      {
        id: 'b1',
        userId: 'u1',
        name: 'Padaria do Bairro',
        companyName: 'Padaria do Bairro Ltda',
        cnpj: '12345678000195',
        category: 'Alimentação',
        description: 'Pães frescos todos os dias',
        logoUrl: '/logo-padaria.png',
        isActive: true,
        createdAt: '2024-01-01',
      },
    ]
    const html = render(
      h(CatalogPage as unknown as (props: Record<string, unknown>) => ReturnType<typeof h>, {
        data: {
          businesses,
          categories,
          selectedCategory: 'Alimentação',
        },
      }),
    )
    assertExists(html.includes('Padaria do Bairro'))
    assertExists(html.includes('Pães frescos todos os dias'))
    assertExists(html.includes('/business/b1'))
  })

  await t.step('renders bottom navigation', () => {
    const html = render(
      h(CatalogPage as unknown as (props: Record<string, unknown>) => ReturnType<typeof h>, {
        data: {
          businesses: emptyBusinesses,
          categories,
          selectedCategory: 'Todos',
        },
      }),
    )
    assertExists(html.includes('Catálogo'))
    assertExists(html.includes('Passaporte'))
    assertExists(html.includes('/passaporte'))
  })

  await t.step('shows "Solicitar serviço" button when user is a resident', () => {
    const html = render(
      h(CatalogPage as unknown as (props: Record<string, unknown>) => ReturnType<typeof h>, {
        data: {
          businesses: emptyBusinesses,
          categories,
          selectedCategory: 'Todos',
          user: { id: 'u1', email: 'test@test.com', name: 'Test', role: 'resident' },
        },
      }),
    )
    assertExists(html.includes('Solicitar serviço'))
  })

  await t.step('hides "Solicitar serviço" button when user is not logged in', () => {
    const html = render(
      h(CatalogPage as unknown as (props: Record<string, unknown>) => ReturnType<typeof h>, {
        data: {
          businesses: emptyBusinesses,
          categories,
          selectedCategory: 'Todos',
        },
      }),
    )
    assertExists(!html.includes('Solicitar serviço'))
  })

  await t.step('hides "Solicitar serviço" button when user is a business', () => {
    const html = render(
      h(CatalogPage as unknown as (props: Record<string, unknown>) => ReturnType<typeof h>, {
        data: {
          businesses: emptyBusinesses,
          categories,
          selectedCategory: 'Todos',
          user: { id: 'u2', email: 'biz@test.com', name: 'Biz', role: 'business' },
        },
      }),
    )
    assertExists(!html.includes('Solicitar serviço'))
  })
})

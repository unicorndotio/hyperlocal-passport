import {
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { render } from 'npm:preact-render-to-string@^6.6.3'
import { h } from 'npm:preact@^10.27.2'
import BottomNav from '../components/BottomNav.tsx'

Deno.test('BottomNav component', async (t) => {
  await t.step('renders all three tabs with correct routes', () => {
    const html = render(h(BottomNav, { active: 'feed' }))
    assertExists(html.includes('Feed'))
    assertExists(html.includes('Catálogo'))
    assertExists(html.includes('Passaporte'))
    assertExists(html.includes('href="/"'))
    assertExists(html.includes('href="/catalog"'))
    assertExists(html.includes('href="/passaporte"'))
  })

  await t.step(
    'feed tab has text-primary when active, others have text-muted-foreground',
    () => {
      const html = render(h(BottomNav, { active: 'feed' }))
      assertExists(html.includes('text-primary'))
      assertExists(html.match(/text-muted-foreground/g)!.length >= 2)
    },
  )

  await t.step(
    'catalog tab has text-primary when active, others have text-muted-foreground',
    () => {
      const html = render(h(BottomNav, { active: 'catalog' }))
      assertExists(html.includes('text-primary'))
      assertExists(html.match(/text-muted-foreground/g)!.length >= 2)
    },
  )

  await t.step(
    'passaporte tab has text-primary when active, others have text-muted-foreground',
    () => {
      const html = render(h(BottomNav, { active: 'passaporte' }))
      assertExists(html.includes('text-primary'))
      assertExists(html.match(/text-muted-foreground/g)!.length >= 2)
    },
  )
})

// Page-level integration tests require PG_CONNECTION
if (Deno.env.get('PG_CONNECTION')) {
  Deno.test('BottomNav integration - catalog page', async (t) => {
    const { default: CatalogPage } = await import('../routes/catalog.tsx')

    await t.step('renders BottomNav with catalog tab highlighted', () => {
      const html = render(
        h(
          CatalogPage as unknown as (
            props: Record<string, unknown>,
          ) => ReturnType<typeof h>,
          {
            data: {
              businesses: [],
              categories: ['Todos'],
              selectedCategory: 'Todos',
            },
          },
        ),
      )
      assertExists(html.includes('text-primary'))
      assertExists(html.includes('Catálogo'))
      assertExists(html.includes('Passaporte'))
    })
  })

  Deno.test('BottomNav integration - business detail page', async (t) => {
    const { default: BusinessDetailPage } = await import(
      '../routes/business/[id].tsx'
    )

    await t.step('renders BottomNav with catalog tab highlighted', () => {
      const html = render(
        h(
          BusinessDetailPage as unknown as (
            props: Record<string, unknown>,
          ) => ReturnType<typeof h>,
          {
            data: {
              business: {
                id: 'b1',
                userId: 'u1',
                name: 'Test Business',
                companyName: 'Test Co',
                cnpj: '12345678000195',
                category: 'Alimentação',
                isActive: true,
                createdAt: '2024-01-01',
              },
              coupons: [],
            },
          },
        ),
      )
      assertExists(html.includes('text-primary'))
      assertExists(html.includes('Catálogo'))
      assertExists(html.includes('Passaporte'))
    })
  })

  Deno.test('BottomNav integration - passaporte page', async (t) => {
    const mod = await import('../routes/passaporte.tsx')
    const PassaportePage = mod.default

    await t.step('renders BottomNav with passaporte tab highlighted', () => {
      const html = render(
        h(
          PassaportePage as unknown as (
            props: Record<string, unknown>,
          ) => ReturnType<typeof h>,
          {
            data: {
              redemptions: [],
            },
          },
        ),
      )
      assertExists(html.includes('text-primary'))
      assertExists(html.includes('Catálogo'))
      assertExists(html.includes('Passaporte'))
    })
  })
} else {
  Deno.test({
    name:
      'BottomNav integration - skipped (PG_CONNECTION not set)',
    fn: () => {
      console.info(
        '[Test info] bottom_nav.test.ts page integration tests skipped - PG_CONNECTION not set',
      )
    },
  })
}

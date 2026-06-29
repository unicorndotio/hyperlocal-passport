import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { render } from 'npm:preact-render-to-string@^6.6.3'
import { h } from 'npm:preact@^10.27.2'
import { FeedEventCard } from '../components/FeedEventCard.tsx'
import type { FeedEvent } from '../lib/feed.ts'

const baseEvent: Omit<FeedEvent, 'id' | 'type' | 'title'> = {
  createdAt: Date.now(),
  description: '',
  imageUrl: undefined,
  businessId: undefined,
  businessName: undefined,
  amountCents: undefined,
}

// ─── Unit tests: FeedEventCard component ────────────────────────────────────

Deno.test('FeedEventCard component', async (t) => {
  await t.step(
    'renders merchant_post card with business name, title, and body',
    () => {
      const event: FeedEvent = {
        ...baseEvent,
        id: 'mp-1',
        type: 'merchant_post',
        title: 'Promoção Especial',
        description: '50% off em todos os pães!',
        businessId: 'b-1',
        businessName: 'Padaria do João',
      }
      const html = render(h(FeedEventCard, { event }))
      assertExists(html.includes('Padaria do João'))
      assertExists(html.includes('Promoção Especial'))
      assertExists(html.includes('50% off em todos os pães!'))
    },
  )

  await t.step(
    'renders merchant_post card with lazy-loaded image',
    () => {
      const event: FeedEvent = {
        ...baseEvent,
        id: 'mp-img',
        type: 'merchant_post',
        title: 'Com imagem',
        description: 'Descrição da imagem',
        businessId: 'b-1',
        businessName: 'Loja Teste',
        imageUrl: 'https://example.com/img.jpg',
      }
      const html = render(h(FeedEventCard, { event }))
      assertExists(html.includes('loading='))
      assertExists(html.includes('https://example.com/img.jpg'))
    },
  )

  await t.step(
    'renders merchant_post card without image when imageUrl is undefined',
    () => {
      const event: FeedEvent = {
        ...baseEvent,
        id: 'mp-noimg',
        type: 'merchant_post',
        title: 'Sem imagem',
        description: 'Apenas texto',
        businessName: 'Loja Teste',
      }
      const html = render(h(FeedEventCard, { event }))
      assertExists(html.includes('Apenas texto'))
      assertExists(!html.includes('<img'))
    },
  )

  await t.step(
    'renders coupon_released card with coupon badge and title',
    () => {
      const event: FeedEvent = {
        ...baseEvent,
        id: 'cr-1',
        type: 'coupon_released',
        title: '10% de desconto',
        businessId: 'b-2',
        businessName: 'Mercado Central',
      }
      const html = render(h(FeedEventCard, { event }))
      assertExists(html.includes('Novo cupom!'))
      assertExists(html.includes('Mercado Central'))
      assertExists(html.includes('10% de desconto'))
    },
  )

  await t.step(
    'renders savings_notice card with savings amount highlight',
    () => {
      const event: FeedEvent = {
        ...baseEvent,
        id: 'sn-1',
        type: 'savings_notice',
        title: 'Você economizou!',
        description: 'Você economizou na Padaria do João',
        businessId: 'b-1',
        businessName: 'Padaria do João',
        amountCents: 2000,
      }
      const html = render(h(FeedEventCard, { event }))
      assertExists(html.includes('Economia'))
      assertExists(html.includes('Padaria do João'))
      assertExists(html.includes('R$ 20,00'))
    },
  )

  await t.step(
    'renders savings_notice card when amountCents is undefined',
    () => {
      const event: FeedEvent = {
        ...baseEvent,
        id: 'sn-2',
        type: 'savings_notice',
        title: 'Você economizou!',
        description: 'Você economizou na Loja',
        businessName: 'Loja',
      }
      const html = render(h(FeedEventCard, { event }))
      assertExists(html.includes('Você economizou'))
      assertExists(html.includes('Loja'))
    },
  )

  await t.step(
    'renders admin_announcement card with announcement styling',
    () => {
      const event: FeedEvent = {
        ...baseEvent,
        id: 'aa-1',
        type: 'admin_announcement',
        title: 'Novidades no bairro',
        description: 'Em breve novos parceiros!',
      }
      const html = render(h(FeedEventCard, { event }))
      assertExists(html.includes('Aviso'))
      assertExists(html.includes('Novidades no bairro'))
      assertExists(html.includes('Em breve novos parceiros!'))
    },
  )

  await t.step('returns null for unknown event type', () => {
    const event: FeedEvent = {
      ...baseEvent,
      id: 'unknown',
      type: 'unknown_type' as FeedEvent['type'],
      title: 'Unknown',
    }
    const html = render(h(FeedEventCard, { event }))
    assertEquals(html, '')
  })
})



// ─── Integration tests: handler with database ────────────────────────────────

if (Deno.env.get('PG_CONNECTION')) {
  const { db } = await import('../lib/db.ts')
  const { sql } = await import('drizzle-orm')
  const { refreshFeedView } = await import('../lib/feed.ts')

  Deno.test({
    name: 'Feed page handler - GET / handler integration',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async (t) => {
      const truncate = async () => {
        await db.execute(
          sql`TRUNCATE TABLE merchant_posts, coupons, transactions, redemptions, businesses, "user" RESTART IDENTITY CASCADE`,
        )
      }

      await t.step('returns empty events when no feed data', async () => {
        await truncate()
        await refreshFeedView(db)

        const { handler } = await import('../routes/index.tsx')
        const req = new Request('http://localhost/')
        const ctx = { req, state: { user: null, session: null } }
        const res = await handler.GET(
          ctx as Parameters<typeof handler.GET>[0],
        )

        if (res instanceof Response) {
          throw new Error('Expected page data, got Response')
        }

        assertEquals(Array.isArray(res.data.events), true)
        assertEquals(res.data.events.length, 0)
        assertEquals(res.data.cursor, null)
      })

      await t.step(
        'returns events from feed when data exists',
        async () => {
          await truncate()

          await db.execute(sql`
            INSERT INTO "user" (id, email, name) VALUES ('u-feed-page', 'feedpage@test.com', 'Feed Page User')
          `)
          await db.execute(sql`
            INSERT INTO businesses (id, user_id, name, company_name, cnpj, category, logo_url, is_active) VALUES
            ('b-feed-page', 'u-feed-page', 'Feed Page Biz', 'Feed Page Biz Co', 'CNPJ-feed-page', 'test', '/logo.png', true)
          `)
          await db.execute(sql`
            INSERT INTO merchant_posts (id, business_id, title, body, is_visible) VALUES
            ('a0000000-0000-0000-0000-000000000301'::uuid, 'b-feed-page', 'Feed Post', 'Feed Body', true)
          `)
          await refreshFeedView(db)

          const { handler } = await import('../routes/index.tsx')
          const req = new Request('http://localhost/')
          const ctx = { req, state: { user: null, session: null } }
          const res = await handler.GET(
            ctx as Parameters<typeof handler.GET>[0],
          )

          if (res instanceof Response) {
            throw new Error('Expected page data, got Response')
          }

          assertEquals(res.data.events.length, 1)
          assertEquals(res.data.events[0].title, 'Feed Post')
          assertEquals(res.data.events[0].businessName, 'Feed Page Biz')
          assertEquals(typeof res.data.cursor, 'string')
        },
      )

      await t.step(
        'passes user from ctx.state.user to page data',
        async () => {
          await truncate()
          await refreshFeedView(db)

          const { handler } = await import('../routes/index.tsx')
          const mockUser = {
            id: 'u-test-feed',
            email: 'test@feed.com',
            name: 'Test Feed User',
            role: 'resident',
            status: 'approved',
          }
          const req = new Request('http://localhost/')
          const ctx = {
            req,
            state: {
              user: mockUser,
              session: {
                id: 'sess-test',
                userId: 'u-test-feed',
              },
            },
          }
          const res = await handler.GET(
            ctx as Parameters<typeof handler.GET>[0],
          )

          if (res instanceof Response) {
            throw new Error('Expected page data, got Response')
          }

          assertEquals(res.data.user, mockUser)
        },
      )
    },
  })
} else {
  Deno.test('Feed page handler - Skipped (PG_CONNECTION not set)', () => {
    console.info(
      '[Test info] feed_page.test.ts handler tests skipped - PG_CONNECTION not set',
    )
  })
}

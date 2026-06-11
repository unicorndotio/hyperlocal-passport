import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { act } from 'npm:preact@^10.27.2/test-utils'
import { h, render } from 'npm:preact@^10.27.2'
import { renderToString } from 'npm:preact-render-to-string@^6.5.13'
import { setupDom } from './dom_setup.ts'

Deno.test('BusinessManager - renders loading state on initial render', async () => {
  const html = renderToString(
    h((await import('../../islands/BusinessManager.tsx')).default, {}),
  )
  assertEquals(html.includes('Carregando dados das empresas...'), true)
})

Deno.test('BusinessManager - async: renders business list after fetch', async () => {
  const ctx = setupDom()
  const origFetch = globalThis.fetch
  let fetchCount = 0
  globalThis.fetch = (input: RequestInfo | URL) => {
    fetchCount++
    const url = typeof input === 'string'
      ? input
      : (input as Request).url || (input as URL).href
    if (url?.includes('/api/businesses')) {
      return Promise.resolve(
        new Response(JSON.stringify([]), {
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    }
    if (url?.includes('/api/admin/users')) {
      return Promise.resolve(
        new Response(JSON.stringify([]), {
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    }
    return Promise.resolve(new Response('Not Found', { status: 404 }))
  }

  const { default: BusinessManager } = await import(
    '../../islands/BusinessManager.tsx'
  )
  const root = document.createElement('div')
  document.body.appendChild(root)

  act(() => {
    render(h(BusinessManager, {}), root)
  })
  await act(async () => {})
  await act(async () => {})

  assertEquals(fetchCount, 2)
  ctx.cleanup()
  globalThis.fetch = origFetch
})

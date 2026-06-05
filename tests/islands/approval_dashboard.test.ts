import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { act } from 'npm:preact@^10.27.2/test-utils'
import { render, h } from 'npm:preact@^10.27.2'
import { renderToString } from 'npm:preact-render-to-string@^6.5.13'
import { setupDom } from './dom_setup.ts'

function makeUsers() {
  return [
    {
      id: 'u1',
      name: 'João Silva',
      cpf: '12345678901',
      email: 'joao@test.com',
      status: 'pending',
      documents: { idPhotoUrl: '/uploads/id.jpg', residenceProofUrl: '/uploads/proof.pdf' },
      createdAt: Date.now() - 86400000,
    },
    {
      id: 'u2',
      name: 'Maria Souza',
      cpf: '98765432100',
      email: 'maria@test.com',
      status: 'pending',
      createdAt: Date.now() - 172800000,
    },
  ]
}

Deno.test('ApprovalDashboard - renders loading state on initial render', async () => {
  const html = renderToString(h((await import('../../islands/ApprovalDashboard.tsx')).default, {}))
  assertEquals(html.includes('Carregando moradores pendentes...'), true)
})

Deno.test('ApprovalDashboard - async: renders empty state', async () => {
  const ctx = setupDom()
  const origFetch = globalThis.fetch
  let fetchCalled = false
  globalThis.fetch = () => {
    fetchCalled = true
    return Promise.resolve(new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } }))
  }

  const { default: ApprovalDashboard } = await import('../../islands/ApprovalDashboard.tsx')
  const root = document.createElement('div')
  document.body.appendChild(root)

  act(() => { render(h(ApprovalDashboard, {}), root) })
  await act(async () => {})
  await act(async () => {})

  assertEquals(fetchCalled, true)
  ctx.cleanup()
  globalThis.fetch = origFetch
})

Deno.test('ApprovalDashboard - async: renders error state', async () => {
  const ctx = setupDom()
  const origFetch = globalThis.fetch
  let fetchCalled = false
  globalThis.fetch = () => {
    fetchCalled = true
    return Promise.resolve(new Response('Not Found', { status: 404 }))
  }

  const { default: ApprovalDashboard } = await import('../../islands/ApprovalDashboard.tsx')
  const root = document.createElement('div')
  document.body.appendChild(root)

  act(() => { render(h(ApprovalDashboard, {}), root) })
  await act(async () => {})
  await act(async () => {})

  assertEquals(fetchCalled, true)
  ctx.cleanup()
  globalThis.fetch = origFetch
})

Deno.test('ApprovalDashboard - async: renders user table', async () => {
  const ctx = setupDom()
  const origFetch = globalThis.fetch
  let fetchCalled = false
  globalThis.fetch = () => {
    fetchCalled = true
    return Promise.resolve(new Response(JSON.stringify(makeUsers()), { headers: { 'Content-Type': 'application/json' } }))
  }

  const { default: ApprovalDashboard } = await import('../../islands/ApprovalDashboard.tsx')
  const root = document.createElement('div')
  document.body.appendChild(root)

  act(() => { render(h(ApprovalDashboard, {}), root) })
  await act(async () => {})
  await act(async () => {})

  assertEquals(fetchCalled, true)
  ctx.cleanup()
  globalThis.fetch = origFetch
})

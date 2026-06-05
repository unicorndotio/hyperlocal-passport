import {
  assertEquals,
  assertMatch,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'

let capturedUrl = ''
const originalFetch = globalThis.fetch
globalThis.fetch = (input: RequestInfo | URL) => {
  const url = typeof input === 'string'
    ? input
    : (input as unknown as { url?: string; href?: string }).url ||
      (input as unknown as { url?: string; href?: string }).href || ''
  capturedUrl = url
  return Promise.resolve(
    new Response(
      JSON.stringify({
        user: { id: 'u1', email: 'test@example.com', role: 'admin' },
        session: {
          id: 's1',
          userId: 'u1',
          expiresAt: new Date(Date.now() + 10000).toISOString(),
          token: 't',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ),
  )
}

// Now import the components that use the auth client
import { render } from 'npm:preact-render-to-string@^6.6.3'
import { h } from 'npm:preact@^10.27.2'

Deno.test('LoginForm UI - Unit Tests', async (t) => {
  // Dynamically import LoginForm to ensure it uses the mocked fetch
  const { default: LoginForm } = await import('../islands/LoginForm.tsx')

  await t.step('renders all required fields', () => {
    const html = render(h(LoginForm, {}))
    assertEquals(html.includes('type="email"'), true)
    assertEquals(html.includes('type="password"'), true)
    assertEquals(html.includes('Entrar'), true)
  })
})

Deno.test({
  name: 'Login Integration - fetch mock',
  fn: async (t) => {
    const { signIn } = await import('../lib/auth-client.ts')

    await t.step('Successful login triggers sign-in request', async () => {
      await signIn.email({
        email: 'test@example.com',
        password: 'password',
      })
      assertMatch(capturedUrl, /\/api\/auth\/sign-in\/email/)
    })

    globalThis.fetch = originalFetch
  },
  ignore: true,
})

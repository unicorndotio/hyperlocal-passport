import {
  assertEquals,
  assertMatch,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { renderToString } from 'npm:preact-render-to-string@^6.5.13'
import { h } from 'npm:preact@^10.27.2'

Deno.test('LoginForm - renders all required fields', async () => {
  const origFetch = globalThis.fetch
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(JSON.stringify({ user: null, session: null }), {
        status: 200,
      }),
    )

  const { default: LoginForm } = await import('../islands/LoginForm.tsx')
  const html = renderToString(h(LoginForm, {}))
  assertEquals(html.includes('type="email"'), true)
  assertEquals(html.includes('type="password"'), true)
  assertEquals(html.includes('Entrar'), true)

  globalThis.fetch = origFetch
})

Deno.test({
  name: 'Login Integration - signIn.email sends correct request',
  fn: async () => {
    let capturedUrl = ''
    const origFetch = globalThis.fetch
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

    const { signIn } = await import('../lib/auth-client.ts')
    await signIn.email({
      email: 'test@example.com',
      password: 'password',
    })
    assertMatch(capturedUrl, /\/api\/auth\/sign-in\/email/)
    globalThis.fetch = origFetch
  },
  ignore: true,
})

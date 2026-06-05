import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { renderToString } from 'npm:preact-render-to-string@^6.5.13'
import { h } from 'npm:preact@^10.27.2'

Deno.test('LoginForm - renders all form fields and register link', async () => {
  const { default: LoginForm } = await import('../../islands/LoginForm.tsx')
  const html = renderToString(h(LoginForm, {}))
  assertEquals(html.includes('type="email"'), true)
  assertEquals(html.includes('type="password"'), true)
  assertEquals(html.includes('Entrar'), true)
  assertEquals(html.includes('Cadastre-se'), true)
  assertEquals(html.includes('/register'), true)
  assertEquals(html.includes('E-mail'), true)
  assertEquals(html.includes('Senha'), true)
  assertEquals(html.includes('Acesse sua conta do Passaporte Local'), true)
})

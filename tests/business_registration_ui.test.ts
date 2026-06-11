import {
  assertEquals,
  assertStringIncludes,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { h } from 'npm:preact@^10.27.2'
import { renderToString } from 'npm:preact-render-to-string@^6.5.13'
import {
  formatCnpjDisplay,
  isValidCnpj,
  normalizeCnpj,
  validateEmail,
  validatePassword,
} from '../islands/BusinessRegistrationForm.tsx'

// ── Validation Logic Tests ──────────────────────────────────────────

Deno.test('BusinessRegistrationForm - CNPJ helpers', async (t) => {
  await t.step('normalizeCnpj strips special characters', () => {
    assertEquals(normalizeCnpj('11.222.333/0001-81'), '11222333000181')
    assertEquals(normalizeCnpj('60316817000103'), '60316817000103')
  })

  await t.step('formatCnpjDisplay formats CNPJ', () => {
    assertEquals(formatCnpjDisplay('11222333000181'), '11.222.333/0001-81')
  })

  await t.step('isValidCnpj detects valid/invalid CNPJs', () => {
    assertEquals(isValidCnpj('11.222.333/0001-81'), true)
    assertEquals(isValidCnpj('60.316.817/0001-03'), true)
    assertEquals(isValidCnpj('11.222.333/0001-00'), false)
    assertEquals(isValidCnpj('00000000000000'), false)
    assertEquals(isValidCnpj('123'), false)
  })
})

Deno.test('BusinessRegistrationForm - email validation', async (t) => {
  await t.step('accepts valid email', () => {
    assertEquals(validateEmail('test@example.com'), true)
    assertEquals(validateEmail('user+tag@domain.com.br'), true)
  })

  await t.step('rejects invalid email', () => {
    assertEquals(validateEmail(''), false)
    assertEquals(validateEmail('not-an-email'), false)
    assertEquals(validateEmail('@domain.com'), false)
    assertEquals(validateEmail('user@'), false)
  })
})

Deno.test('BusinessRegistrationForm - password validation', async (t) => {
  await t.step('accepts password with 8+ characters', () => {
    assertEquals(validatePassword('12345678'), true)
    assertEquals(validatePassword('SenhaForte!@#'), true)
  })

  await t.step('rejects password with fewer than 8 characters', () => {
    assertEquals(validatePassword(''), false)
    assertEquals(validatePassword('1234567'), false)
  })
})

// ── Rendering Tests ─────────────────────────────────────────────────

Deno.test('BusinessRegistrationForm - renders all required form fields', async () => {
  const { default: BusinessRegistrationForm } = await import(
    '../islands/BusinessRegistrationForm.tsx'
  )
  const html = renderToString(h(BusinessRegistrationForm, {}))

  assertStringIncludes(html, 'Nome fantasia')
  assertStringIncludes(html, 'Razão social')
  assertStringIncludes(html, 'CNPJ')
  assertStringIncludes(html, 'E-mail')
  assertStringIncludes(html, 'Senha')
  assertStringIncludes(html, 'Cadastrar Negócio')
})

Deno.test('BusinessRegistrationForm - renders link to login', async () => {
  const { default: BusinessRegistrationForm } = await import(
    '../islands/BusinessRegistrationForm.tsx'
  )
  const html = renderToString(h(BusinessRegistrationForm, {}))

  assertStringIncludes(html, 'Faça login')
  assertStringIncludes(html, '/login')
})

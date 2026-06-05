import { assertEquals, assertExists } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { cn, formatBRL, json } from '../../lib/utils.ts'

Deno.test('cn utility', async (t) => {
  await t.step('merges class names', () => {
    const result = cn('px-4', 'py-2')
    assertExists(result.includes('px-4'))
    assertExists(result.includes('py-2'))
  })

  await t.step('handles conditional classes', () => {
    const result = cn('base', false && 'hidden', 'visible')
    assertExists(result.includes('base'))
    assertExists(result.includes('visible'))
    assertEquals(result.includes('hidden'), false)
  })

  await t.step('resolves tailwind conflicts via twMerge', () => {
    const result = cn('px-4', 'px-2')
    assertEquals(result, 'px-2')
  })

  await t.step('handles empty input', () => {
    assertEquals(cn(), '')
  })
})

Deno.test('formatBRL utility', async (t) => {
  await t.step('formats cents to BRL currency string', () => {
    assertEquals(formatBRL(1500), 'R$\u00a015,00')
  })

  await t.step('formats zero', () => {
    assertEquals(formatBRL(0), 'R$\u00a00,00')
  })

  await t.step('formats large numbers', () => {
    assertEquals(formatBRL(9999999), 'R$\u00a099.999,99')
  })

  await t.step('formats negative values', () => {
    assertEquals(formatBRL(-1500), '-R$\u00a015,00')
  })

  await t.step('rounds decimal cents', () => {
    assertEquals(formatBRL(100), 'R$\u00a01,00')
    assertEquals(formatBRL(101), 'R$\u00a01,01')
  })
})

Deno.test('json utility', async (t) => {
  await t.step('returns Response with JSON body', async () => {
    const res = json({ message: 'ok' }, 200)
    assertEquals(res.status, 200)
    assertEquals(res.headers.get('Content-Type'), 'application/json')
    const body = await res.json()
    assertEquals(body.message, 'ok')
  })

  await t.step('returns Response with custom status', () => {
    const res = json({ error: 'not found' }, 404)
    assertEquals(res.status, 404)
  })

  await t.step('handles array bodies', async () => {
    const res = json([1, 2, 3], 200)
    const body = await res.json()
    assertEquals(body.length, 3)
  })
})

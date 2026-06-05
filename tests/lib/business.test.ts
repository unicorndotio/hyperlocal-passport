import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { formatCnpjDisplay } from '../../lib/business.ts'

Deno.test('formatCnpjDisplay', async (t) => {
  await t.step('returns raw digits for 1-2 digit input', () => {
    assertEquals(formatCnpjDisplay('1'), '1')
    assertEquals(formatCnpjDisplay('12'), '12')
  })

  await t.step('formats 3-5 digit input with single dot', () => {
    assertEquals(formatCnpjDisplay('123'), '12.3')
    assertEquals(formatCnpjDisplay('12345'), '12.345')
  })

  await t.step('formats 6-8 digit input with two dots', () => {
    assertEquals(formatCnpjDisplay('123456'), '12.345.6')
    assertEquals(formatCnpjDisplay('12345678'), '12.345.678')
  })

  await t.step('formats 9-12 digit input with dots and slash', () => {
    assertEquals(formatCnpjDisplay('123456789'), '12.345.678/9')
    assertEquals(formatCnpjDisplay('123456789012'), '12.345.678/9012')
  })

  await t.step('formats full 14-digit CNPJ with dash', () => {
    assertEquals(formatCnpjDisplay('12345678901234'), '12.345.678/9012-34')
    assertEquals(formatCnpjDisplay('12345678000190'), '12.345.678/0001-90')
  })

  await t.step('strips non-digit characters before formatting', () => {
    assertEquals(formatCnpjDisplay('12.345.678/0001-90'), '12.345.678/0001-90')
  })

  await t.step('slices input beyond 14 digits', () => {
    assertEquals(formatCnpjDisplay('12345678901234567890'), '12.345.678/9012-34')
  })
})

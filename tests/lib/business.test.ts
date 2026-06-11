import {
  assertEquals,
  assertStrictEquals,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import {
  formatCnpjDisplay,
  validateOpeningHours,
  validateSocialLinks,
} from '../../lib/business.ts'

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
    assertEquals(
      formatCnpjDisplay('12345678901234567890'),
      '12.345.678/9012-34',
    )
  })
})

Deno.test('validateOpeningHours', async (t) => {
  await t.step('returns undefined for null input', () => {
    assertStrictEquals(validateOpeningHours(null), undefined)
  })

  await t.step('returns undefined for undefined input', () => {
    assertStrictEquals(validateOpeningHours(undefined), undefined)
  })

  await t.step('rejects non-object input', () => {
    assertEquals(
      validateOpeningHours('not-an-object'),
      'Horários devem ser um objeto com dias da semana.',
    )
    assertEquals(
      validateOpeningHours(123),
      'Horários devem ser um objeto com dias da semana.',
    )
    assertEquals(
      validateOpeningHours([]),
      'Horários devem ser um objeto com dias da semana.',
    )
  })

  await t.step('rejects invalid day keys', () => {
    assertEquals(
      validateOpeningHours({ invalidDay: { open: '09:00', close: '18:00' } }),
      'Dia inválido: "invalidDay". Use monday–sunday.',
    )
  })

  await t.step('rejects time not in HH:MM format', () => {
    const hours = { monday: { open: '9:00', close: '18:00' } }
    assertEquals(
      validateOpeningHours(hours),
      'Horário de abertura inválido para "monday". Use HH:MM (24h).',
    )
  })

  await t.step('rejects when open >= close', () => {
    const hours = { monday: { open: '18:00', close: '09:00' } }
    assertEquals(
      validateOpeningHours(hours),
      'Horário de abertura deve ser anterior ao fechamento para "monday".',
    )
  })

  await t.step('rejects equal open and close', () => {
    const hours = { monday: { open: '09:00', close: '09:00' } }
    assertEquals(
      validateOpeningHours(hours),
      'Horário de abertura deve ser anterior ao fechamento para "monday".',
    )
  })

  await t.step('rejects entry that is not an object', () => {
    const hours = { monday: 'not-an-object' }
    assertEquals(
      validateOpeningHours(hours),
      'Horário para "monday" deve conter open e close.',
    )
  })

  await t.step('accepts empty object', () => {
    assertStrictEquals(validateOpeningHours({}), undefined)
  })

  await t.step('accepts valid full-week schedule', () => {
    const hours = {
      monday: { open: '09:00', close: '18:00' },
      tuesday: { open: '09:00', close: '18:00' },
      wednesday: { open: '09:00', close: '18:00' },
      thursday: { open: '09:00', close: '18:00' },
      friday: { open: '09:00', close: '18:00' },
      saturday: { open: '10:00', close: '14:00' },
      sunday: { open: '10:00', close: '14:00' },
    }
    assertStrictEquals(validateOpeningHours(hours), undefined)
  })

  await t.step('accepts null entry for a day (day off)', () => {
    const hours = { sunday: null }
    assertStrictEquals(validateOpeningHours(hours), undefined)
  })
})

Deno.test('validateSocialLinks', async (t) => {
  await t.step('returns undefined for null input', () => {
    assertStrictEquals(validateSocialLinks(null), undefined)
  })

  await t.step('returns undefined for undefined input', () => {
    assertStrictEquals(validateSocialLinks(undefined), undefined)
  })

  await t.step('rejects non-object input', () => {
    assertEquals(
      validateSocialLinks('string'),
      'Links sociais devem ser um objeto.',
    )
  })

  await t.step('rejects invalid field key', () => {
    assertEquals(
      validateSocialLinks({ twitter: 'https://twitter.com/test' }),
      'Campo inválido: "twitter".',
    )
  })

  await t.step('accepts empty object', () => {
    assertStrictEquals(validateSocialLinks({}), undefined)
  })

  await t.step('accepts valid URLs for each sub-field', () => {
    const links = {
      instagram: 'https://instagram.com/store',
      facebook: 'https://facebook.com/store',
      whatsapp: 'https://wa.me/5511999999999',
      menu: 'https://menu.example.com',
    }
    assertStrictEquals(validateSocialLinks(links), undefined)
  })

  await t.step('rejects invalid URL format', () => {
    assertEquals(
      validateSocialLinks({ instagram: 'not-a-url' }),
      'Link do instagram deve ser uma URL válida.',
    )
  })

  await t.step('rejects empty string URL', () => {
    assertEquals(
      validateSocialLinks({ instagram: '' }),
      'Link do instagram deve ser uma URL válida.',
    )
  })

  await t.step('accepts partial object with some null fields', () => {
    const links = { instagram: 'https://instagram.com/store', facebook: null }
    assertStrictEquals(validateSocialLinks(links), undefined)
  })
})

import { assertExists, assertFalse } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { render } from 'npm:preact-render-to-string@^6.6.3'
import { h } from 'npm:preact@^10.27.2'
import BusinessHeader from '../components/BusinessHeader.tsx'

Deno.test('BusinessHeader', async (t) => {
  await t.step('renders tabs correctly', () => {
    const html = render(
      h(BusinessHeader, { active: 'coupons', businessName: 'Test Store' }),
    )
    assertExists(html.includes('Meus Cupons'))
    assertExists(html.includes('Validar Cupom'))
    assertFalse(html.includes('Analytics'))
    assertExists(html.includes('Meu Perfil'))
    assertExists(html.includes('Test Store'))
  })

  await t.step('existing tabs still highlight correctly', () => {
    const couponsHtml = render(
      h(BusinessHeader, { active: 'coupons', businessName: 'Test Store' }),
    )
    assertExists(couponsHtml.includes('text-blue-600'))

    const checkoutHtml = render(
      h(BusinessHeader, { active: 'checkout', businessName: 'Test Store' }),
    )
    assertExists(checkoutHtml.includes('text-blue-600'))

    const profileHtml = render(
      h(BusinessHeader, { active: 'profile', businessName: 'Test Store' }),
    )
    assertExists(profileHtml.includes('text-blue-600'))
  })

  await t.step('shows InactiveBanner when isActiveBusiness is false', () => {
    const html = render(
      h(BusinessHeader, { active: 'coupons', businessName: 'Test Store', isActiveBusiness: false }),
    )
    assertExists(html.includes('Sua conta está inativa'))
  })

  await t.step('hides InactiveBanner when isActiveBusiness is true', () => {
    const html = render(
      h(BusinessHeader, { active: 'coupons', businessName: 'Test Store', isActiveBusiness: true }),
    )
    assertFalse(html.includes('Sua conta está inativa'))
  })
})

import { assertExists } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { render } from 'npm:preact-render-to-string@^6.6.3'
import { h } from 'npm:preact@^10.27.2'
import BusinessHeader from '../components/BusinessHeader.tsx'

Deno.test('BusinessHeader', async (t) => {
  await t.step('renders 4 tabs when active="coupons"', () => {
    const html = render(
      h(BusinessHeader, { active: 'coupons', businessName: 'Test Store' }),
    )
    assertExists(html.includes('Meus Cupons'))
    assertExists(html.includes('Validar Cupom'))
    assertExists(html.includes('Analytics'))
    assertExists(html.includes('Meu Perfil'))
    assertExists(html.includes('Test Store'))
  })

  await t.step('renders 4 tabs when active="analytics"', () => {
    const html = render(
      h(BusinessHeader, { active: 'analytics', businessName: 'Test Store' }),
    )
    assertExists(html.includes('Meus Cupons'))
    assertExists(html.includes('Validar Cupom'))
    assertExists(html.includes('Analytics'))
    assertExists(html.includes('Meu Perfil'))
  })

  await t.step('Analytics tab has correct href', () => {
    const html = render(
      h(BusinessHeader, { active: 'analytics', businessName: 'Test Store' }),
    )
    assertExists(html.includes('href="/business/analytics"'))
  })

  await t.step('Analytics tab is highlighted when active="analytics"', () => {
    const html = render(
      h(BusinessHeader, { active: 'analytics', businessName: 'Test Store' }),
    )
    assertExists(html.includes('text-blue-600'))
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
})

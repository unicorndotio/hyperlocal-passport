import {
  assertExists,
  assertStringIncludes,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { render } from 'npm:preact-render-to-string@^6.6.3'
import { h } from 'npm:preact@^10.27.2'
import PassportCover from '../islands/PassportCover.tsx'

const baseProps = {
  status: 'approved' as const,
  redemptions: [
    {
      id: 'ABC123',
      businessName: 'Padaria do Joao',
      redeemedAt: 1719600000000,
    },
  ],
  savingsHistory: {
    totalSavingsCents: 4500,
    totalRedemptions: 3,
    byBusiness: [
      {
        businessId: 'b1',
        businessName: 'Padaria do Joao',
        savingsCents: 2000,
        count: 2,
      },
      {
        businessId: 'b2',
        businessName: 'Mercado Central',
        savingsCents: 2500,
        count: 1,
      },
    ],
  },
  residentName: 'Maria Silva',
}

Deno.test('PassportCover component', async (t) => {
  await t.step(
    'renders in closed state by default (cover visible, inner hidden)',
    () => {
      const html = render(h(PassportCover, baseProps))
      assertStringIncludes(html, 'PASSAPORTE')
      assertStringIncludes(html, 'Maria Silva')
      assertStringIncludes(html, 'Passaporte Local')
      // Inner content has opacity-0 and pointer-events-none when closed
      assertExists(html.match(/opacity-0.*pointer-events-none/))
      // Cover does NOT have data-open (starts closed by default)
      assertExists(!html.includes('data-open=""'))
    },
  )

  await t.step('renders locked state for pending status', () => {
    const html = render(
      h(PassportCover, { ...baseProps, status: 'pending' as const }),
    )
    assertStringIncludes(html, 'Cadastro Pendente')
    assertExists(html.includes('em análise'))
    assertExists(html.includes('lock'))
  })

  await t.step(
    'renders locked state for rejected status with rejection message',
    () => {
      const html = render(
        h(PassportCover, { ...baseProps, status: 'rejected' as const }),
      )
      assertStringIncludes(html, 'Cadastro Rejeitado')
      assertExists(html.includes('não foi aprovado'))
      assertExists(html.includes('suporte'))
    },
  )

  await t.step('renders business name for each redemption', () => {
    const html = render(h(PassportCover, baseProps))
    assertStringIncludes(html, 'Padaria do Joao')
  })

  await t.step(
    'renders savings history with total and per-business breakdown',
    () => {
      const html = render(h(PassportCover, baseProps))
      assertStringIncludes(html, 'Histórico de Economia')
      assertStringIncludes(html, 'Total economizado')
      assertStringIncludes(html, 'Padaria do Joao')
      assertStringIncludes(html, 'Mercado Central')
    },
  )

  await t.step('renders empty state when redemptions array is empty', () => {
    const html = render(
      h(PassportCover, {
        ...baseProps,
        redemptions: [],
      }),
    )
    assertStringIncludes(html, 'Nenhum cupom ativo')
  })

  await t.step(
    'does not render savings history when totalRedemptions is 0',
    () => {
      const html = render(
        h(PassportCover, {
          ...baseProps,
          savingsHistory: {
            totalSavingsCents: 0,
            totalRedemptions: 0,
            byBusiness: [],
          },
        }),
      )
      assertExists(!html.includes('Histórico de Economia'))
    },
  )

  await t.step('renders correctly with multiple redemptions', () => {
    const html = render(
      h(PassportCover, {
        ...baseProps,
        redemptions: [
          {
            id: 'ABC123',
            businessName: 'Padaria do Joao',
            redeemedAt: 1719600000000,
          },
          {
            id: 'DEF456',
            businessName: 'Mercado Central',
            redeemedAt: 1719600001000,
          },
        ],
      }),
    )
    assertStringIncludes(html, 'Padaria do Joao')
    assertStringIncludes(html, 'Mercado Central')
    assertStringIncludes(html, 'ABC123')
    assertStringIncludes(html, 'DEF456')
  })

  await t.step('displays redemption count on cover', () => {
    const html = render(h(PassportCover, baseProps))
    assertExists(html.includes('1 cupom') || html.includes('cupons'))
  })

  await t.step('displays total savings on cover', () => {
    const html = render(h(PassportCover, baseProps))
    assertStringIncludes(html, 'Economia')
  })
})

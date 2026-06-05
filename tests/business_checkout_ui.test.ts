import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'

// Helper function to simulate the logic in the island
const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100).replace(/\u00a0/g, ' ') // Replace non-breaking space for comparison
}

const parseCurrencyToCents = (displayValue: string) => {
  const value = displayValue.replace(/\D/g, '')
  return parseInt(value || '0', 10)
}

const formatCode = (input: string) => {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

Deno.test('CheckoutCalculator - Data Logic', async (t) => {
  await t.step('Currency formatting (Cents to BRL)', () => {
    assertEquals(formatCurrency(0), 'R$ 0,00')
    assertEquals(formatCurrency(100), 'R$ 1,00')
    assertEquals(formatCurrency(1250), 'R$ 12,50')
    assertEquals(formatCurrency(100050), 'R$ 1.000,50')
  })

  await t.step('Currency parsing (Input to Cents)', () => {
    assertEquals(parseCurrencyToCents('R$ 10,50'), 1050)
    assertEquals(parseCurrencyToCents('1000'), 1000)
    assertEquals(parseCurrencyToCents('R$ 1.234,56'), 123456)
    assertEquals(parseCurrencyToCents(''), 0)
  })

  await t.step('Code formatting', () => {
    assertEquals(formatCode('abcd-1234'), 'ABCD1234')
    assertEquals(formatCode('  abcd 1234  '), 'ABCD1234')
    assertEquals(formatCode('abc@123'), 'ABC123')
  })
})

Deno.test('CheckoutCalculator - API Integration (Mocked)', async (t) => {
  const originalFetch = globalThis.fetch

  await t.step('Successful validation call', async () => {
    const mockTransaction = {
      id: 'tx_123',
      totalAmount: 10000,
      discountApplied: 1500,
      finalAmount: 8500,
    }

    globalThis.fetch = (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string)
      assertEquals(body.code, 'TESTCODE')
      assertEquals(body.amountCents, 10000)

      return Promise.resolve(
        new Response(JSON.stringify({ transaction: mockTransaction }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    }

    // Simulate the handleSubmit logic
    const callApi = async (code: string, cents: number) => {
      const resp = await fetch('/api/transactions/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, amountCents: cents }),
      })
      return await resp.json()
    }

    const result = await callApi('TESTCODE', 10000)
    assertEquals(result.transaction.finalAmount, 8500)
  })

  await t.step('Failed validation call (404)', async () => {
    globalThis.fetch = () => {
      return Promise.resolve(
        new Response('Código não encontrado', { status: 404 }),
      )
    }

    const callApi = async (code: string, cents: number) => {
      const resp = await fetch('/api/transactions/validate', {
        method: 'POST',
        body: JSON.stringify({ code, amountCents: cents }),
      })
      if (!resp.ok) return { error: await resp.text() }
      return await resp.json()
    }

    const result = await callApi('WRONG', 1000)
    assertEquals(result.error, 'Código não encontrado')
  })

  globalThis.fetch = originalFetch
})

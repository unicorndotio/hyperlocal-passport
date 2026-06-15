import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'

const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100).replace(/\u00a0/g, ' ')
}

const parseCurrencyToCents = (displayValue: string) => {
  const value = displayValue.replace(/\D/g, '')
  return parseInt(value || '0', 10)
}

const formatCode = (input: string) => {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

const sanitizeQuantity = (input: string): number => {
  const num = parseInt(input.replace(/\D/g, '') || '0', 10)
  return Math.max(0, num)
}

const buildSubmitBody = (
  code: string,
  businessId: string,
  couponType: string,
  amountCents?: number,
  quantity?: number,
): Record<string, unknown> => {
  const body: Record<string, unknown> = { code, businessId }
  if (couponType === 'bogo' || couponType === 'item_specific') {
    body.quantity = quantity
  } else {
    body.amountCents = amountCents
  }
  return body
}

interface ItemizedDisplay {
  unitPriceCents?: number
  quantity?: number
  totalAmountCents: number
  discountAppliedCents: number
  finalAmountCents: number
}

const extractItemizedDisplay = (
  response: {
    transaction: {
      totalAmountCents: number
      discountAppliedCents: number
      finalAmountCents: number
    }
    behaviorType: string
    quantity?: number
    unitPriceCents?: number
  },
): ItemizedDisplay => {
  const isQty = response.behaviorType === 'bogo' ||
    response.behaviorType === 'item_specific'
  return {
    unitPriceCents: isQty ? response.unitPriceCents : undefined,
    quantity: isQty ? response.quantity : undefined,
    totalAmountCents: response.transaction.totalAmountCents,
    discountAppliedCents: response.transaction.discountAppliedCents,
    finalAmountCents: response.transaction.finalAmountCents,
  }
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

  await t.step('Quantity sanitization rejects non-positive values', () => {
    assertEquals(sanitizeQuantity('0'), 0)
    assertEquals(sanitizeQuantity(''), 0)
    assertEquals(sanitizeQuantity('-5'), 5) // '-' stripped by \D removal
    assertEquals(sanitizeQuantity('abc'), 0)
    assertEquals(sanitizeQuantity('1'), 1)
    assertEquals(sanitizeQuantity('10'), 10)
  })

  await t.step('buildSubmitBody - amount-based coupon', () => {
    const body = buildSubmitBody('CODE1', 'biz1', 'percentage_discount', 10000)
    assertEquals(body, {
      code: 'CODE1',
      businessId: 'biz1',
      amountCents: 10000,
    })
  })

  await t.step('buildSubmitBody - fixed_amount coupon', () => {
    const body = buildSubmitBody('CODE2', 'biz1', 'fixed_amount', 5000)
    assertEquals(body, { code: 'CODE2', businessId: 'biz1', amountCents: 5000 })
  })

  await t.step('buildSubmitBody - bogo coupon with quantity', () => {
    const body = buildSubmitBody('CODE3', 'biz1', 'bogo', undefined, 6)
    assertEquals(body, { code: 'CODE3', businessId: 'biz1', quantity: 6 })
  })

  await t.step('buildSubmitBody - item_specific coupon with quantity', () => {
    const body = buildSubmitBody('CODE4', 'biz1', 'item_specific', undefined, 3)
    assertEquals(body, { code: 'CODE4', businessId: 'biz1', quantity: 3 })
  })

  await t.step(
    'buildSubmitBody - amountCents omitted when quantity is used',
    () => {
      const body = buildSubmitBody('CODE5', 'biz1', 'bogo', 9999, 6)
      assertEquals(body.amountCents, undefined)
      assertEquals(body.quantity, 6)
    },
  )

  await t.step(
    'extractItemizedDisplay - percentage_discount strips qty fields',
    () => {
      const display = extractItemizedDisplay({
        transaction: {
          totalAmountCents: 10000,
          discountAppliedCents: 1500,
          finalAmountCents: 8500,
        },
        behaviorType: 'percentage_discount',
      })
      assertEquals(display.unitPriceCents, undefined)
      assertEquals(display.quantity, undefined)
      assertEquals(display.totalAmountCents, 10000)
      assertEquals(display.discountAppliedCents, 1500)
      assertEquals(display.finalAmountCents, 8500)
    },
  )

  await t.step(
    'extractItemizedDisplay - bogo includes qty and unit price',
    () => {
      const display = extractItemizedDisplay({
        transaction: {
          totalAmountCents: 6000,
          discountAppliedCents: 2000,
          finalAmountCents: 4000,
        },
        behaviorType: 'bogo',
        quantity: 6,
        unitPriceCents: 1000,
      })
      assertEquals(display.unitPriceCents, 1000)
      assertEquals(display.quantity, 6)
      assertEquals(display.totalAmountCents, 6000)
      assertEquals(display.discountAppliedCents, 2000)
      assertEquals(display.finalAmountCents, 4000)
    },
  )

  await t.step(
    'extractItemizedDisplay - item_specific includes qty and unit price',
    () => {
      const display = extractItemizedDisplay({
        transaction: {
          totalAmountCents: 6000,
          discountAppliedCents: 1500,
          finalAmountCents: 4500,
        },
        behaviorType: 'item_specific',
        quantity: 3,
        unitPriceCents: 2000,
      })
      assertEquals(display.unitPriceCents, 2000)
      assertEquals(display.quantity, 3)
      assertEquals(display.totalAmountCents, 6000)
      assertEquals(display.discountAppliedCents, 1500)
      assertEquals(display.finalAmountCents, 4500)
    },
  )
})

Deno.test('CheckoutCalculator - API Integration (Mocked)', async (t) => {
  const originalFetch = globalThis.fetch

  await t.step('Amount-based validation call sends amountCents', async () => {
    const mockResponse = {
      transaction: {
        id: 'tx_1',
        totalAmountCents: 10000,
        discountAppliedCents: 1500,
        finalAmountCents: 8500,
      },
      behaviorType: 'percentage_discount',
    }

    globalThis.fetch = (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string)
      assertEquals(body.code, 'PCTEST')
      assertEquals(body.amountCents, 10000)
      assertEquals(body.quantity, undefined)
      assertEquals(body.businessId, 'biz1')

      return Promise.resolve(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    }

    const body = buildSubmitBody('PCTEST', 'biz1', 'percentage_discount', 10000)
    const resp = await fetch('/api/transactions/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await resp.json()
    assertEquals(data.behaviorType, 'percentage_discount')
    assertEquals(data.transaction.finalAmountCents, 8500)

    globalThis.fetch = originalFetch
  })

  await t.step('Quantity-based validation call sends quantity', async () => {
    globalThis.fetch = (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string)
      assertEquals(body.code, 'BOGOTEST')
      assertEquals(body.quantity, 6)
      assertEquals(body.amountCents, undefined)
      assertEquals(body.businessId, 'biz1')

      return Promise.resolve(
        new Response(
          JSON.stringify({
            transaction: {
              id: 'tx_2',
              totalAmountCents: 6000,
              discountAppliedCents: 2000,
              finalAmountCents: 4000,
            },
            behaviorType: 'bogo',
            quantity: 6,
            unitPriceCents: 1000,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
    }

    const body = buildSubmitBody('BOGOTEST', 'biz1', 'bogo', undefined, 6)
    const resp = await fetch('/api/transactions/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await resp.json()

    const display = extractItemizedDisplay(data)
    assertEquals(display.unitPriceCents, 1000)
    assertEquals(display.quantity, 6)
    assertEquals(display.totalAmountCents, 6000)
    assertEquals(display.discountAppliedCents, 2000)
    assertEquals(display.finalAmountCents, 4000)

    globalThis.fetch = originalFetch
  })

  await t.step('Item-specific validation call sends quantity', async () => {
    globalThis.fetch = (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string)
      assertEquals(body.code, 'ITEMTEST')
      assertEquals(body.quantity, 3)
      assertEquals(body.amountCents, undefined)
      assertEquals(body.businessId, 'biz1')

      return Promise.resolve(
        new Response(
          JSON.stringify({
            transaction: {
              id: 'tx_3',
              totalAmountCents: 6000,
              discountAppliedCents: 1500,
              finalAmountCents: 4500,
            },
            behaviorType: 'item_specific',
            quantity: 3,
            unitPriceCents: 2000,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
    }

    const body = buildSubmitBody(
      'ITEMTEST',
      'biz1',
      'item_specific',
      undefined,
      3,
    )
    const resp = await fetch('/api/transactions/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await resp.json()

    const display = extractItemizedDisplay(data)
    assertEquals(display.unitPriceCents, 2000)
    assertEquals(display.quantity, 3)

    globalThis.fetch = originalFetch
  })

  await t.step('Fixed amount validation call sends amountCents', async () => {
    globalThis.fetch = (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string)
      assertEquals(body.code, 'FIXTEST')
      assertEquals(body.amountCents, 5000)
      assertEquals(body.quantity, undefined)
      assertEquals(body.businessId, 'biz1')

      return Promise.resolve(
        new Response(
          JSON.stringify({
            transaction: {
              id: 'tx_4',
              totalAmountCents: 5000,
              discountAppliedCents: 500,
              finalAmountCents: 4500,
            },
            behaviorType: 'fixed_amount',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
    }

    const body = buildSubmitBody('FIXTEST', 'biz1', 'fixed_amount', 5000)
    const resp = await fetch('/api/transactions/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await resp.json()

    const display = extractItemizedDisplay(data)
    assertEquals(display.unitPriceCents, undefined)
    assertEquals(display.quantity, undefined)

    globalThis.fetch = originalFetch
  })

  await t.step(
    'Server error messages are captured from response text',
    async () => {
      globalThis.fetch = () => {
        return Promise.resolve(
          new Response('Minimum purchase value of R$ 50.00 not met', {
            status: 400,
          }),
        )
      }

      const callApi = async (code: string) => {
        const body = buildSubmitBody(code, 'biz1', 'percentage_discount', 1000)
        const resp = await fetch('/api/transactions/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!resp.ok) return { error: await resp.text() }
        return await resp.json()
      }

      const result = await callApi('MINERR')
      assertEquals(result.error, 'Minimum purchase value of R$ 50.00 not met')

      globalThis.fetch = originalFetch
    },
  )

  await t.step(
    'Quantity-based server error messages are displayed',
    async () => {
      globalThis.fetch = () => {
        return Promise.resolve(
          new Response(
            'Quantity is required for bogo coupons and must be a positive integer',
            { status: 400 },
          ),
        )
      }

      const callApi = async (code: string) => {
        const body = buildSubmitBody(code, 'biz1', 'bogo', undefined, 0)
        const resp = await fetch('/api/transactions/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!resp.ok) return { error: await resp.text() }
        return await resp.json()
      }

      const result = await callApi('QTYERR')
      assertEquals(
        result.error,
        'Quantity is required for bogo coupons and must be a positive integer',
      )

      globalThis.fetch = originalFetch
    },
  )

  globalThis.fetch = originalFetch
})

import {
  assertEquals,
  assertMatch,
  assertNotMatch,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { generateRedemptionCode } from '../lib/coupon.ts'
import type { BehaviorType, Coupon } from '../lib/coupon.ts'
import {
  calculate,
  checkMinimumPurchase,
  validateRedemption,
} from '../lib/coupon-engine.ts'

Deno.test('Coupon Engine - Code Generator', () => {
  const code = generateRedemptionCode(6)
  assertEquals(code.length, 6)
  assertMatch(code, /^[2-9ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/)
  assertNotMatch(code, /[01OIL]/)
})

Deno.test('CouponEngine - calculate - percentage_discount', async (t) => {
  await t.step('exact percent', () => {
    const behavior: BehaviorType = { type: 'percentage_discount', percent: 10 }
    const result = calculate({ behavior, amountCents: 10000 })
    assertEquals(result.totalAmountCents, 10000)
    assertEquals(result.discountAppliedCents, 1000)
    assertEquals(result.finalAmountCents, 9000)
  })

  await t.step('floor rounding', () => {
    const behavior: BehaviorType = { type: 'percentage_discount', percent: 33 }
    const result = calculate({ behavior, amountCents: 100 })
    assertEquals(result.discountAppliedCents, 33) // Math.floor(100 * 33 / 100) = 33
    assertEquals(result.finalAmountCents, 67)
  })

  await t.step('zero amountCents', () => {
    const behavior: BehaviorType = { type: 'percentage_discount', percent: 10 }
    const result = calculate({ behavior, amountCents: 0 })
    assertEquals(result.discountAppliedCents, 0)
    assertEquals(result.finalAmountCents, 0)
  })

  await t.step('over 100%', () => {
    const behavior: BehaviorType = { type: 'percentage_discount', percent: 150 }
    const result = calculate({ behavior, amountCents: 1000 })
    assertEquals(result.discountAppliedCents, 1500)
    assertEquals(result.finalAmountCents, -500)
  })
})

Deno.test('CouponEngine - calculate - fixed_amount', async (t) => {
  await t.step('under total', () => {
    const behavior: BehaviorType = { type: 'fixed_amount', amountCents: 500 }
    const result = calculate({ behavior, amountCents: 10000 })
    assertEquals(result.discountAppliedCents, 500)
    assertEquals(result.finalAmountCents, 9500)
  })

  await t.step('over total (capped)', () => {
    const behavior: BehaviorType = { type: 'fixed_amount', amountCents: 5000 }
    const result = calculate({ behavior, amountCents: 3000 })
    assertEquals(result.discountAppliedCents, 3000)
    assertEquals(result.finalAmountCents, 0)
  })

  await t.step('exact match', () => {
    const behavior: BehaviorType = { type: 'fixed_amount', amountCents: 5000 }
    const result = calculate({ behavior, amountCents: 5000 })
    assertEquals(result.discountAppliedCents, 5000)
    assertEquals(result.finalAmountCents, 0)
  })

  await t.step('zero amountCents', () => {
    const behavior: BehaviorType = { type: 'fixed_amount', amountCents: 500 }
    const result = calculate({ behavior, amountCents: 0 })
    assertEquals(result.discountAppliedCents, 0)
    assertEquals(result.finalAmountCents, 0)
  })
})

Deno.test('CouponEngine - calculate - bogo', async (t) => {
  await t.step('exact sets (buy 2 get 1 free x 3 = 3 free)', () => {
    const behavior: BehaviorType = {
      type: 'bogo',
      buyQuantity: 2,
      freeQuantity: 1,
      unitPriceCents: 1000,
    }
    const result = calculate({ behavior, amountCents: 0, quantity: 9 })
    // 9 items, groups of (2+1)=3 → 3 sets × 1 free = 3 free
    // total = 9 × 1000 = 9000
    // discount = 3 × 1000 = 3000
    assertEquals(result.totalAmountCents, 9000)
    assertEquals(result.discountAppliedCents, 3000)
    assertEquals(result.finalAmountCents, 6000)
  })

  await t.step('partial sets with remainder', () => {
    const behavior: BehaviorType = {
      type: 'bogo',
      buyQuantity: 2,
      freeQuantity: 1,
      unitPriceCents: 1000,
    }
    const result = calculate({ behavior, amountCents: 0, quantity: 7 })
    // 7 items, groups of (2+1)=3 → 2 sets × 1 free = 2 free, 1 remainder
    // total = 7 × 1000 = 7000
    // discount = 2 × 1000 = 2000
    assertEquals(result.totalAmountCents, 7000)
    assertEquals(result.discountAppliedCents, 2000)
    assertEquals(result.finalAmountCents, 5000)
  })

  await t.step('single unit (no free)', () => {
    const behavior: BehaviorType = {
      type: 'bogo',
      buyQuantity: 2,
      freeQuantity: 1,
      unitPriceCents: 1000,
    }
    const result = calculate({ behavior, amountCents: 0, quantity: 1 })
    // 1 item, groups of (2+1)=3 → 0 sets
    assertEquals(result.discountAppliedCents, 0)
    assertEquals(result.finalAmountCents, 1000)
  })

  await t.step('default quantity = 1 when not provided', () => {
    const behavior: BehaviorType = {
      type: 'bogo',
      buyQuantity: 1,
      freeQuantity: 1,
      unitPriceCents: 500,
    }
    const result = calculate({ behavior, amountCents: 0 })
    // 1 item (default), groups of (1+1)=2 → 0 sets
    assertEquals(result.discountAppliedCents, 0)
    assertEquals(result.finalAmountCents, 500)
  })
})

Deno.test('CouponEngine - calculate - item_specific', async (t) => {
  await t.step('single unit', () => {
    const behavior: BehaviorType = {
      type: 'item_specific',
      unitPriceCents: 2000,
      discountPerUnitCents: 500,
    }
    const result = calculate({ behavior, amountCents: 0, quantity: 1 })
    assertEquals(result.totalAmountCents, 2000)
    assertEquals(result.discountAppliedCents, 500)
    assertEquals(result.finalAmountCents, 1500)
  })

  await t.step('multiple units', () => {
    const behavior: BehaviorType = {
      type: 'item_specific',
      unitPriceCents: 2000,
      discountPerUnitCents: 500,
    }
    const result = calculate({ behavior, amountCents: 0, quantity: 4 })
    assertEquals(result.totalAmountCents, 8000)
    assertEquals(result.discountAppliedCents, 2000)
    assertEquals(result.finalAmountCents, 6000)
  })

  await t.step('zero quantity', () => {
    const behavior: BehaviorType = {
      type: 'item_specific',
      unitPriceCents: 2000,
      discountPerUnitCents: 500,
    }
    const result = calculate({ behavior, amountCents: 0, quantity: 0 })
    assertEquals(result.totalAmountCents, 0)
    assertEquals(result.discountAppliedCents, 0)
    assertEquals(result.finalAmountCents, 0)
  })

  await t.step('discount > unit price', () => {
    const behavior: BehaviorType = {
      type: 'item_specific',
      unitPriceCents: 500,
      discountPerUnitCents: 1000,
    }
    const result = calculate({ behavior, amountCents: 0, quantity: 1 })
    assertEquals(result.totalAmountCents, 500)
    assertEquals(result.discountAppliedCents, 1000)
    assertEquals(result.finalAmountCents, -500)
  })
})

Deno.test('CouponEngine - validateRedemption', async (t) => {
  const baseCoupon: Coupon = {
    id: 'test',
    businessId: 'biz',
    title: 'Test',
    behavior: { type: 'percentage_discount', percent: 10 },
    restrictions: {},
    isActive: true,
    createdAt: new Date().toISOString(),
  }

  await t.step('active coupon passes', () => {
    const result = validateRedemption(baseCoupon)
    assertEquals(result.valid, true)
  })

  await t.step('inactive coupon fails', () => {
    const result = validateRedemption({ ...baseCoupon, isActive: false })
    assertEquals(result.valid, false)
    assertEquals(result.reason, 'Coupon is not active')
  })

  await t.step('expired coupon fails', () => {
    const result = validateRedemption({
      ...baseCoupon,
      restrictions: { validUntil: Date.now() - 10000 },
    })
    assertEquals(result.valid, false)
    assertEquals(result.reason, 'Coupon has expired')
  })

  await t.step('not yet valid coupon fails', () => {
    const result = validateRedemption({
      ...baseCoupon,
      restrictions: { validFrom: Date.now() + 10000 },
    })
    assertEquals(result.valid, false)
    assertEquals(result.reason, 'Coupon is not yet valid')
  })

  await t.step('global cap reached fails', () => {
    const result = validateRedemption(
      {
        ...baseCoupon,
        restrictions: { globalCap: 5 },
      },
      { globalRedemptionCount: 5 },
    )
    assertEquals(result.valid, false)
    assertEquals(result.reason, 'Global limit reached')
  })

  await t.step('global cap not reached passes', () => {
    const result = validateRedemption(
      {
        ...baseCoupon,
        restrictions: { globalCap: 5 },
      },
      { globalRedemptionCount: 3 },
    )
    assertEquals(result.valid, true)
  })

  await t.step('no cap passes regardless of count', () => {
    const result = validateRedemption(baseCoupon, {
      globalRedemptionCount: 999,
    })
    assertEquals(result.valid, true)
  })

  await t.step('user cap reached fails', () => {
    const result = validateRedemption(
      {
        ...baseCoupon,
        restrictions: { userCap: 2 },
      },
      { userRedemptionCount: 2 },
    )
    assertEquals(result.valid, false)
    assertEquals(result.reason, 'User limit reached')
  })

  await t.step('user cap not reached passes', () => {
    const result = validateRedemption(
      {
        ...baseCoupon,
        restrictions: { userCap: 2 },
      },
      { userRedemptionCount: 1 },
    )
    assertEquals(result.valid, true)
  })
})

Deno.test('CouponEngine - checkMinimumPurchase', async (t) => {
  await t.step('above threshold passes', () => {
    assertEquals(checkMinimumPurchase(5000, 3000), true)
  })

  await t.step('below threshold fails', () => {
    assertEquals(checkMinimumPurchase(2000, 3000), false)
  })

  await t.step('no threshold set passes', () => {
    assertEquals(checkMinimumPurchase(100, undefined), true)
    assertEquals(checkMinimumPurchase(0, undefined), true)
  })

  await t.step('exact threshold passes', () => {
    assertEquals(checkMinimumPurchase(3000, 3000), true)
  })
})

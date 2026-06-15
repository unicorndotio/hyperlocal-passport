import type { BehaviorType, Coupon } from './coupon.ts'

export interface CalculationInput {
  behavior: BehaviorType
  amountCents: number
  quantity?: number
}

export interface CalculationResult {
  totalAmountCents: number
  discountAppliedCents: number
  finalAmountCents: number
}

export interface ValidationResult {
  valid: boolean
  reason?: string
}

export function calculate(input: CalculationInput): CalculationResult {
  switch (input.behavior.type) {
    case 'percentage_discount': {
      const discount = Math.floor(
        input.amountCents * input.behavior.percent / 100,
      )
      return {
        totalAmountCents: input.amountCents,
        discountAppliedCents: discount,
        finalAmountCents: input.amountCents - discount,
      }
    }

    case 'fixed_amount': {
      const applied = Math.min(input.behavior.amountCents, input.amountCents)
      return {
        totalAmountCents: input.amountCents,
        discountAppliedCents: applied,
        finalAmountCents: input.amountCents - applied,
      }
    }

    case 'bogo': {
      const qty = input.quantity ?? 1
      const total = input.behavior.unitPriceCents * qty
      const divisor = input.behavior.buyQuantity + input.behavior.freeQuantity
      const sets = divisor > 0 ? Math.floor(qty / divisor) : 0
      const freeItems = sets * input.behavior.freeQuantity
      const discountBogo = freeItems * input.behavior.unitPriceCents
      return {
        totalAmountCents: total,
        discountAppliedCents: discountBogo,
        finalAmountCents: total - discountBogo,
      }
    }

    case 'item_specific': {
      const qtyItem = input.quantity ?? 1
      const totalItem = input.behavior.unitPriceCents * qtyItem
      const discountItem = input.behavior.discountPerUnitCents * qtyItem
      return {
        totalAmountCents: totalItem,
        discountAppliedCents: discountItem,
        finalAmountCents: totalItem - discountItem,
      }
    }
  }
}

export function validateRedemption(
  coupon: Coupon,
  counts?: { globalRedemptionCount?: number; userRedemptionCount?: number },
): ValidationResult {
  if (!coupon.isActive) {
    return { valid: false, reason: 'Coupon is not active' }
  }

  const now = Date.now()

  const { validFrom, validUntil, globalCap, userCap } = coupon.restrictions

  if (validFrom && validFrom > now) {
    return { valid: false, reason: 'Coupon is not yet valid' }
  }

  if (validUntil && validUntil < now) {
    return { valid: false, reason: 'Coupon has expired' }
  }

  if (counts) {
    if (
      globalCap !== undefined && globalCap !== null &&
      (counts.globalRedemptionCount ?? 0) >= globalCap
    ) {
      return { valid: false, reason: 'Global limit reached' }
    }

    if (
      userCap !== undefined && userCap !== null &&
      (counts.userRedemptionCount ?? 0) >= userCap
    ) {
      return { valid: false, reason: 'User limit reached' }
    }
  }

  return { valid: true }
}

export function checkMinimumPurchase(
  totalCents: number,
  minimum?: number,
): boolean {
  if (minimum === undefined || minimum === null) return true
  return totalCents >= minimum
}

import { crypto } from 'jsr:@std/crypto@1.0.3'

export type BehaviorType =
  | { type: 'percentage_discount'; percent: number }
  | { type: 'fixed_amount'; amountCents: number }
  | {
    type: 'bogo'
    buyQuantity: number
    freeQuantity: number
    unitPriceCents: number
  }
  | {
    type: 'item_specific'
    unitPriceCents: number
    discountPerUnitCents: number
  }

export interface CouponRestrictions {
  globalCap?: number
  userCap?: number
  validFrom?: number
  validUntil?: number
  usageFrequency?: 'one_time' | 'daily' | 'weekly' | 'monthly'
  maxUnitsPerRedemption?: number
  applicationScope?: { type: 'all' } | { type: 'categories'; ids: string[] } | {
    type: 'items'
    ids: string[]
  }
  minimumPurchaseValueCents?: number
}

export interface Coupon {
  id: string
  businessId: string
  title: string
  description?: string
  behavior: BehaviorType
  restrictions: CouponRestrictions
  isActive: boolean
  createdAt: string
}

export interface Redemption {
  id: string // The short alphanumeric code
  couponId: string
  businessId: string
  userId: string
  status: 'active' | 'used' | 'expired'
  redeemedAt: number
  usedAt?: number
}

export interface Transaction {
  id: string
  redemptionId: string
  couponId: string
  businessId: string
  userId: string
  totalAmountCents: number
  discountAppliedCents: number
  finalAmountCents: number
  timestamp: number
}

const VALID_BEHAVIOR_TYPES = [
  'percentage_discount',
  'fixed_amount',
  'bogo',
  'item_specific',
] as const

export type BehaviorTypeName = typeof VALID_BEHAVIOR_TYPES[number]

export function validateBehavior(
  value: unknown,
): { valid: true; behavior: BehaviorType } | { valid: false; message: string } {
  if (!value || typeof value !== 'object') {
    return { valid: false, message: 'Behavior must be an object' }
  }
  const b = value as Record<string, unknown>
  if (
    typeof b.type !== 'string' ||
    !VALID_BEHAVIOR_TYPES.includes(b.type as BehaviorTypeName)
  ) {
    return {
      valid: false,
      message: `Behavior type must be one of: ${
        VALID_BEHAVIOR_TYPES.join(', ')
      }`,
    }
  }
  switch (b.type) {
    case 'percentage_discount':
      if (typeof b.percent !== 'number') {
        return {
          valid: false,
          message: 'percent is required and must be a number',
        }
      }
      break
    case 'fixed_amount':
      if (typeof b.amountCents !== 'number') {
        return {
          valid: false,
          message: 'amountCents is required and must be a number',
        }
      }
      break
    case 'bogo':
      if (typeof b.buyQuantity !== 'number') {
        return {
          valid: false,
          message: 'buyQuantity is required and must be a number',
        }
      }
      if (typeof b.freeQuantity !== 'number') {
        return {
          valid: false,
          message: 'freeQuantity is required and must be a number',
        }
      }
      if (typeof b.unitPriceCents !== 'number') {
        return {
          valid: false,
          message: 'unitPriceCents is required and must be a number',
        }
      }
      break
    case 'item_specific':
      if (typeof b.unitPriceCents !== 'number') {
        return {
          valid: false,
          message: 'unitPriceCents is required and must be a number',
        }
      }
      if (typeof b.discountPerUnitCents !== 'number') {
        return {
          valid: false,
          message: 'discountPerUnitCents is required and must be a number',
        }
      }
      break
  }
  return { valid: true, behavior: b as unknown as BehaviorType }
}

/**
 * Generates a short, easily typable alphanumeric code.
 * Excludes ambiguous characters like 0, O, I, l.
 */
export function generateRedemptionCode(length = 6): string {
  const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ' // Excludes 0, 1, O, I, L
  let result = ''
  const randomValues = new Uint32Array(length)
  crypto.getRandomValues(randomValues)
  for (let i = 0; i < length; i++) {
    result += chars.charAt(randomValues[i] % chars.length)
  }
  return result
}

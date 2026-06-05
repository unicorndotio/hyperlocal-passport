import { crypto } from 'jsr:@std/crypto@1.0.3'

export interface Coupon {
  id: string
  businessId: string
  type: 'basic' | 'special'
  title: string
  discountPercent?: number
  description?: string
  globalLimit?: number // null for infinite
  globalClaimedCount: number
  userMonthlyLimit?: number
  validUntil?: number // Unix timestamp
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

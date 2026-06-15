const ANALYTICS_PREFIX = ['analytics'] as const

export function viewCountKey(couponId: string): string[] {
  return [...ANALYTICS_PREFIX, couponId, 'views']
}

export function redemptionCountKey(couponId: string): string[] {
  return [...ANALYTICS_PREFIX, couponId, 'redemptions']
}

export function validationCountKey(couponId: string): string[] {
  return [...ANALYTICS_PREFIX, couponId, 'validations']
}

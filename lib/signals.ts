export interface DemandSignal {
  id: string
  category: string
  description: string
  residentId: string
  createdAt: number
  reviewed: boolean
}

export function getSignalKey(id: string): string[] {
  return ['signals', id]
}

export function getCategoryIndexKey(
  category: string,
  timestamp: number,
  signalId: string,
): string[] {
  return ['signals_by_category', category, String(timestamp), signalId]
}

export function getCategoryCountKey(category: string): string[] {
  return ['signal_counts', category]
}

export function getRateLimitKey(
  residentId: string,
  date: string,
): string[] {
  return ['signal_rate_limit', residentId, date]
}

export function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export const VALID_CATEGORIES = [
  'Alimentação',
  'Casa',
  'Corpo',
  'Esporte',
  'Náutica',
  'Entretenimento',
  'Outros',
]

export function validateSignalInput(body: {
  category?: string
  description?: string
}): string | undefined {
  if (!body.category || typeof body.category !== 'string' || !body.category.trim()) {
    return 'Category is required'
  }
  if (!VALID_CATEGORIES.includes(body.category.trim())) {
    return `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`
  }
  if (!body.description || typeof body.description !== 'string' || !body.description.trim()) {
    return 'Description is required'
  }
  if (body.description.trim().length < 10) {
    return 'Description must be at least 10 characters'
  }
  if (body.description.trim().length > 500) {
    return 'Description must be at most 500 characters'
  }
  return undefined
}

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
  if (
    !body.category || typeof body.category !== 'string' || !body.category.trim()
  ) {
    return 'Category is required'
  }
  if (!VALID_CATEGORIES.includes(body.category.trim())) {
    return `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`
  }
  if (
    !body.description || typeof body.description !== 'string' ||
    !body.description.trim()
  ) {
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

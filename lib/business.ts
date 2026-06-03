export function normalizeCnpj(value: string): string {
  return value.replace(/\D/g, '')
}

export function formatCnpjDisplay(value: string): string {
  const clean = normalizeCnpj(value).slice(0, 14)
  if (clean.length <= 2) return clean
  if (clean.length <= 5) return `${clean.slice(0, 2)}.${clean.slice(2)}`
  if (clean.length <= 8) {
    return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5)}`
  }
  if (clean.length <= 12) {
    return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${
      clean.slice(8)
    }`
  }
  return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${
    clean.slice(8, 12)
  }-${clean.slice(12)}`
}

export function isValidCnpj(value: string): boolean {
  const cnpj = normalizeCnpj(value)
  if (cnpj.length !== 14) return false
  if (/^(\d)\1{13}$/.test(cnpj)) return false

  let size = cnpj.length - 2
  let numbers = cnpj.substring(0, size)
  const digits = cnpj.substring(size)
  let sum = 0
  let pos = size - 7
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--
    if (pos < 2) pos = 9
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(0))) return false

  size = size + 1
  numbers = cnpj.substring(0, size)
  sum = 0
  pos = size - 7
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--
    if (pos < 2) pos = 9
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  return result === parseInt(digits.charAt(1))
}

export interface BusinessFormErrors {
  name?: string
  cnpj?: string
  category?: string
  logo?: string
  userId?: string
  global?: string
}

export function validateBusinessForm(fields: {
  name: string
  cnpj: string
  category: string
  logo: File | null
  userId: string
  isEdit?: boolean
}): BusinessFormErrors {
  const errs: BusinessFormErrors = {}
  if (!fields.name || !fields.name.trim()) {
    errs.name = 'Nome da empresa é obrigatório.'
  }
  if (!isValidCnpj(fields.cnpj)) {
    errs.cnpj = 'CNPJ inválido. Informe 14 dígitos.'
  }
  if (!fields.category || !fields.category.trim()) {
    errs.category = 'Categoria é obrigatória.'
  }
  if (!fields.isEdit && !fields.logo) {
    errs.logo = 'Logotipo é obrigatório.'
  }
  if (!fields.userId || !fields.userId.trim()) {
    errs.userId = 'Associação de usuário é obrigatória.'
  }
  return errs
}

// Validation helpers for the registration form.
// Extracted into a separate module so they can be unit-tested without a DOM.

export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, '')
}

export function isValidCpf(value: string): boolean {
  const cpf = normalizeCpf(value)
  if (!/^\d{11}$/.test(cpf)) return false
  // Reject all-same-digit sequences (e.g. 111.111.111-11)
  if (/^(\d)\1{10}$/.test(cpf)) return false

  // Validate first check digit
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i)
  let check = (sum * 10) % 11
  if (check === 10 || check === 11) check = 0
  if (check !== parseInt(cpf[9])) return false

  // Validate second check digit
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i)
  check = (sum * 10) % 11
  if (check === 10 || check === 11) check = 0
  return check === parseInt(cpf[10])
}

export function formatCpfDisplay(value: string): string {
  const digits = normalizeCpf(value).slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export function isValidFileType(file: File): boolean {
  return ALLOWED_FILE_TYPES.includes(file.type)
}

export interface FormErrors {
  name?: string
  cpf?: string
  email?: string
  idPhoto?: string
  residenceProof?: string
  global?: string
}

export function validateForm(fields: {
  name: string
  cpf: string
  email: string
  idPhoto: File | null
  residenceProof: File | null
}): FormErrors {
  const errs: FormErrors = {}
  if (!fields.name.trim()) errs.name = 'Nome é obrigatório.'
  if (!isValidCpf(fields.cpf)) errs.cpf = 'CPF inválido. Informe 11 dígitos.'
  if (!fields.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    errs.email = 'E-mail inválido.'
  }
  if (!fields.idPhoto) {
    errs.idPhoto = 'Foto do documento é obrigatória.'
  } else if (!isValidFileType(fields.idPhoto)) {
    errs.idPhoto = 'Formato inválido. Use JPG, PNG ou PDF.'
  }
  if (!fields.residenceProof) {
    errs.residenceProof = 'Comprovante de residência é obrigatório.'
  } else if (!isValidFileType(fields.residenceProof)) {
    errs.residenceProof = 'Formato inválido. Use JPG, PNG ou PDF.'
  }
  return errs
}

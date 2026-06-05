// Validation helpers for the registration form.
// Extracted into a separate module so they can be unit-tested without a DOM.

export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, '')
}

export function isValidCpf(value: string): boolean {
  const cpf = normalizeCpf(value)
  if (!/^\d{11}$/.test(cpf)) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i)
  let check = (sum * 10) % 11
  if (check === 10 || check === 11) check = 0
  if (check !== parseInt(cpf[9])) return false

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
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${
    digits.slice(9)
  }`
}

export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]

export function isValidFileType(file: File): boolean {
  return ALLOWED_FILE_TYPES.includes(file.type)
}

// --- WhatsApp / Phone ---

export interface Country {
  code: string // dial code e.g. '+55'
  iso: string // ISO 3166-1 alpha-2
  label: string // display name with flag
  pattern: RegExp // matches local digits only (no dial code)
  placeholder: string
}

export const COUNTRIES: Country[] = [
  {
    code: '+55',
    iso: 'BR',
    label: '🇧🇷 Brasil (+55)',
    pattern: /^\d{10,11}$/, // 10 = landline, 11 = mobile (with leading 9)
    placeholder: '48 91234-5678',
  },
  {
    code: '+54',
    iso: 'AR',
    label: '🇦🇷 Argentina (+54)',
    pattern: /^\d{10}$/, // area code (without 0) + 8-digit number
    placeholder: '11 1234-5678',
  },
  {
    code: '+598',
    iso: 'UY',
    label: '🇺🇾 Uruguai (+598)',
    pattern: /^\d{8,9}$/,
    placeholder: '91 234-567',
  },
  {
    code: '+56',
    iso: 'CL',
    label: '🇨🇱 Chile (+56)',
    pattern: /^\d{9}$/,
    placeholder: '9 1234-5678',
  },
  {
    code: '+595',
    iso: 'PY',
    label: '🇵🇾 Paraguai (+595)',
    pattern: /^\d{9}$/,
    placeholder: '981 123-456',
  },
  {
    code: '+57',
    iso: 'CO',
    label: '🇨🇴 Colômbia (+57)',
    pattern: /^\d{10}$/,
    placeholder: '300 123-4567',
  },
  {
    code: '+51',
    iso: 'PE',
    label: '🇵🇪 Peru (+51)',
    pattern: /^\d{9}$/,
    placeholder: '912 345 678',
  },
  {
    code: '+58',
    iso: 'VE',
    label: '🇻🇪 Venezuela (+58)',
    pattern: /^\d{10}$/,
    placeholder: '412 123-4567',
  },
  {
    code: '+351',
    iso: 'PT',
    label: '🇵🇹 Portugal (+351)',
    pattern: /^\d{9}$/,
    placeholder: '912 345 678',
  },
  {
    code: '+49',
    iso: 'DE',
    label: '🇩🇪 Alemanha (+49)',
    pattern: /^\d{10,11}$/,
    placeholder: '151 12345678',
  },
  {
    code: '+39',
    iso: 'IT',
    label: '🇮🇹 Itália (+39)',
    pattern: /^\d{10}$/,
    placeholder: '312 345 6789',
  },
  {
    code: '+34',
    iso: 'ES',
    label: '🇪🇸 Espanha (+34)',
    pattern: /^\d{9}$/,
    placeholder: '612 345 678',
  },
  {
    code: '+1',
    iso: 'US',
    label: '🇺🇸 EUA/Canadá (+1)',
    pattern: /^\d{10}$/, // NPA-NXX-XXXX
    placeholder: '(555) 123-4567',
  },
]

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, '')
}

export function isValidPhone(dialCode: string, value: string): boolean {
  const country = COUNTRIES.find((c) => c.code === dialCode)
  if (!country) return false
  return country.pattern.test(normalizePhone(value))
}

export function formatWhatsApp(dialCode: string, localNumber: string): string {
  return `${dialCode}${normalizePhone(localNumber)}`
}

// --- Form validation ---

export interface FormErrors {
  name?: string
  cpf?: string
  email?: string
  whatsapp?: string
  idPhoto?: string
  residenceProof?: string
  global?: string
}

export function validateForm(fields: {
  name: string
  cpf: string
  email: string
  whatsappDial: string
  whatsappNumber: string
  idPhoto: File | null
  residenceProof: File | null
}): FormErrors {
  const errs: FormErrors = {}
  if (!fields.name.trim()) errs.name = 'Nome é obrigatório.'
  if (!isValidCpf(fields.cpf)) errs.cpf = 'CPF inválido. Informe 11 dígitos.'
  if (
    !fields.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)
  ) {
    errs.email = 'E-mail inválido.'
  }
  if (!isValidPhone(fields.whatsappDial, fields.whatsappNumber)) {
    errs.whatsapp = 'Número de WhatsApp inválido.'
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

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a value in cents to a Brazilian Real (BRL) currency string.
 */
export function formatBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)
}

/**
 * Formats raw digits / input string into a masked currency string (e.g. "1500" -> "R$ 15,00")
 * and extracts the total value in cents.
 */
export function formatCurrencyMask(
  input: string | number,
): { formatted: string; cents: number } {
  const digitsOnly = String(input ?? '').replace(/\D/g, '')
  const cents = digitsOnly ? parseInt(digitsOnly, 10) : 0
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)

  return { formatted, cents }
}

export function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

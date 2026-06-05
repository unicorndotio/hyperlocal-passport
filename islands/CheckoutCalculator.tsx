import { useSignal } from '@preact/signals'
import { useRef } from 'preact/hooks'
import { JSX } from 'preact'
import { cn, formatBRL } from '@/lib/utils.ts'
import type { Transaction } from '@/lib/coupon.ts'
import {
  LucideCheckCircle2,
  LucideLoader2,
  LucideQrCode,
  LucideXCircle,
} from 'lucide-react'

interface CheckoutCalculatorProps {
  businessId: string
}

export default function CheckoutCalculator(
  { businessId }: CheckoutCalculatorProps,
) {
  const code = useSignal('')
  const amountStr = useSignal('') // For display, e.g., "R$ 0,00"
  const amountCents = useSignal(0)
  const loading = useSignal(false)
  const result = useSignal<
    | { success: boolean; data?: { transaction: Transaction }; error?: string }
    | null
  >(null)
  const scannerVisible = useSignal(false)
  // deno-lint-ignore no-explicit-any
  const scannerRef = useRef<any>(null)

  const handleAmountChange = (
    e: JSX.TargetedEvent<HTMLInputElement, Event>,
  ) => {
    const value = e.currentTarget.value.replace(/\D/g, '')
    const cents = parseInt(value || '0', 10)
    amountCents.value = cents
    amountStr.value = formatBRL(cents)
  }

  const handleCodeChange = (e: JSX.TargetedEvent<HTMLInputElement, Event>) => {
    code.value = e.currentTarget.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
  }

  const toggleScanner = async () => {
    scannerVisible.value = !scannerVisible.value
    if (scannerVisible.value) {
      try {
        const { Html5QrcodeScanner } = await import('html5-qrcode')
        setTimeout(() => {
          const scanner = new Html5QrcodeScanner(
            'qr-reader',
            { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false,
          )
          scanner.render(onScanSuccess, onScanFailure)
          scannerRef.current = scanner
        }, 100)
      } catch (_err) {
        result.value = {
          success: false,
          error: 'Não foi possível carregar o scanner',
        }
        scannerVisible.value = false
      }
    } else {
      if (scannerRef.current) {
        scannerRef.current.clear()
        scannerRef.current = null
      }
    }
  }

  function onScanSuccess(decodedText: string) {
    code.value = decodedText.toUpperCase()
    scannerVisible.value = false
    if (scannerRef.current) {
      scannerRef.current.clear()
      scannerRef.current = null
    }
  }

  function onScanFailure(_error: unknown) {
    // console.warn(`Code scan error = ${error}`);
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    if (!code.value || amountCents.value <= 0) return

    loading.value = true
    result.value = null

    try {
      const resp = await fetch('/api/transactions/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.value,
          amountCents: amountCents.value,
          businessId,
        }),
      })

      if (resp.ok) {
        const data = await resp.json()
        result.value = { success: true, data }
      } else {
        const errorText = await resp.text()
        result.value = {
          success: false,
          error: errorText || 'Erro ao validar código',
        }
      }
    } catch (_err) {
      result.value = { success: false, error: 'Erro de conexão com o servidor' }
    } finally {
      loading.value = false
    }
  }

  const reset = () => {
    code.value = ''
    amountCents.value = 0
    amountStr.value = ''
    result.value = null
  }

  if (result.value?.success && result.value.data) {
    const { transaction } = result.value.data
    return (
      <div class='flex flex-col items-center justify-center py-8 animate-in fade-in zoom-in duration-300'>
        <LucideCheckCircle2 class='w-20 h-20 text-green-500 mb-4' />
        <h2 class='text-2xl font-bold text-slate-900 mb-2'>
          Validado com Sucesso!
        </h2>
        <div class='w-full max-w-sm bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-6'>
          <div class='flex justify-between mb-2'>
            <span class='text-slate-500'>Valor Total:</span>
            <span class='font-medium text-slate-900'>
              {formatBRL(transaction.totalAmount)}
            </span>
          </div>
          <div class='flex justify-between mb-2'>
            <span class='text-slate-500'>Desconto Aplicado:</span>
            <span class='font-bold text-green-600'>
              -{formatBRL(transaction.discountApplied)}
            </span>
          </div>
          <div class='border-t border-dashed border-slate-200 my-4 pt-4 flex justify-between'>
            <span class='text-lg font-bold text-slate-900'>Total a Pagar:</span>
            <span class='text-2xl font-black text-blue-600'>
              {formatBRL(transaction.finalAmount)}
            </span>
          </div>
        </div>
        <button
          type='button'
          onClick={reset}
          class='w-full max-w-sm py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors'
        >
          Nova Validação
        </button>
      </div>
    )
  }

  return (
    <div class='max-w-md mx-auto'>
      <form onSubmit={handleSubmit} class='space-y-6'>
        <div>
          <label class='block text-sm font-bold text-slate-700 mb-2'>
            CÓDIGO DO CUPOM
          </label>
          <div class='relative'>
            <input
              type='text'
              value={code.value}
              onInput={handleCodeChange}
              placeholder='ABCD-1234'
              class='w-full h-16 px-4 text-2xl font-mono font-bold tracking-[0.2em] border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-0 outline-none transition-all uppercase placeholder:text-slate-300'
              required
            />
            <button
              type='button'
              onClick={toggleScanner}
              class={cn(
                'absolute right-2 top-2 h-12 w-12 flex items-center justify-center rounded-lg transition-colors',
                scannerVisible.value
                  ? 'bg-red-100 text-red-600'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              <LucideQrCode class='w-6 h-6' />
            </button>
          </div>
        </div>

        {scannerVisible.value && (
          <div class='relative bg-black rounded-xl overflow-hidden aspect-square border-2 border-blue-500'>
            <div id='qr-reader' class='w-full h-full'></div>
            <div class='absolute inset-0 pointer-events-none border-[40px] border-black/40 flex items-center justify-center'>
              <div class='w-48 h-48 border-2 border-white/50 rounded-lg'></div>
            </div>
          </div>
        )}

        <div>
          <label class='block text-sm font-bold text-slate-700 mb-2'>
            VALOR TOTAL DA COMPRA
          </label>
          <input
            type='text'
            value={amountStr.value}
            onInput={handleAmountChange}
            placeholder='R$ 0,00'
            class='w-full h-16 px-4 text-3xl font-black border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-0 outline-none transition-all text-slate-900 placeholder:text-slate-300'
            required
          />
        </div>

        {result.value?.error && (
          <div class='flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 animate-in fade-in slide-in-from-top-2'>
            <LucideXCircle class='w-5 h-5 flex-shrink-0' />
            <p class='text-sm font-medium'>{result.value.error}</p>
          </div>
        )}

        <button
          type='submit'
          disabled={loading.value || !code.value || amountCents.value <= 0}
          class='w-full h-16 bg-blue-600 text-white text-xl font-black rounded-2xl hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-[0.98]'
        >
          {loading.value ? <LucideLoader2 class='w-6 h-6 animate-spin' /> : (
            'VALIDAR DESCONTO'
          )}
        </button>
      </form>
    </div>
  )
}

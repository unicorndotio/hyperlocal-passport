import { useSignal } from '@preact/signals'
import { useRef } from 'preact/hooks'
import { JSX } from 'preact'
import type { Html5QrcodeScanner } from 'html5-qrcode'
import { cn, formatBRL } from '@/lib/utils.ts'
import type { Transaction } from '@/lib/coupon.ts'
import {
  LucideCheckCircle2,
  LucideLoader2,
  LucideQrCode,
  LucideXCircle,
} from 'lucide-react'

interface CouponLookupResult {
  behaviorType: string
  couponTitle: string
  unitPriceCents?: number
  buyQuantity?: number
  freeQuantity?: number
  discountPerUnitCents?: number
}

interface CheckoutCalculatorProps {
  businessId: string
}

export default function CheckoutCalculator(
  { businessId }: CheckoutCalculatorProps,
) {
  const code = useSignal('')
  const amountStr = useSignal('')
  const amountCents = useSignal(0)
  const quantityStr = useSignal('')
  const quantity = useSignal(0)
  const loading = useSignal(false)
  const couponInfo = useSignal<CouponLookupResult | null>(null)
  const couponLookupLoading = useSignal(false)
  const lookupError = useSignal('')
  const result = useSignal<
    | {
      success: boolean
      data?: {
        transaction: Transaction
        behaviorType: string
        quantity?: number
        unitPriceCents?: number
      }
      error?: string
    }
    | null
  >(null)
  const scannerVisible = useSignal(false)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const lookupTimer = useRef<number | null>(null)

  const lookupCode = async (codeVal: string) => {
    if (!codeVal || codeVal.length < 4) {
      couponInfo.value = null
      lookupError.value = ''
      return
    }

    couponLookupLoading.value = true
    lookupError.value = ''

    try {
      const resp = await fetch(
        `/api/coupon-by-code/${encodeURIComponent(codeVal)}`,
      )
      if (resp.ok) {
        const data: CouponLookupResult = await resp.json()
        couponInfo.value = data
        const isQty = data.behaviorType === 'bogo' ||
          data.behaviorType === 'item_specific'
        if (isQty) {
          amountStr.value = ''
          amountCents.value = 0
        } else {
          quantityStr.value = ''
          quantity.value = 0
        }
      } else if (resp.status === 404) {
        couponInfo.value = null
        lookupError.value = 'Código não encontrado'
      } else {
        couponInfo.value = null
        lookupError.value = await resp.text()
      }
    } catch {
      couponInfo.value = null
      lookupError.value = 'Erro de conexão'
    } finally {
      couponLookupLoading.value = false
    }
  }

  const handleAmountChange = (
    e: JSX.TargetedEvent<HTMLInputElement, Event>,
  ) => {
    const value = e.currentTarget.value.replace(/\D/g, '')
    const cents = parseInt(value || '0', 10)
    amountCents.value = cents
    amountStr.value = formatBRL(cents)
  }

  const handleQuantityChange = (
    e: JSX.TargetedEvent<HTMLInputElement, Event>,
  ) => {
    const val = e.currentTarget.value.replace(/\D/g, '')
    const num = parseInt(val || '0', 10)
    quantity.value = Math.max(0, num)
    quantityStr.value = String(num || '')
  }

  const handleCodeChange = (e: JSX.TargetedEvent<HTMLInputElement, Event>) => {
    const val = e.currentTarget.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    code.value = val
    result.value = null
    if (lookupTimer.current) clearTimeout(lookupTimer.current)
    lookupTimer.current = setTimeout(() => lookupCode(val), 400)
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
    lookupCode(code.value)
  }

  function onScanFailure(_error: unknown) {
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    if (!code.value || !couponInfo.value) return
    const isQty = couponInfo.value.behaviorType === 'bogo' ||
      couponInfo.value.behaviorType === 'item_specific'
    if (isQty && quantity.value <= 0) return
    if (!isQty && amountCents.value <= 0) return

    loading.value = true
    result.value = null

    try {
      const body: Record<string, unknown> = {
        code: code.value,
        businessId,
      }
      if (isQty) {
        body.quantity = quantity.value
      } else {
        body.amountCents = amountCents.value
      }

      const resp = await fetch('/api/transactions/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
    quantity.value = 0
    quantityStr.value = ''
    couponInfo.value = null
    lookupError.value = ''
    result.value = null
  }

  if (result.value?.success && result.value.data) {
    const { transaction, behaviorType, quantity: qty, unitPriceCents } =
      result.value.data
    const isQtyResult = behaviorType === 'bogo' ||
      behaviorType === 'item_specific'

    return (
      <div class='flex flex-col items-center justify-center py-8 animate-in fade-in zoom-in duration-300'>
        <LucideCheckCircle2 class='w-20 h-20 text-green-500 mb-4' />
        <h2 class='text-2xl font-bold text-slate-900 mb-2'>
          Validado com Sucesso!
        </h2>
        <div class='w-full max-w-sm bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-6'>
          {isQtyResult && (
            <>
              <div class='flex justify-between mb-2'>
                <span class='text-slate-500'>Preço Unitário:</span>
                <span class='font-medium text-slate-900'>
                  {formatBRL(unitPriceCents!)}
                </span>
              </div>
              <div class='flex justify-between mb-2'>
                <span class='text-slate-500'>Quantidade:</span>
                <span class='font-medium text-slate-900'>{qty}</span>
              </div>
              <div class='border-t border-dashed border-slate-200 my-2 pt-2' />
            </>
          )}
          <div class='flex justify-between mb-2'>
            <span class='text-slate-500'>Subtotal:</span>
            <span class='font-medium text-slate-900'>
              {formatBRL(transaction.totalAmountCents)}
            </span>
          </div>
          <div class='flex justify-between mb-2'>
            <span class='text-slate-500'>Desconto Aplicado:</span>
            <span class='font-bold text-green-600'>
              -{formatBRL(transaction.discountAppliedCents)}
            </span>
          </div>
          <div class='border-t border-dashed border-slate-200 my-4 pt-4 flex justify-between'>
            <span class='text-lg font-bold text-slate-900'>Total a Pagar:</span>
            <span class='text-2xl font-black text-blue-600'>
              {formatBRL(transaction.finalAmountCents)}
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

  const isQty = couponInfo.value?.behaviorType === 'bogo' ||
    couponInfo.value?.behaviorType === 'item_specific'

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

        {couponLookupLoading.value && (
          <div class='flex items-center gap-2 text-slate-500 text-sm'>
            <LucideLoader2 class='w-4 h-4 animate-spin' />
            <span>Buscando cupom...</span>
          </div>
        )}

        {lookupError.value && !couponLookupLoading.value && (
          <div class='flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 animate-in fade-in slide-in-from-top-2'>
            <LucideXCircle class='w-5 h-5 flex-shrink-0' />
            <p class='text-sm font-medium'>{lookupError.value}</p>
          </div>
        )}

        {couponInfo.value && !couponLookupLoading.value && (
          <>
            <div class='p-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-100'>
              <p class='text-sm font-medium'>
                {couponInfo.value.couponTitle}
              </p>
            </div>

            {isQty
              ? (
                <div>
                  <label class='block text-sm font-bold text-slate-700 mb-2'>
                    QUANTIDADE DE ITENS
                  </label>
                  <input
                    type='number'
                    value={quantityStr.value}
                    onInput={handleQuantityChange}
                    placeholder='Ex: 6'
                    min='1'
                    step='1'
                    class='w-full h-16 px-4 text-3xl font-black border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-0 outline-none transition-all text-slate-900 placeholder:text-slate-300'
                    required
                  />
                  {couponInfo.value.unitPriceCents && (
                    <p class='text-xs text-slate-500 mt-1'>
                      Preço unitário:{' '}
                      {formatBRL(couponInfo.value.unitPriceCents)}
                      {couponInfo.value.behaviorType === 'bogo' &&
                        ` | Leve ${couponInfo.value.buyQuantity} pague ${
                          couponInfo.value.buyQuantity! -
                          couponInfo.value.freeQuantity!
                        }`}
                    </p>
                  )}
                </div>
              )
              : (
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
              )}
          </>
        )}

        {result.value?.error && (
          <div class='flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 animate-in fade-in slide-in-from-top-2'>
            <LucideXCircle class='w-5 h-5 flex-shrink-0' />
            <p class='text-sm font-medium'>{result.value.error}</p>
          </div>
        )}

        <button
          type='submit'
          disabled={loading.value || !code.value || !couponInfo.value ||
            (isQty ? quantity.value <= 0 : amountCents.value <= 0)}
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

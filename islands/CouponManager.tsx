import { useSignal } from '@preact/signals'
import type { Coupon, CouponRestrictions } from '@/lib/coupon.ts'
import { Badge } from '@/components/ui/badge.tsx'
import { Button } from '@/components/ui/button.tsx'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx'
import { cn, formatBRL, formatCurrencyMask } from '@/lib/utils.ts'

type BehaviorTypeName =
  | 'percentage_discount'
  | 'fixed_amount'
  | 'bogo'
  | 'item_specific'

interface TemplatePreset {
  id: string
  name: string
  description: string
  icon: string
}

const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: 'loyalty-perk',
    name: 'Benefício Fidelidade',
    description:
      'Desconto percentual, frequência semanal, sem expiração. Para fidelidade contínua de moradores.',
    icon: '\u2B50',
  },
  {
    id: 'flash-sale',
    name: 'Promoção Relâmpago',
    description:
      'Desconto percentual, uso único por morador, validade de 7 dias.',
    icon: '\u26A1',
  },
  {
    id: 'event-promo',
    name: 'Promoção de Evento',
    description:
      'Desconto em valor fixo (R$), uso único por morador, validade de 1 dia.',
    icon: '\uD83C\uDF89',
  },
  {
    id: 'item-clearance',
    name: 'Liquidação de Item',
    description: 'Desconto em item específico com limite total de unidades.',
    icon: '\uD83C\uDFF7\uFE0F',
  },
]

const BEHAVIOR_LABELS: Record<BehaviorTypeName, string> = {
  percentage_discount: 'Desconto Percentual',
  fixed_amount: 'Valor Fixo',
  bogo: 'Compre X Leve Y Grátis',
  item_specific: 'Desconto por Item',
}

const BEHAVIOR_OPTIONS: { value: BehaviorTypeName; label: string }[] = [
  { value: 'percentage_discount', label: 'Desconto Percentual' },
  { value: 'fixed_amount', label: 'Valor Fixo (R$)' },
  { value: 'bogo', label: 'Compre X Leve Y Grátis (BOGO)' },
  { value: 'item_specific', label: 'Desconto por Item' },
]

function tsToInput(ts: number | undefined): string {
  if (!ts) return ''
  const d = new Date(ts)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${
    pad(d.getHours())
  }:${pad(d.getMinutes())}`
}

function inputToTs(str: string): number | undefined {
  if (!str) return undefined
  const d = new Date(str)
  return isNaN(d.getTime()) ? undefined : d.getTime()
}

interface Props {
  businessId: string
  initialCoupons: Coupon[]
  isBusinessActive?: boolean
}

export default function CouponManager(
  { businessId, initialCoupons, isBusinessActive = true }: Props,
) {
  const coupons = useSignal<Coupon[]>(initialCoupons)
  const showForm = useSignal(false)
  const editingId = useSignal<string | null>(null)
  const loading = useSignal(false)
  const error = useSignal<string | null>(null)

  const selectedTemplate = useSignal<string | null>(null)
  const behaviorType = useSignal<BehaviorTypeName>('percentage_discount')
  const title = useSignal('')
  const description = useSignal('')
  const isActive = useSignal(true)

  const percent = useSignal('')
  const amountCents = useSignal('')
  const buyQuantity = useSignal('')
  const freeQuantity = useSignal('')
  const unitPriceCents = useSignal('')
  const discountPerUnitCents = useSignal('')

  const globalCap = useSignal('')
  const userCap = useSignal('')
  const validFrom = useSignal('')
  const validUntil = useSignal('')
  const usageFrequency = useSignal('')
  const maxUnitsPerRedemption = useSignal('')
  const minimumPurchaseValueCents = useSignal('')
  const restrictionsOpen = useSignal(false)

  function resetBehaviorFields(type?: BehaviorTypeName) {
    percent.value = ''
    amountCents.value = ''
    buyQuantity.value = ''
    freeQuantity.value = ''
    unitPriceCents.value = ''
    discountPerUnitCents.value = ''
    if (type) behaviorType.value = type
  }

  function resetRestrictions() {
    globalCap.value = ''
    userCap.value = ''
    validFrom.value = ''
    validUntil.value = ''
    usageFrequency.value = ''
    maxUnitsPerRedemption.value = ''
    minimumPurchaseValueCents.value = ''
  }

  function resetForm() {
    selectedTemplate.value = null
    editingId.value = null
    title.value = ''
    description.value = ''
    isActive.value = true
    error.value = null
    restrictionsOpen.value = false
    behaviorType.value = 'percentage_discount'
    resetBehaviorFields('percentage_discount')
    resetRestrictions()
  }

  function openForm() {
    showForm.value = true
    error.value = null
  }

  function closeForm() {
    showForm.value = false
    resetForm()
  }

  function applyTemplate(preset: TemplatePreset) {
    selectedTemplate.value = preset.id
    error.value = null

    const now = Date.now()
    const defaults = getDefaultsForPreset(preset.id, now)
    behaviorType.value = defaults.behaviorType
    applyBehaviorDefaults(defaults.behaviorType, defaults.behaviorFields)
    applyRestrictionDefaults(defaults.restrictions)
  }

  function getDefaultsForPreset(
    id: string,
    now: number,
  ): {
    behaviorType: BehaviorTypeName
    behaviorFields: Record<string, number>
    restrictions: Partial<CouponRestrictions>
  } {
    switch (id) {
      case 'loyalty-perk':
        return {
          behaviorType: 'percentage_discount',
          behaviorFields: { percent: 10 },
          restrictions: {
            usageFrequency: 'weekly' as const,
          },
        }
      case 'flash-sale':
        return {
          behaviorType: 'percentage_discount',
          behaviorFields: { percent: 20 },
          restrictions: {
            userCap: 1,
            usageFrequency: 'one_time' as const,
            validUntil: now + 7 * 86400000,
          },
        }
      case 'event-promo':
        return {
          behaviorType: 'fixed_amount',
          behaviorFields: { amountCents: 1000 },
          restrictions: {
            userCap: 1,
            usageFrequency: 'one_time' as const,
            validUntil: now + 86400000,
          },
        }
      case 'item-clearance':
        return {
          behaviorType: 'item_specific',
          behaviorFields: { unitPriceCents: 2000, discountPerUnitCents: 1000 },
          restrictions: {
            globalCap: 50,
            userCap: 1,
            usageFrequency: 'one_time' as const,
          },
        }
      default:
        return {
          behaviorType: 'percentage_discount',
          behaviorFields: { percent: 10 },
          restrictions: {},
        }
    }
  }

  function applyBehaviorDefaults(
    type: BehaviorTypeName,
    fields: Record<string, number>,
  ) {
    resetBehaviorFields(type)
    if (fields.percent !== undefined) percent.value = String(fields.percent)
    if (fields.amountCents !== undefined) {
      amountCents.value = formatCurrencyMask(fields.amountCents).formatted
    }
    if (fields.buyQuantity !== undefined) {
      buyQuantity.value = String(fields.buyQuantity)
    }
    if (fields.freeQuantity !== undefined) {
      freeQuantity.value = String(fields.freeQuantity)
    }
    if (fields.unitPriceCents !== undefined) {
      unitPriceCents.value = formatCurrencyMask(fields.unitPriceCents).formatted
    }
    if (fields.discountPerUnitCents !== undefined) {
      discountPerUnitCents.value =
        formatCurrencyMask(fields.discountPerUnitCents).formatted
    }
  }

  function applyRestrictionDefaults(
    res: Partial<CouponRestrictions>,
  ) {
    resetRestrictions()
    if (res.globalCap !== undefined) globalCap.value = String(res.globalCap)
    if (res.userCap !== undefined) userCap.value = String(res.userCap)
    if (res.validFrom !== undefined) {
      validFrom.value = tsToInput(res.validFrom)
    }
    if (res.validUntil !== undefined) {
      validUntil.value = tsToInput(res.validUntil)
    }
    if (res.usageFrequency !== undefined) {
      usageFrequency.value = res.usageFrequency
    }
    if (res.maxUnitsPerRedemption !== undefined) {
      maxUnitsPerRedemption.value = String(res.maxUnitsPerRedemption)
    }
    if (res.minimumPurchaseValueCents !== undefined) {
      minimumPurchaseValueCents.value = formatCurrencyMask(
        res.minimumPurchaseValueCents,
      ).formatted
    }
  }

  function parseCents(val: string): number {
    return formatCurrencyMask(val).cents
  }

  function getBehaviorFromForm(): Record<string, unknown> {
    switch (behaviorType.value) {
      case 'percentage_discount':
        return {
          type: 'percentage_discount',
          percent: parseInt(percent.value, 10),
        }
      case 'fixed_amount':
        return {
          type: 'fixed_amount',
          amountCents: parseCents(amountCents.value),
        }
      case 'bogo':
        return {
          type: 'bogo',
          buyQuantity: parseInt(buyQuantity.value, 10),
          freeQuantity: parseInt(freeQuantity.value, 10),
          unitPriceCents: parseCents(unitPriceCents.value),
        }
      case 'item_specific':
        return {
          type: 'item_specific',
          unitPriceCents: parseCents(unitPriceCents.value),
          discountPerUnitCents: parseCents(discountPerUnitCents.value),
        }
    }
  }

  function getRestrictionsFromForm(): CouponRestrictions {
    let derivedMaxUnits: number | undefined = undefined
    if (maxUnitsPerRedemption.value) {
      derivedMaxUnits = parseInt(maxUnitsPerRedemption.value, 10)
    } else if (behaviorType.value === 'bogo' && freeQuantity.value) {
      derivedMaxUnits = parseInt(freeQuantity.value, 10)
    } else if (behaviorType.value === 'item_specific') {
      derivedMaxUnits = 1
    }

    return {
      ...(globalCap.value ? { globalCap: parseInt(globalCap.value, 10) } : {}),
      ...(userCap.value ? { userCap: parseInt(userCap.value, 10) } : {}),
      ...(validFrom.value ? { validFrom: inputToTs(validFrom.value) } : {}),
      ...(validUntil.value ? { validUntil: inputToTs(validUntil.value) } : {}),
      ...(usageFrequency.value
        ? {
          usageFrequency: usageFrequency
            .value as CouponRestrictions['usageFrequency'],
        }
        : {}),
      ...(derivedMaxUnits !== undefined
        ? {
          maxUnitsPerRedemption: derivedMaxUnits,
        }
        : {}),
      ...(minimumPurchaseValueCents.value
        ? {
          minimumPurchaseValueCents: parseCents(
            minimumPurchaseValueCents.value,
          ),
        }
        : {}),
    }
  }

  function validate(): string | null {
    if (!title.value.trim()) return 'Título é obrigatório.'

    switch (behaviorType.value) {
      case 'percentage_discount': {
        const p = parseInt(percent.value, 10)
        if (isNaN(p) || p < 1 || p > 100) {
          return 'Percentual deve estar entre 1 e 100.'
        }
        break
      }
      case 'fixed_amount': {
        const a = parseCents(amountCents.value)
        if (isNaN(a) || a <= 0) {
          return 'Valor deve ser maior que 0.'
        }
        break
      }
      case 'bogo': {
        const bq = parseInt(buyQuantity.value, 10)
        const fq = parseInt(freeQuantity.value, 10)
        const up = parseCents(unitPriceCents.value)
        if (isNaN(bq) || bq < 1) {
          return 'Quantidade para comprar deve ser no mínimo 1.'
        }
        if (isNaN(fq) || fq < 1) {
          return 'Quantidade grátis deve ser no mínimo 1.'
        }
        if (isNaN(up) || up <= 0) return 'Preço unitário deve ser maior que 0.'
        break
      }
      case 'item_specific': {
        const up = parseCents(unitPriceCents.value)
        const dp = parseCents(discountPerUnitCents.value)
        if (isNaN(up) || up <= 0) return 'Preço unitário deve ser maior que 0.'
        if (isNaN(dp) || dp <= 0) {
          return 'Desconto por unidade deve ser maior que 0.'
        }
        if (dp > up) {
          return 'Desconto por unidade não pode exceder o preço unitário.'
        }
        break
      }
    }

    return null
  }

  function populateCouponForm(coupon: Coupon) {
    editingId.value = coupon.id
    title.value = coupon.title
    description.value = coupon.description || ''
    isActive.value = coupon.isActive
    behaviorType.value = coupon.behavior.type as BehaviorTypeName
    selectedTemplate.value = null
    resetRestrictions()

    switch (coupon.behavior.type) {
      case 'percentage_discount':
        percent.value = String(coupon.behavior.percent)
        amountCents.value = ''
        buyQuantity.value = ''
        freeQuantity.value = ''
        unitPriceCents.value = ''
        discountPerUnitCents.value = ''
        break
      case 'fixed_amount':
        amountCents.value =
          formatCurrencyMask(coupon.behavior.amountCents).formatted
        percent.value = ''
        buyQuantity.value = ''
        freeQuantity.value = ''
        unitPriceCents.value = ''
        discountPerUnitCents.value = ''
        break
      case 'bogo':
        buyQuantity.value = String(coupon.behavior.buyQuantity)
        freeQuantity.value = String(coupon.behavior.freeQuantity)
        unitPriceCents.value =
          formatCurrencyMask(coupon.behavior.unitPriceCents).formatted
        percent.value = ''
        amountCents.value = ''
        discountPerUnitCents.value = ''
        break
      case 'item_specific':
        unitPriceCents.value =
          formatCurrencyMask(coupon.behavior.unitPriceCents).formatted
        discountPerUnitCents.value = formatCurrencyMask(
          coupon.behavior.discountPerUnitCents,
        ).formatted
        percent.value = ''
        amountCents.value = ''
        buyQuantity.value = ''
        freeQuantity.value = ''
        break
    }

    const r = coupon.restrictions
    if (r.globalCap) globalCap.value = String(r.globalCap)
    if (r.userCap) userCap.value = String(r.userCap)
    if (r.validFrom) validFrom.value = tsToInput(r.validFrom)
    if (r.validUntil) validUntil.value = tsToInput(r.validUntil)
    if (r.usageFrequency) usageFrequency.value = r.usageFrequency
    if (r.maxUnitsPerRedemption) {
      maxUnitsPerRedemption.value = String(r.maxUnitsPerRedemption)
    }
    if (r.minimumPurchaseValueCents) {
      minimumPurchaseValueCents.value = formatCurrencyMask(
        r.minimumPurchaseValueCents,
      ).formatted
    }

    openForm()
  }

  async function handleSubmit(e: Event) {
    e.preventDefault()
    error.value = null

    const validationError = validate()
    if (validationError) {
      error.value = validationError
      return
    }

    loading.value = true

    const body = {
      title: title.value.trim(),
      description: description.value.trim() || undefined,
      behavior: getBehaviorFromForm(),
      restrictions: getRestrictionsFromForm(),
      isActive: editingId.value ? undefined : isActive.value,
    }

    try {
      const url = editingId.value
        ? `/api/coupons/${editingId.value}`
        : `/api/businesses/${businessId}/coupons`
      const method = editingId.value ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const updated = await res.json()
        if (editingId.value) {
          coupons.value = coupons.value.map((c) =>
            c.id === editingId.value ? { ...c, ...updated } : c
          )
        } else {
          coupons.value = [updated, ...coupons.value]
        }
        closeForm()
      } else {
        const data = await res.json().catch(() => ({}))
        error.value = data.error ||
          (editingId.value
            ? 'Falha ao atualizar cupom. Verifique os dados e tente novamente.'
            : 'Falha ao criar cupom. Verifique os dados e tente novamente.')
      }
    } catch {
      error.value = 'Erro de conexão. Verifique sua internet.'
    } finally {
      loading.value = false
    }
  }

  async function handleToggleActive(coupon: Coupon) {
    try {
      const res = await fetch(`/api/coupons/${coupon.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !coupon.isActive }),
      })
      if (res.ok) {
        coupons.value = coupons.value.map((c) =>
          c.id === coupon.id ? { ...c, isActive: !c.isActive } : c
        )
      }
    } catch {
      // silently fail for toggle
    }
  }

  function behaviorTypeSummary(behavior: Coupon['behavior']): string {
    switch (behavior.type) {
      case 'percentage_discount':
        return `${behavior.percent}% de desconto`
      case 'fixed_amount':
        return `${formatBRL(behavior.amountCents)} de desconto`
      case 'bogo':
        return `Compre ${behavior.buyQuantity} leve ${behavior.freeQuantity} grátis`
      case 'item_specific':
        return `${formatBRL(behavior.discountPerUnitCents)}/unidade de desconto`
    }
  }

  const FREQUENCY_LABELS: Record<string, string> = {
    one_time: 'Uma vez',
    daily: 'Diário',
    weekly: 'Semanal',
    monthly: 'Mensal',
  }

  function restrictionSummary(r: CouponRestrictions): string {
    const parts: string[] = []
    if (r.globalCap) parts.push(`Global: ${r.globalCap}`)
    if (r.userCap) parts.push(`Usuário: ${r.userCap}`)
    if (r.usageFrequency) {
      parts.push(
        FREQUENCY_LABELS[r.usageFrequency] ||
          r.usageFrequency.replace('_', ' '),
      )
    }
    if (r.validUntil) {
      parts.push(`Até ${new Date(r.validUntil).toLocaleDateString()}`)
    }
    return parts.join(' | ') || '\u221E'
  }

  function badgeVariantForType(type: BehaviorTypeName) {
    switch (type) {
      case 'percentage_discount':
        return 'default'
      case 'fixed_amount':
        return 'secondary'
      case 'bogo':
        return 'outline'
      case 'item_specific':
        return 'ghost'
    }
  }

  return (
    <div class='space-y-6'>
      <div class='flex justify-between items-center'>
        <h3 class='text-lg font-medium text-slate-900'>Cupons</h3>
        <Button
          onClick={() => {
            if (showForm.value) {
              closeForm()
            } else {
              resetForm()
              openForm()
            }
          }}
          variant={showForm.value ? 'outline' : 'default'}
          disabled={!isBusinessActive}
          title={!isBusinessActive ? 'Conta inativa' : undefined}
        >
          {showForm.value ? 'Cancelar' : 'Novo Cupom'}
        </Button>
      </div>

      {showForm.value && (
        <form
          onSubmit={handleSubmit}
          class='bg-slate-50 p-6 rounded-lg border border-slate-200 space-y-4'
        >
          <h4 class='font-semibold text-slate-800 text-sm'>
            {editingId.value
              ? `Editar: ${title.value || 'Cupom'}`
              : 'Novo Cupom'}
          </h4>

          {error.value && (
            <div class='bg-red-50 text-red-600 p-3 rounded text-sm border border-red-100'>
              {error.value}
            </div>
          )}

          {!editingId.value && (
            <div>
              <label class='text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2'>
                Modelo
              </label>
              <div class='grid grid-cols-2 md:grid-cols-3 gap-3'>
                {TEMPLATE_PRESETS.map((preset) => (
                  <Card
                    key={preset.id}
                    size='sm'
                    class={cn(
                      'cursor-pointer transition-all hover:ring-2 hover:ring-blue-400',
                      selectedTemplate.value === preset.id &&
                        'ring-2 ring-blue-500 bg-blue-50',
                    )}
                    onClick={() => applyTemplate(preset)}
                  >
                    <CardHeader>
                      <CardTitle>
                        <span class='mr-1.5'>{preset.icon}</span>
                        {preset.name}
                      </CardTitle>
                      <CardDescription>
                        {preset.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div class='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div class='space-y-1'>
              <label class='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>
                Título
              </label>
              <input
                type='text'
                value={title.value}
                onInput={(e) =>
                  title.value = (e.target as HTMLInputElement).value}
                placeholder='ex: Promoção de Inauguração'
                class='w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white'
                required
              />
            </div>

            <div class='space-y-1'>
              <label class='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>
                Tipo de Comportamento
              </label>
              <select
                value={behaviorType.value}
                onChange={(e) =>
                  resetBehaviorFields(
                    (e.target as HTMLSelectElement).value as BehaviorTypeName,
                  )}
                class='w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white'
              >
                {BEHAVIOR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {behaviorType.value === 'percentage_discount' && (
            <div class='space-y-1'>
              <label class='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>
                Percentual de Desconto (%)
              </label>
              <input
                type='number'
                value={percent.value}
                onInput={(e) =>
                  percent.value = (e.target as HTMLInputElement).value}
                placeholder='ex: 10'
                min='1'
                max='100'
                class='w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white'
                required
              />
            </div>
          )}

          {behaviorType.value === 'fixed_amount' && (
            <div class='space-y-1'>
              <label class='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>
                Valor de Desconto
              </label>
              <input
                type='text'
                value={amountCents.value}
                onInput={(e) => {
                  const val = (e.target as HTMLInputElement).value
                  amountCents.value = formatCurrencyMask(val).formatted
                }}
                placeholder='R$ 15,00'
                class='w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white'
                required
              />
            </div>
          )}

          {behaviorType.value === 'bogo' && (
            <div class='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <div class='space-y-1'>
                <label class='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>
                  Quantidade para Comprar
                </label>
                <input
                  type='number'
                  value={buyQuantity.value}
                  onInput={(e) =>
                    buyQuantity.value = (e.target as HTMLInputElement).value}
                  placeholder='ex: 1'
                  min='1'
                  class='w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white'
                  required
                />
              </div>
              <div class='space-y-1'>
                <label class='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>
                  Quantidade Grátis
                </label>
                <input
                  type='number'
                  value={freeQuantity.value}
                  onInput={(e) =>
                    freeQuantity.value = (e.target as HTMLInputElement).value}
                  placeholder='ex: 1'
                  min='1'
                  class='w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white'
                  required
                />
              </div>
              <div class='space-y-1'>
                <label class='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>
                  Preço Unitário
                </label>
                <input
                  type='text'
                  value={unitPriceCents.value}
                  onInput={(e) => {
                    const val = (e.target as HTMLInputElement).value
                    unitPriceCents.value = formatCurrencyMask(val).formatted
                  }}
                  placeholder='R$ 10,00'
                  class='w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white'
                  required
                />
              </div>
            </div>
          )}

          {behaviorType.value === 'item_specific' && (
            <div class='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div class='space-y-1'>
                <label class='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>
                  Preço Unitário
                </label>
                <input
                  type='text'
                  value={unitPriceCents.value}
                  onInput={(e) => {
                    const val = (e.target as HTMLInputElement).value
                    unitPriceCents.value = formatCurrencyMask(val).formatted
                  }}
                  placeholder='R$ 20,00'
                  class='w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white'
                  required
                />
              </div>
              <div class='space-y-1'>
                <label class='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>
                  Desconto por Unidade
                </label>
                <input
                  type='text'
                  value={discountPerUnitCents.value}
                  onInput={(e) => {
                    const val = (e.target as HTMLInputElement).value
                    discountPerUnitCents.value =
                      formatCurrencyMask(val).formatted
                  }}
                  placeholder='R$ 10,00'
                  class='w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white'
                  required
                />
              </div>
            </div>
          )}

          <div class='space-y-1'>
            <label class='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>
              Descrição (Opcional)
            </label>
            <textarea
              value={description.value}
              onInput={(e) =>
                description.value = (e.target as HTMLTextAreaElement).value}
              placeholder='Descreva os termos da promoção...'
              rows={2}
              class='w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white'
            />
          </div>

          <div class='border border-slate-200 rounded-md overflow-hidden'>
            <button
              type='button'
              onClick={() => restrictionsOpen.value = !restrictionsOpen.value}
              class='w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors'
            >
              <span>Restrições (opcionais)</span>
              <svg
                class={cn(
                  'w-4 h-4 transition-transform',
                  restrictionsOpen.value && 'rotate-180',
                )}
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  stroke-linecap='round'
                  stroke-linejoin='round'
                  stroke-width={2}
                  d='M19 9l-7 7-7-7'
                />
              </svg>
            </button>
            {restrictionsOpen.value && (
              <div class='px-4 pb-4 pt-2 border-t border-slate-200'>
                <div class='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div class='space-y-1'>
                    <label class='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>
                      Limite Global de Resgates
                    </label>
                    <input
                      type='number'
                      value={globalCap.value}
                      onInput={(e) =>
                        globalCap.value = (e.target as HTMLInputElement).value}
                      placeholder='Máx. total de resgates'
                      min='1'
                      class='w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white'
                    />
                  </div>
                  <div class='space-y-1'>
                    <label class='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>
                      Válido De
                    </label>
                    <input
                      type='datetime-local'
                      value={validFrom.value}
                      onInput={(e) =>
                        validFrom.value = (e.target as HTMLInputElement).value}
                      class='w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white'
                    />
                  </div>
                  <div class='space-y-1 md:col-span-2'>
                    <label class='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>
                      Válido Até
                    </label>
                    <input
                      type='datetime-local'
                      value={validUntil.value}
                      onInput={(e) =>
                        validUntil.value = (e.target as HTMLInputElement).value}
                      class='w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white'
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {editingId.value && (
            <div class='flex items-center gap-2'>
              <label class='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>
                Ativo
              </label>
              <button
                type='button'
                onClick={() => isActive.value = !isActive.value}
                class={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  isActive.value ? 'bg-blue-600' : 'bg-slate-300',
                )}
              >
                <span
                  class={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    isActive.value ? 'translate-x-6' : 'translate-x-1',
                  )}
                />
              </button>
            </div>
          )}

          <div class='flex justify-end pt-2 gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={closeForm}
            >
              Cancelar
            </Button>
            <Button type='submit' disabled={loading.value}>
              {loading.value
                ? 'Salvando...'
                : editingId.value
                ? 'Salvar Alterações'
                : 'Criar Cupom'}
            </Button>
          </div>
        </form>
      )}

      <div class='overflow-x-auto border border-slate-200 rounded-lg'>
        <table class='w-full text-sm text-left'>
          <thead class='bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider'>
            <tr>
              <th class='px-6 py-3'>Cupom</th>
              <th class='px-6 py-3'>Tipo</th>
              <th class='px-6 py-3'>Desconto</th>
              <th class='px-6 py-3'>Restrições</th>
              <th class='px-6 py-3'>Status</th>
              <th class='px-6 py-3 text-right'>Ações</th>
            </tr>
          </thead>
          <tbody class='divide-y divide-slate-200'>
            {coupons.value.length === 0
              ? (
                <tr>
                  <td
                    colSpan={6}
                    class='px-6 py-10 text-center text-slate-500'
                  >
                    Nenhum cupom ainda. Crie o primeiro acima.
                  </td>
                </tr>
              )
              : (
                coupons.value.map((coupon) => (
                  <tr
                    key={coupon.id}
                    class='hover:bg-slate-50 transition-colors'
                  >
                    <td class='px-6 py-4'>
                      <div class='font-medium text-slate-900'>
                        {coupon.title}
                      </div>
                      {coupon.description && (
                        <div class='text-xs text-slate-500 truncate max-w-xs'>
                          {coupon.description}
                        </div>
                      )}
                    </td>
                    <td class='px-6 py-4'>
                      <Badge
                        variant={badgeVariantForType(
                          coupon.behavior.type as BehaviorTypeName,
                        )}
                      >
                        {BEHAVIOR_LABELS[
                          coupon.behavior.type as BehaviorTypeName
                        ] ||
                          coupon.behavior.type}
                      </Badge>
                    </td>
                    <td class='px-6 py-4'>
                      <span class='font-semibold text-blue-600'>
                        {behaviorTypeSummary(coupon.behavior)}
                      </span>
                    </td>
                    <td class='px-6 py-4'>
                      <span class='text-xs text-slate-500'>
                        {restrictionSummary(coupon.restrictions)}
                      </span>
                    </td>
                    <td class='px-6 py-4'>
                      <button
                        type='button'
                        onClick={() => handleToggleActive(coupon)}
                        disabled={!isBusinessActive}
                        title={!isBusinessActive ? 'Conta inativa' : undefined}
                        class={cn(
                          'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                          coupon.isActive ? 'bg-green-500' : 'bg-slate-300',
                          !isBusinessActive && 'cursor-not-allowed opacity-50',
                        )}
                      >
                        <span
                          class={cn(
                            'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform',
                            coupon.isActive
                              ? 'translate-x-[18px]'
                              : 'translate-x-[2px]',
                          )}
                        />
                      </button>
                    </td>
                    <td class='px-6 py-4 text-right'>
                      <Button
                        variant='outline'
                        size='xs'
                        disabled={!isBusinessActive}
                        title={!isBusinessActive ? 'Conta inativa' : undefined}
                        onClick={() => {
                          populateCouponForm(coupon)
                          openForm()
                        }}
                      >
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))
              )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

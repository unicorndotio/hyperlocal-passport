import { useState } from 'preact/hooks'
import type { Coupon } from '@/lib/coupon.ts'
import { Badge } from '@/components/ui/badge.tsx'
import { Button } from '@/components/ui/button.tsx'

interface Props {
  businessId: string
  initialCoupons: Coupon[]
}

export default function CouponManager({ businessId, initialCoupons }: Props) {
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form states
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'basic' | 'special'>('basic')
  const [discountPercent, setDiscountPercent] = useState<string>('')
  const [description, setDescription] = useState('')
  const [globalLimit, setGlobalLimit] = useState<string>('')
  const [userMonthlyLimit, setUserMonthlyLimit] = useState<string>('')
  const [validUntil, setValidUntil] = useState('')

  async function handleSubmit(e: Event) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('O título é obrigatório.')
      return
    }

    const discount = parseInt(discountPercent)
    if (isNaN(discount) || discount < 5 || discount > 30) {
      setError('O desconto deve ser entre 5% e 30%.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/businesses/${businessId}/coupons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          type,
          discountPercent: discount,
          description: description.trim(),
          globalLimit: globalLimit ? parseInt(globalLimit) : null,
          userMonthlyLimit: userMonthlyLimit
            ? parseInt(userMonthlyLimit)
            : null,
          validUntil: validUntil ? new Date(validUntil).getTime() : null,
          isActive: true,
        }),
      })

      if (res.ok) {
        const newCoupon = await res.json()
        setCoupons([newCoupon, ...coupons])
        setShowForm(false)
        resetForm()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(
          data.error ||
            'Erro ao criar cupom. Verifique os dados e tente novamente.',
        )
      }
    } catch {
      setError('Erro de conexão. Verifique sua internet.')
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setTitle('')
    setType('basic')
    setDiscountPercent('')
    setDescription('')
    setGlobalLimit('')
    setUserMonthlyLimit('')
    setValidUntil('')
  }

  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <h3 className='text-lg font-medium text-slate-900'>
          Cupons Cadastrados
        </h3>
        <Button
          onClick={() => setShowForm(!showForm)}
          variant={showForm ? 'outline' : 'default'}
        >
          {showForm ? 'Cancelar' : 'Novo Cupom'}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className='bg-slate-50 p-6 rounded-lg border border-slate-200 space-y-4'
        >
          <h4 className='font-semibold text-slate-800 text-sm'>
            Novo Cupom de Desconto
          </h4>

          {error && (
            <div className='bg-red-50 text-red-600 p-3 rounded text-sm border border-red-100'>
              {error}
            </div>
          )}

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='space-y-1'>
              <label className='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>
                Título do Cupom
              </label>
              <input
                type='text'
                value={title}
                onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
                placeholder='Ex: Desconto Especial de Inauguração'
                className='w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white'
                required
              />
            </div>
            <div className='space-y-1'>
              <label className='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>
                Tipo
              </label>
              <select
                value={type}
                onChange={(e) =>
                  setType(
                    (e.target as HTMLSelectElement).value as
                      | 'basic'
                      | 'special',
                  )}
                className='w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none'
              >
                <option value='basic'>Básico (Mensal)</option>
                <option value='special'>Especial (Limitado)</option>
              </select>
            </div>
            <div className='space-y-1'>
              <label className='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>
                Desconto (%)
              </label>
              <input
                type='number'
                value={discountPercent}
                onInput={(e) =>
                  setDiscountPercent((e.target as HTMLInputElement).value)}
                placeholder='5 - 30'
                min='5'
                max='30'
                className='w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white'
                required
              />
            </div>
            <div className='space-y-1'>
              <label className='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>
                Validade (Opcional)
              </label>
              <input
                type='date'
                value={validUntil}
                onInput={(e) =>
                  setValidUntil((e.target as HTMLInputElement).value)}
                className='w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white'
              />
            </div>
            <div className='space-y-1'>
              <label className='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>
                Limite Global (Opcional)
              </label>
              <input
                type='number'
                value={globalLimit}
                onInput={(e) =>
                  setGlobalLimit((e.target as HTMLInputElement).value)}
                placeholder='Ex: 50 (total de resgates)'
                className='w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white'
              />
            </div>
            <div className='space-y-1'>
              <label className='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>
                Limite por Usuário (Mensal)
              </label>
              <input
                type='number'
                value={userMonthlyLimit}
                onInput={(e) =>
                  setUserMonthlyLimit((e.target as HTMLInputElement).value)}
                placeholder='Ex: 1'
                className='w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white'
              />
            </div>
          </div>

          <div className='space-y-1'>
            <label className='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>
              Descrição (Opcional)
            </label>
            <textarea
              value={description}
              onInput={(e) =>
                setDescription((e.target as HTMLTextAreaElement).value)}
              placeholder='Descreva as condições do desconto...'
              rows={2}
              className='w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white'
            />
          </div>

          <div className='flex justify-end pt-2'>
            <Button type='submit' disabled={loading}>
              {loading ? 'Criando...' : 'Criar Cupom'}
            </Button>
          </div>
        </form>
      )}

      <div className='overflow-x-auto border border-slate-200 rounded-lg'>
        <table className='w-full text-sm text-left'>
          <thead className='bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider'>
            <tr>
              <th className='px-6 py-3'>Cupom</th>
              <th className='px-6 py-3'>Tipo</th>
              <th className='px-6 py-3'>Desconto</th>
              <th className='px-6 py-3'>Uso (Global)</th>
              <th className='px-6 py-3 text-right'>Status</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-200'>
            {coupons.length === 0
              ? (
                <tr>
                  <td
                    colSpan={5}
                    className='px-6 py-10 text-center text-slate-500'
                  >
                    Nenhum cupom cadastrado ainda.
                  </td>
                </tr>
              )
              : (
                coupons.map((coupon) => (
                  <tr
                    key={coupon.id}
                    className='hover:bg-slate-50 transition-colors'
                  >
                    <td className='px-6 py-4'>
                      <div className='font-medium text-slate-900'>
                        {coupon.title}
                      </div>
                      {coupon.description && (
                        <div className='text-xs text-slate-500 truncate max-w-xs'>
                          {coupon.description}
                        </div>
                      )}
                    </td>
                    <td className='px-6 py-4 capitalize'>
                      {coupon.type === 'basic' ? 'Básico' : 'Especial'}
                    </td>
                    <td className='px-6 py-4'>
                      <span className='font-semibold text-blue-600'>
                        {coupon.discountPercent}%
                      </span>
                    </td>
                    <td className='px-6 py-4'>
                      <div className='flex flex-col gap-1.5 w-32'>
                        <div className='flex justify-between text-[10px] font-medium text-slate-600'>
                          <span>Resgatados</span>
                          <span>
                            {coupon.globalClaimedCount} /{' '}
                            {coupon.globalLimit || '∞'}
                          </span>
                        </div>
                        {coupon.globalLimit
                          ? (
                            <div className='w-full h-1.5 bg-slate-200 rounded-full overflow-hidden'>
                              <div
                                className='h-full bg-blue-500 transition-all duration-500'
                                style={{
                                  width: `${
                                    Math.min(
                                      100,
                                      (coupon.globalClaimedCount /
                                        coupon.globalLimit) * 100,
                                    )
                                  }%`,
                                }}
                              />
                            </div>
                          )
                          : (
                            <div className='w-full h-1.5 bg-slate-200 rounded-full overflow-hidden'>
                              <div className='h-full bg-slate-400 w-full opacity-30' />
                            </div>
                          )}
                      </div>
                    </td>
                    <td className='px-6 py-4 text-right'>
                      <Badge
                        variant={coupon.isActive ? 'default' : 'secondary'}
                      >
                        {coupon.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
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

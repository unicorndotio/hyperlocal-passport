import { useEffect, useState } from 'preact/hooks'
import { formatBRL } from '@/lib/utils.ts'
import type { Transaction } from '@/lib/coupon.ts'

interface CouponAnalytics {
  couponId: string
  couponTitle: string
  views: number
  redemptions: number
  validations: number
}

interface AnalyticsTotals {
  views: number
  redemptions: number
  validations: number
  conversionRate: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface AnalyticsData {
  totals: AnalyticsTotals
  coupons: CouponAnalytics[]
  transactions: (Transaction & { couponTitle: string })[]
  pagination: Pagination
}

interface AnalyticsDashboardProps {
  businessId: string
}

export default function AnalyticsDashboard(
  { businessId }: AnalyticsDashboardProps,
) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const limit = 20

  useEffect(() => {
    fetchAnalytics(page)
  }, [page])

  async function fetchAnalytics(pageNum: number) {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(
        `/api/businesses/${businessId}/analytics?page=${pageNum}&limit=${limit}`,
      )
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Failed to load analytics')
      }
      const json: AnalyticsData = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !data) {
    return (
      <div class='p-12 text-center text-slate-400'>
        Carregando analytics...
      </div>
    )
  }

  if (error) {
    return (
      <div class='p-12 text-center text-red-500'>
        Erro: {error}
      </div>
    )
  }

  if (!data) {
    return (
      <div class='p-12 text-center text-slate-400'>
        Nenhum dado disponível.
      </div>
    )
  }

  const { totals, coupons, transactions, pagination } = data
  const hasData = coupons.length > 0

  return (
    <div class='space-y-8'>
      {/* Summary Cards */}
      <div class='grid grid-cols-2 lg:grid-cols-4 gap-4'>
        <SummaryCard
          title='Visualizações'
          value={totals.views.toLocaleString('pt-BR')}
          color='blue'
        />
        <SummaryCard
          title='Resgates'
          value={totals.redemptions.toLocaleString('pt-BR')}
          color='green'
        />
        <SummaryCard
          title='Validações'
          value={totals.validations.toLocaleString('pt-BR')}
          color='purple'
        />
        <SummaryCard
          title='Taxa de Conversão'
          value={`${(totals.conversionRate * 100).toFixed(1)}%`}
          color='amber'
        />
      </div>

      {/* Per-Coupon Funnel */}
      <div class='bg-white rounded-xl border border-slate-200 p-6'>
        <h2 class='text-lg font-bold text-slate-900 mb-6'>
          Desempenho por Cupom
        </h2>

        {!hasData
          ? (
            <div class='py-12 text-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50'>
              <p class='text-slate-400 font-medium mb-2'>
                Nenhum cupom criado ainda
              </p>
              <p class='text-slate-400 text-sm'>
                Crie seus primeiros cupons na aba "Meus Cupons" para começar a
                acompanhar o desempenho.
              </p>
            </div>
          )
          : (
            <div class='space-y-6'>
              {coupons.map((coupon) => {
                const maxVal = Math.max(
                  coupon.views,
                  coupon.redemptions,
                  coupon.validations,
                  1,
                )
                return (
                  <div
                    key={coupon.couponId}
                    class='border border-slate-100 rounded-lg p-4 bg-slate-50/50'
                  >
                    <h3 class='font-semibold text-slate-900 mb-3'>
                      {coupon.couponTitle}
                    </h3>
                    <div class='space-y-2'>
                      <FunnelBar
                        label='Visualizações'
                        value={coupon.views}
                        max={maxVal}
                        color='bg-blue-500'
                      />
                      <FunnelBar
                        label='Resgates'
                        value={coupon.redemptions}
                        max={maxVal}
                        color='bg-green-500'
                      />
                      <FunnelBar
                        label='Validações'
                        value={coupon.validations}
                        max={maxVal}
                        color='bg-purple-500'
                      />
                    </div>
                    {coupon.views > 0 && (
                      <div class='mt-2 text-xs text-slate-400 text-right'>
                        Conversão: {(
                          (coupon.redemptions / coupon.views) *
                          100
                        ).toFixed(1)}
                        % | Validação: {(
                          (coupon.validations /
                            Math.max(coupon.redemptions, 1)) *
                          100
                        ).toFixed(1)}
                        %
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
      </div>

      {/* Transaction History */}
      <div class='bg-white rounded-xl border border-slate-200 p-6'>
        <h2 class='text-lg font-bold text-slate-900 mb-6'>
          Histórico de Transações
        </h2>

        {transactions.length === 0
          ? (
            <div class='py-12 text-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50'>
              <p class='text-slate-400 font-medium'>
                Nenhuma transação registrada ainda
              </p>
              <p class='text-slate-400 text-sm mt-1'>
                As transações aparecerão aqui conforme os cupons forem validados
                no caixa.
              </p>
            </div>
          )
          : (
            <>
              <div class='overflow-x-auto'>
                <table class='w-full text-sm text-left'>
                  <thead class='border-b border-slate-200'>
                    <tr>
                      <th class='px-3 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider'>
                        Data
                      </th>
                      <th class='px-3 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider'>
                        Cupom
                      </th>
                      <th class='px-3 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider'>
                        Usuário
                      </th>
                      <th class='px-3 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider text-right'>
                        Total
                      </th>
                      <th class='px-3 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider text-right'>
                        Desconto
                      </th>
                      <th class='px-3 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider text-right'>
                        Final
                      </th>
                    </tr>
                  </thead>
                  <tbody class='divide-y divide-slate-100'>
                    {transactions.map((tx) => (
                      <tr
                        key={tx.id}
                        class='hover:bg-slate-50 transition-colors'
                      >
                        <td class='px-3 py-3 text-slate-600 whitespace-nowrap'>
                          {new Date(tx.timestamp).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </td>
                        <td class='px-3 py-3 text-slate-900 font-medium'>
                          {tx.couponTitle}
                        </td>
                        <td class='px-3 py-3 text-slate-500 font-mono text-xs'>
                          {tx.userId.slice(0, 12)}...
                        </td>
                        <td class='px-3 py-3 text-slate-900 text-right'>
                          {formatBRL(tx.totalAmountCents)}
                        </td>
                        <td class='px-3 py-3 text-green-600 text-right font-medium'>
                          -{formatBRL(tx.discountAppliedCents)}
                        </td>
                        <td class='px-3 py-3 text-slate-900 text-right font-semibold'>
                          {formatBRL(tx.finalAmountCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div class='flex items-center justify-between mt-6 pt-4 border-t border-slate-100'>
                  <p class='text-sm text-slate-500'>
                    Página {pagination.page} de {pagination.totalPages} (
                    {pagination.total} transações)
                  </p>
                  <div class='flex items-center gap-2'>
                    <button
                      type='button'
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      class='px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
                    >
                      Anterior
                    </button>
                    <button
                      type='button'
                      onClick={() =>
                        setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={page >= pagination.totalPages}
                      class='px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
                    >
                      Próximo
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
      </div>
    </div>
  )
}

function SummaryCard(
  { title, value, color }: {
    title: string
    value: string
    color: 'blue' | 'green' | 'purple' | 'amber'
  },
) {
  const colorMap = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600',
  }

  return (
    <div class='bg-white rounded-xl border border-slate-200 p-5'>
      <p class='text-xs font-medium text-slate-400 uppercase tracking-wider mb-1'>
        {title}
      </p>
      <p
        class={`text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r ${
          colorMap[color]
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function FunnelBar(
  { label, value, max, color }: {
    label: string
    value: number
    max: number
    color: string
  },
) {
  const pct = max > 0 ? (value / max) * 100 : 0

  return (
    <div class='flex items-center gap-3'>
      <span class='w-24 text-xs text-slate-500 text-right flex-shrink-0'>
        {label}
      </span>
      <div class='flex-1 h-5 bg-slate-100 rounded-full overflow-hidden'>
        <div
          class={`h-full rounded-full transition-all duration-500 ${color}`}
          style={`width: ${pct}%`}
        />
      </div>
      <span class='w-16 text-xs font-semibold text-slate-700 text-right flex-shrink-0'>
        {value.toLocaleString('pt-BR')}
      </span>
    </div>
  )
}

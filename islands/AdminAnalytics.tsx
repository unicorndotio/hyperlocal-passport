import { useEffect, useState } from 'preact/hooks'
import { formatBRL } from '@/lib/utils.ts'

interface BusinessAnalytics {
  businessId: string
  businessName: string
  couponCount: number
  totalViews: number
  totalRedemptions: number
  totalValidations: number
}

interface AdminAnalyticsData {
  totalCoupons: number
  totalViews: number
  totalRedemptions: number
  totalValidations: number
  totalDiscountCents: number
  perBusiness: BusinessAnalytics[]
}

export default function AdminAnalytics() {
  const [data, setData] = useState<AdminAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  async function fetchAnalytics() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/analytics')
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Failed to load analytics')
      }
      const json: AdminAnalyticsData = await res.json()
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
        Loading analytics...
      </div>
    )
  }

  if (error) {
    return (
      <div class='p-12 text-center text-red-500'>
        Error: {error}
      </div>
    )
  }

  const hasData = data && data.totalCoupons > 0

  return (
    <div class='space-y-8'>
      {/* Summary Cards */}
      <div class='grid grid-cols-2 lg:grid-cols-5 gap-4'>
        <SummaryCard
          title='Total Coupons'
          value={data?.totalCoupons.toLocaleString('en-US') ?? '0'}
          color='blue'
        />
        <SummaryCard
          title='Total Views'
          value={data?.totalViews.toLocaleString('en-US') ?? '0'}
          color='green'
        />
        <SummaryCard
          title='Total Redemptions'
          value={data?.totalRedemptions.toLocaleString('en-US') ?? '0'}
          color='purple'
        />
        <SummaryCard
          title='Total Validations'
          value={data?.totalValidations.toLocaleString('en-US') ?? '0'}
          color='amber'
        />
        <SummaryCard
          title='Total Discount Given'
          value={data ? formatBRL(data.totalDiscountCents) : 'R$ 0,00'}
          color='red'
        />
      </div>

      {/* Per-Business Breakdown */}
      <div class='bg-white rounded-xl border border-slate-200 p-6'>
        <h2 class='text-lg font-bold text-slate-900 mb-6'>
          Per-Business Breakdown
        </h2>

        {!hasData
          ? (
            <div class='py-12 text-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50'>
              <p class='text-slate-400 font-medium mb-2'>
                No data available
              </p>
              <p class='text-slate-400 text-sm'>
                Create coupons across businesses to see analytics here.
              </p>
            </div>
          )
          : (
            <div class='overflow-x-auto'>
              <table class='w-full text-sm text-left'>
                <thead class='border-b border-slate-200'>
                  <tr>
                    <th class='px-3 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider'>
                      Business
                    </th>
                    <th class='px-3 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider text-right'>
                      Coupons
                    </th>
                    <th class='px-3 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider text-right'>
                      Views
                    </th>
                    <th class='px-3 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider text-right'>
                      Redemptions
                    </th>
                    <th class='px-3 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider text-right'>
                      Validations
                    </th>
                  </tr>
                </thead>
                <tbody class='divide-y divide-slate-100'>
                  {data!.perBusiness.map((biz) => (
                    <tr
                      key={biz.businessId}
                      class='hover:bg-slate-50 transition-colors'
                    >
                      <td class='px-3 py-3 text-slate-900 font-medium'>
                        {biz.businessName}
                      </td>
                      <td class='px-3 py-3 text-slate-900 text-right'>
                        {biz.couponCount.toLocaleString('en-US')}
                      </td>
                      <td class='px-3 py-3 text-slate-900 text-right'>
                        {biz.totalViews.toLocaleString('en-US')}
                      </td>
                      <td class='px-3 py-3 text-slate-900 text-right'>
                        {biz.totalRedemptions.toLocaleString('en-US')}
                      </td>
                      <td class='px-3 py-3 text-slate-900 text-right'>
                        {biz.totalValidations.toLocaleString('en-US')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  )
}

function SummaryCard(
  { title, value, color }: {
    title: string
    value: string
    color: 'blue' | 'green' | 'purple' | 'amber' | 'red'
  },
) {
  const colorMap = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-600',
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

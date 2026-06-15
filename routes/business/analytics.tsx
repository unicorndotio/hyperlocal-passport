import { define } from '@/utils.ts'
import { auth } from '@/lib/auth.ts'
import { kv } from '@/lib/kv.ts'
import { getDenoKvAdapterRaw } from '@/lib/kv-adapter.ts'
import type { Business } from '@/lib/business.ts'
import AnalyticsDashboard from '@/islands/AnalyticsDashboard.tsx'
import BusinessHeader from '@/components/BusinessHeader.tsx'
import BusinessOnboarding from '@/islands/BusinessOnboarding.tsx'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx'

const adapter = getDenoKvAdapterRaw(kv)

export default define.page(async function BusinessAnalyticsPage(ctx) {
  const session = await auth.api.getSession({ headers: ctx.req.headers })

  if (
    !session ||
    (session.user.role !== 'business' && session.user.role !== 'admin')
  ) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/login' },
    })
  }

  const business = await adapter.findOne<Business>({
    model: 'businesses',
    where: [{ field: 'userId', value: session.user.id }],
  })

  if (!business) {
    return (
      <div class='min-h-screen bg-slate-50 flex items-center justify-center p-4'>
        <Card className='max-w-md w-full'>
          <CardHeader>
            <CardTitle className='text-red-600'>Acesso Restrito</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-slate-600'>
              Não encontramos uma empresa associada ao seu usuário. Se você é um
              parceiro, entre em contato com o suporte para vincular sua conta.
            </p>
            <div className='mt-6'>
              <a
                href='/'
                className='text-blue-600 hover:underline text-sm font-medium'
              >
                Voltar para o início
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-slate-50'>
      <BusinessOnboarding business={business} businessId={business.id} />
      <BusinessHeader active='analytics' businessName={business.name} />

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <h1 className='text-2xl font-black text-slate-900 mb-8'>
          Analytics
        </h1>
        <AnalyticsDashboard businessId={business.id} />
      </main>
    </div>
  )
})

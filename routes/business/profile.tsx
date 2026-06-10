import { define } from '@/utils.ts'
import { auth } from '@/lib/auth.ts'
import { kv } from '@/lib/kv.ts'
import { getDenoKvAdapterRaw } from '@/lib/kv-adapter.ts'
import type { Business } from '@/lib/business.ts'
import BusinessProfileEditor from '@/islands/BusinessProfileEditor.tsx'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx'

const adapter = getDenoKvAdapterRaw(kv)

export default define.page(async function BusinessProfilePage(ctx) {
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
      <header className='bg-white border-b sticky top-0 z-10'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between'>
          <div className='flex items-center gap-8'>
            <h1 className='text-xl font-bold text-slate-900'>
              Painel do Lojista
            </h1>
            <nav className='flex items-center gap-4'>
              <a
                href='/business/coupons'
                className='text-sm text-slate-500 hover:text-slate-900 transition-colors'
              >
                Meus Cupons
              </a>
              <span className='text-slate-300'>|</span>
              <a
                href='/business/checkout'
                className='text-sm text-slate-500 hover:text-slate-900 transition-colors'
              >
                Validar Cupom
              </a>
              <span className='text-slate-300'>|</span>
              <a
                href='/business/profile'
                className='text-sm font-semibold text-blue-600 transition-colors'
              >
                Meu Perfil
              </a>
            </nav>
          </div>
          <div className='flex items-center gap-4 text-sm font-medium text-slate-700'>
            <span>{business.name}</span>
          </div>
        </div>
      </header>

      <main className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <BusinessProfileEditor business={business} />
      </main>
    </div>
  )
})

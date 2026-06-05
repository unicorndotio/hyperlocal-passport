import { define } from '../utils.ts'
import { auth } from '../lib/auth.ts'
import { kv } from '../lib/kv.ts'
import { Redemption } from '../lib/coupon.ts'
import { Business } from '../lib/business.ts'
import { Head } from 'fresh/runtime'
import QRCodeDisplay from '../islands/QRCodeDisplay.tsx'
import { Card, CardContent } from '@/components/ui/card.tsx'

export const handler = define.handlers({
  async GET(ctx) {
    const session = await auth.api.getSession({ headers: ctx.req.headers })

    if (!session) {
      return ctx.redirect('/login')
    }

    const userId = session.user.id

    // Fetch active redemptions
    const entries = kv.list<Redemption>({
      prefix: ['user_redemptions', userId],
    }, { reverse: true })
    const activeRedemptions = []

    // We also need business names for display
    const businessMap = new Map<string, string>()

    for await (const entry of entries) {
      if (entry.value.status === 'active') {
        const r = entry.value
        if (!businessMap.has(r.businessId)) {
          const b = await kv.get<Business>(['businesses', r.businessId])
          businessMap.set(r.businessId, b.value?.name || 'Empresa')
        }
        activeRedemptions.push({
          ...r,
          businessName: businessMap.get(r.businessId),
        })
      }
    }

    return ctx.render({ redemptions: activeRedemptions })
  },
})

export default define.page<typeof handler>(function PassaportePage(ctx) {
  const { redemptions } = ctx.data

  return (
    <div class='px-4 py-6 max-w-md mx-auto min-h-screen bg-background'>
      <Head>
        <title>Meu Passaporte - Passaporte Local</title>
      </Head>

      <header class='mb-8 px-2'>
        <h1 class='text-3xl font-black text-primary mb-2 tracking-tight'>
          Meu Passaporte
        </h1>
        <p class='text-muted-foreground text-sm font-bold uppercase tracking-tighter opacity-70'>
          Seus cupons ativos para usar no caixa.
        </p>
      </header>

      <div class='grid gap-10'>
        {redemptions.length === 0
          ? (
            <div class='text-center py-16 bg-card rounded-[2.5rem] border border-dashed border-border px-8 shadow-sm'>
              <div class='w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  width='32'
                  height='32'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  stroke-width='2.5'
                  stroke-linecap='round'
                  stroke-linejoin='round'
                  class='text-primary/40'
                >
                  <path d='M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z' />
                  <path d='M3 6h18' />
                  <path d='M16 10a4 4 0 0 1-8 0' />
                </svg>
              </div>
              <h3 class='text-xl font-black mb-2 tracking-tight'>
                Nenhum cupom ativo
              </h3>
              <p class='text-muted-foreground text-sm mb-8 leading-relaxed'>
                Explore o catálogo e resgate descontos exclusivos nas lojas do
                seu bairro.
              </p>
              <a
                href='/catalog'
                class='inline-flex items-center justify-center rounded-2xl bg-primary px-8 py-4 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95'
              >
                EXPLORAR CATÁLOGO
              </a>
            </div>
          )
          : (
            redemptions.map((r) => (
              <Card
                key={r.id}
                className='border-none shadow-2xl bg-card overflow-hidden rounded-[2.5rem] ring-1 ring-border'
              >
                <CardContent className='p-0'>
                  <div class='bg-primary/5 p-8 border-b border-dashed border-border/50 flex flex-col items-center text-center'>
                    <span class='text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2 opacity-80'>
                      VÁLIDO EM
                    </span>
                    <h2 class='text-2xl font-black text-foreground tracking-tight leading-tight'>
                      {r.businessName}
                    </h2>
                  </div>

                  <div class='p-10 flex flex-col items-center'>
                    <QRCodeDisplay code={r.id} />

                    <div class='mt-10 text-center w-full'>
                      <span class='text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] block mb-3 opacity-60'>
                        CÓDIGO DE RESGATE
                      </span>
                      <div class='text-3xl font-mono font-black tracking-[0.4em] text-primary bg-primary/5 px-4 py-5 rounded-2xl border border-primary/10 shadow-inner'>
                        {r.id}
                      </div>
                    </div>

                    <div class='mt-10 flex flex-col items-center gap-2'>
                      <div class='flex items-center gap-2 text-primary'>
                        <svg
                          xmlns='http://www.w3.org/2000/svg'
                          width='16'
                          height='16'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          stroke-width='3'
                          stroke-linecap='round'
                          stroke-linejoin='round'
                        >
                          <path d='m21 16-4 4-4-4' />
                          <path d='M17 20V4' />
                        </svg>
                        <span class='text-[10px] font-black uppercase tracking-widest'>
                          Apresente no caixa
                        </span>
                      </div>
                      <p class='text-[9px] text-muted-foreground text-center max-w-[220px] leading-relaxed font-bold uppercase tracking-tighter opacity-60'>
                        O LOJISTA IRÁ VALIDAR ESTE CÓDIGO PARA APLICAR SEU
                        DESCONTO.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
      </div>

      {/* Bottom Nav reused */}
      <nav class='fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t border-border px-6 py-3 flex justify-around items-center max-w-md mx-auto z-50'>
        <a
          href='/catalog'
          class='flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors'
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='20'
            height='20'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            stroke-width='2.5'
            stroke-linecap='round'
            stroke-linejoin='round'
          >
            <rect width='7' height='7' x='3' y='3' rx='1' />
            <rect width='7' height='7' x='14' y='3' rx='1' />
            <rect width='7' height='7' x='14' y='14' rx='1' />
            <rect width='7' height='7' x='3' y='14' rx='1' />
          </svg>
          <span class='text-[10px] font-black uppercase'>Catálogo</span>
        </a>
        <a
          href='/passaporte'
          class='flex flex-col items-center gap-1 text-primary'
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='20'
            height='20'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            stroke-width='2.5'
            stroke-linecap='round'
            stroke-linejoin='round'
          >
            <path d='M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z' />
            <circle cx='12' cy='10' r='3' />
          </svg>
          <span class='text-[10px] font-black uppercase'>Passaporte</span>
        </a>
      </nav>
      <div class='h-24' />
    </div>
  )
})

import { define } from '../../utils.ts'
import { kv } from '../../lib/kv.ts'
import { getDenoKvAdapterRaw } from '../../lib/kv-adapter.ts'
import { Business } from '../../lib/business.ts'
import { Coupon } from '../../lib/coupon.ts'
import { Head } from 'fresh/runtime'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import RedeemButton from '../../islands/RedeemButton.tsx'

export const handler = define.handlers({
  async GET(ctx) {
    const { id } = ctx.params
    const businessRes = await kv.get<Business>(['businesses', id])

    if (!businessRes.value) {
      return new Response('Not Found', { status: 404 })
    }

    const business = businessRes.value
    const adapter = getDenoKvAdapterRaw(kv)
    const coupons = await adapter.findMany<Coupon>({
      model: 'coupons',
      where: [{ field: 'businessId', value: id }, {
        field: 'isActive',
        value: true,
      }],
    })

    return ctx.render({ business, coupons })
  },
})

export default define.page<typeof handler>(function BusinessDetailPage(ctx) {
  const { business, coupons } = ctx.data as {
    business: Business
    coupons: Coupon[]
  }

  return (
    <div class='px-4 py-6 max-w-md mx-auto min-h-screen bg-background'>
      <Head>
        <title>{business.name} - Passaporte Local</title>
      </Head>

      <a
        href='/catalog'
        class='inline-flex items-center text-sm text-primary font-bold mb-6 hover:translate-x-1 transition-transform'
      >
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
          class='mr-2'
        >
          <path d='m15 18-6-6 6-6' />
        </svg>
        VOLTAR
      </a>

      <header class='flex flex-col items-center mb-10 text-center'>
        <div class='w-24 h-24 rounded-2xl overflow-hidden bg-card mb-4 border border-border shadow-sm p-1'>
          <img
            src={business.logoUrl || '/logo.svg'}
            alt={business.name}
            class='w-full h-full object-cover rounded-xl'
          />
        </div>
        <Badge
          variant='outline'
          className='mb-2 uppercase tracking-widest text-[10px] font-black'
        >
          {business.category}
        </Badge>
        <h1 class='text-2xl font-black text-foreground tracking-tight'>
          {business.name}
        </h1>
        <p class='text-muted-foreground mt-3 text-sm leading-relaxed max-w-xs'>
          {business.description ||
            'Esta empresa faz parte do Passaporte Local e oferece benefícios exclusivos para moradores.'}
        </p>
      </header>

      <section class='mb-20'>
        <h2 class='text-lg font-black mb-5 flex items-center gap-2 tracking-tight'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='22'
            height='22'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            stroke-width='3'
            stroke-linecap='round'
            stroke-linejoin='round'
            class='text-primary'
          >
            <path d='M20.91 8.84 8.56 2.23a1.93 1.93 0 0 0-1.81 0L3.1 4.13a2.12 2.12 0 0 0-.05 3.69l12.22 6.93a2 2 0 0 0 1.94 0L21 12.51a2.12 2.12 0 0 0-.09-3.67Z' />
            <path d='m3 8 8 4.5' />
            <path d='m3 12 8 4.5' />
            <path d='m3 16 8 4.5' />
            <path d='m21 12-8 4.5' />
            <path d='m21 16-8 4.5' />
          </svg>
          Benefícios Disponíveis
        </h2>

        <div class='grid gap-5'>
          {coupons.length === 0
            ? (
              <div class='text-center py-12 bg-card rounded-2xl border border-dashed border-border px-6'>
                <p class='text-muted-foreground text-sm'>
                  Nenhum cupom ativo no momento para esta empresa.
                </p>
              </div>
            )
            : (
              coupons.map((coupon: Coupon) => (
                <Card
                  key={coupon.id}
                  className='border-none shadow-sm bg-card overflow-hidden rounded-2xl ring-1 ring-border'
                >
                  <CardHeader className='pb-3'>
                    <div class='flex justify-between items-start'>
                      <CardTitle className='text-lg font-black text-foreground tracking-tight leading-tight'>
                        {coupon.title}
                      </CardTitle>
                      {coupon.discountPercent && (
                        <span class='bg-primary/10 text-primary text-[10px] font-black px-2 py-1 rounded-full border border-primary/20'>
                          -{coupon.discountPercent}% OFF
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className='pb-6'>
                    <p class='text-muted-foreground text-xs mb-6 leading-relaxed'>
                      {coupon.description ||
                        `Aproveite este benefício exclusivo do Passaporte Local.`}
                    </p>

                    <RedeemButton couponId={coupon.id} />
                  </CardContent>
                </Card>
              ))
            )}
        </div>
      </section>

      {/* Bottom Nav reused */}
      <nav class='fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t border-border px-6 py-3 flex justify-around items-center max-w-md mx-auto z-50'>
        <a
          href='/catalog'
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
            <rect width='7' height='7' x='3' y='3' rx='1' />
            <rect width='7' height='7' x='14' y='3' rx='1' />
            <rect width='7' height='7' x='14' y='14' rx='1' />
            <rect width='7' height='7' x='3' y='14' rx='1' />
          </svg>
          <span class='text-[10px] font-black uppercase'>Catálogo</span>
        </a>
        <a
          href='/passaporte'
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

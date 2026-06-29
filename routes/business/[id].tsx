import { define } from '../../utils.ts'
import { page } from 'fresh'
import { Business } from '../../lib/business.ts'
import { Coupon } from '../../lib/coupon.ts'
import { incrementViewCount } from '../../lib/analytics.ts'
import { Head } from 'fresh/runtime'
import { db } from '@/lib/db.ts'
import * as schema from '@/db/schema.ts'
import { and, eq } from 'drizzle-orm'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import RedeemButton from '../../islands/RedeemButton.tsx'
import BottomNav from '../../components/BottomNav.tsx'

export const handler = define.handlers({
  async GET(ctx) {
    const { id } = ctx.params
    const [business] = await db.select().from(schema.businesses).where(
      eq(schema.businesses.id, id),
    ).limit(1) as unknown as Business[]

    if (!business) {
      return new Response('Not Found', { status: 404 })
    }

    const coupons = await db.select().from(schema.coupons).where(
      and(eq(schema.coupons.businessId, id), eq(schema.coupons.isActive, true)),
    ) as unknown as Coupon[]

    // Fire-and-forget view counter increment for each displayed coupon
    for (const coupon of coupons) {
      incrementViewCount(coupon.id)
    }

    return page({ business, coupons })
  },
})

export default define.page<typeof handler>(function BusinessDetailPage(ctx) {
  const { business, coupons } = ctx.data

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
                      {coupon.behavior.type === 'percentage_discount' && (
                        <span class='bg-primary/10 text-primary text-[10px] font-black px-2 py-1 rounded-full border border-primary/20'>
                          -{coupon.behavior.percent}% OFF
                        </span>
                      )}
                      {coupon.behavior.type === 'fixed_amount' && (
                        <span class='bg-primary/10 text-primary text-[10px] font-black px-2 py-1 rounded-full border border-primary/20'>
                          -R$ {(coupon.behavior.amountCents / 100).toFixed(2)}
                        </span>
                      )}
                      {coupon.behavior.type === 'bogo' && (
                        <span class='bg-primary/10 text-primary text-[10px] font-black px-2 py-1 rounded-full border border-primary/20'>
                          {coupon.behavior.buyQuantity}+{coupon.behavior
                            .freeQuantity}
                        </span>
                      )}
                      {coupon.behavior.type === 'item_specific' && (
                        <span class='bg-primary/10 text-primary text-[10px] font-black px-2 py-1 rounded-full border border-primary/20'>
                          Item Específico
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

      <BottomNav active='catalog' />
      <div class='h-24' />
    </div>
  )
})

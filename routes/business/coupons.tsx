import { define } from '@/utils.ts'
import { auth } from '@/lib/auth.ts'
import type { Business } from '@/lib/business.ts'
import type { Coupon } from '@/lib/coupon.ts'
import { db } from '@/lib/db.ts'
import * as schema from '@/db/schema.ts'
import { eq } from 'drizzle-orm'
import CouponManager from '@/islands/CouponManager.tsx'
import BusinessHeader from '@/components/BusinessHeader.tsx'
import BusinessOnboarding from '@/islands/BusinessOnboarding.tsx'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx'

export default define.page(async function BusinessCouponsPage(ctx) {
  const session = await auth.api.getSession({ headers: ctx.req.headers })

  if (!session || session.user.role !== 'business') {
    return new Response(null, {
      status: 302,
      headers: { Location: '/login' },
    })
  }

  // Find business for this user
  const [business] = await db.select().from(schema.businesses).where(
    eq(schema.businesses.userId, session.user.id),
  ).limit(1) as unknown as Business[]

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

  // Fetch coupons
  const coupons = await db.select().from(schema.coupons).where(
    eq(schema.coupons.businessId, business.id),
  ) as unknown as Coupon[]

  return (
    <div className='min-h-screen bg-slate-50'>
      <BusinessOnboarding business={business} businessId={business.id} />
      <BusinessHeader active='coupons' businessName={business.name} />

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <Card>
          <CardHeader>
            <CardTitle>Gerenciamento de Cupons</CardTitle>
          </CardHeader>
          <CardContent>
            <CouponManager businessId={business.id} initialCoupons={coupons} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
})

import { define } from '../utils.ts'
import { page } from 'fresh'
import { db } from '../lib/db.ts'
import { businesses } from '../db/schema.ts'
import { eq } from 'drizzle-orm'
import { Business } from '../lib/business.ts'
import { Head } from 'fresh/runtime'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import SignalRequestIsland from '../islands/SignalRequestIsland.tsx'
import BottomNav from '../components/BottomNav.tsx'

export const handler = define.handlers({
  async GET(ctx) {
    const rows = await db.select()
      .from(businesses)
      .where(eq(businesses.isActive, true))

    const businessesList: Business[] = rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      name: row.name,
      companyName: row.companyName,
      cnpj: row.cnpj,
      category: row.category,
      description: row.description ?? undefined,
      logoUrl: row.logoUrl,
      socialLinks: row.socialLinks ?? undefined,
      openingHours: row.openingHours ?? undefined,
      isActive: row.isActive,
      createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
      hasSeenMerchantOnboarding: row.hasSeenMerchantOnboarding ?? undefined,
    }))

    const url = new URL(ctx.req.url)
    const category = url.searchParams.get('category')

    let filtered = businessesList
    if (category && category !== 'Todos') {
      filtered = businessesList.filter((b) => b.category === category)
    }

    // Extract unique categories from all businesses
    const allCategories = [
      'Todos',
      ...new Set(businessesList.map((b) => b.category)),
    ].sort()
    const selectedCategory = category || 'Todos'

    return page({
      businesses: filtered,
      categories: allCategories,
      selectedCategory,
      user: ctx.state.user,
    })
  },
})

export default define.page<typeof handler>(function CatalogPage(ctx) {
  const { businesses, categories, selectedCategory, user } = ctx.data

  return (
    <div class='px-4 py-6 max-w-md mx-auto min-h-screen bg-background'>
      <Head>
        <title>Catálogo - Passaporte Local</title>
      </Head>

      <header class='mb-8'>
        <h1 class='text-3xl font-bold text-primary mb-2'>Comércio Local</h1>
        <p class='text-muted-foreground text-sm'>
          Descubra benefícios exclusivos no seu bairro.
        </p>
      </header>

      {/* Categories Filter */}
      <div class='flex overflow-x-auto gap-2 mb-8 no-scrollbar -mx-4 px-4 py-1'>
        {categories.map((cat: string) => (
          <a
            key={cat}
            href={cat === 'Todos' ? '/catalog' : `/catalog?category=${cat}`}
            class={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors border ${
              selectedCategory === cat
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground hover:bg-muted/80 border-border'
            }`}
          >
            {cat}
          </a>
        ))}
      </div>

      {/* Business List */}
      <div class='grid gap-6'>
        {businesses.length === 0
          ? (
            <div class='text-center py-12 bg-card rounded-xl border border-dashed border-border'>
              <p class='text-muted-foreground'>
                Nenhuma empresa encontrada nesta categoria.
              </p>
            </div>
          )
          : (
            businesses.map((business: Business) => (
              <a
                key={business.id}
                href={`/business/${business.id}`}
                class='block transition-transform active:scale-98'
              >
                <Card className='hover:ring-1 hover:ring-primary/50 transition-all border-none shadow-sm bg-card'>
                  <CardHeader className='flex-row items-center gap-4 space-y-0 pb-2'>
                    <div class='w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-border'>
                      <img
                        src={business.logoUrl || '/logo.svg'}
                        alt={business.name}
                        class='w-full h-full object-cover'
                        loading='lazy'
                      />
                    </div>
                    <div class='flex-1 min-w-0'>
                      <Badge
                        variant='outline'
                        className='mb-1 text-[10px] uppercase tracking-wider font-bold'
                      >
                        {business.category}
                      </Badge>
                      <CardTitle className='text-lg truncate font-bold text-foreground'>
                        {business.name}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p class='text-muted-foreground line-clamp-2 text-xs leading-relaxed'>
                      {business.description ||
                        'Confira os benefícios exclusivos disponíveis para moradores nesta loja.'}
                    </p>
                  </CardContent>
                </Card>
              </a>
            ))
          )}
      </div>

      {/* Request a Service - visible for authenticated residents */}
      {user?.role === 'resident' && <SignalRequestIsland />}

      <BottomNav active='catalog' />
      <div class='h-20' />
    </div>
  )
})

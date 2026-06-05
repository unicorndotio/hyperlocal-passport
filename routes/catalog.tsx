import { define } from '../utils.ts'
import { kv } from '../lib/kv.ts'
import { Business } from '../lib/business.ts'
import { Head } from 'fresh/runtime'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx'
import { Badge } from '@/components/ui/badge.tsx'

export const handler = define.handlers({
  async GET(ctx) {
    const iter = kv.list<Business>({ prefix: ['businesses'] })
    const businesses: Business[] = []
    for await (const entry of iter) {
      if (entry.value.isActive) {
        businesses.push(entry.value)
      }
    }

    const url = new URL(ctx.req.url)
    const category = url.searchParams.get('category')

    let filtered = businesses
    if (category && category !== 'Todos') {
      filtered = businesses.filter((b) => b.category === category)
    }

    // Extract unique categories from all businesses
    const allCategories = [
      'Todos',
      ...new Set(businesses.map((b) => b.category)),
    ].sort()
    const selectedCategory = category || 'Todos'

    return ctx.render({
      businesses: filtered,
      categories: allCategories,
      selectedCategory,
    })
  },
})

export default define.page<typeof handler>(function CatalogPage(ctx) {
  const { businesses, categories, selectedCategory } = ctx.data as {
    businesses: Business[]
    categories: string[]
    selectedCategory: string
  }

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

      <nav class='fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t border-border px-6 py-3 flex justify-around items-center max-w-md mx-auto'>
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
            stroke-width='2'
            stroke-linecap='round'
            stroke-linejoin='round'
          >
            <rect width='7' height='7' x='3' y='3' rx='1' />
            <rect width='7' height='7' x='14' y='3' rx='1' />
            <rect width='7' height='7' x='14' y='14' rx='1' />
            <rect width='7' height='7' x='3' y='14' rx='1' />
          </svg>
          <span class='text-[10px] font-bold uppercase'>Catálogo</span>
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
            stroke-width='2'
            stroke-linecap='round'
            stroke-linejoin='round'
          >
            <path d='M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z' />
            <circle cx='12' cy='10' r='3' />
          </svg>
          <span class='text-[10px] font-bold uppercase'>Passaporte</span>
        </a>
      </nav>
      <div class='h-20' /> {/* Spacer for nav */}
    </div>
  )
})

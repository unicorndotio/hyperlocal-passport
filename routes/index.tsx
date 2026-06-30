import { define } from '../utils.ts'
import { page } from 'fresh'
import { db } from '../lib/db.ts'
import { queryFeed } from '../lib/feed.ts'
import type { FeedEvent } from '../lib/feed.ts'
import { Head } from 'fresh/runtime'
import { FeedEventCard } from '../components/FeedEventCard.tsx'
import BottomNav from '../components/BottomNav.tsx'

export const handler = define.handlers({
  async GET(ctx) {
    const userId = ctx.state.user?.id ?? null
    const url = new URL(ctx.req.url)
    const cursor = url.searchParams.get('cursor') || undefined
    const limitParam = url.searchParams.get('limit')
    const parsedLimit = limitParam ? parseInt(limitParam, 10) : NaN
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
      ? parsedLimit
      : undefined
    const result = await queryFeed(db, userId, cursor, limit)
    return page({
      events: result.events,
      cursor: result.cursor,
      user: ctx.state.user,
    })
  },
})

export default define.page<typeof handler>(function FeedPage(ctx) {
  const { events } = ctx.data

  return (
    <div class='px-4 py-6 max-w-md mx-auto min-h-screen bg-background'>
      <Head>
        <title>Feed - Passaporte Local</title>
        <style>
          {`
          @keyframes skeleton-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          .skeleton-pulse {
            animation: skeleton-pulse 1.5s ease-in-out infinite;
            border-radius: 4px;
          }
        `}
        </style>
      </Head>

      <div id='feed-skeleton' class='hidden'>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} class='bg-card rounded-xl p-4 mb-4 shadow-sm'>
            <div class='skeleton-pulse h-3 w-1/3 mb-3 bg-muted-foreground/30' />
            <div class='skeleton-pulse h-5 w-3/4 mb-2 bg-muted-foreground/30' />
            <div class='skeleton-pulse h-3 w-full mb-1 bg-muted-foreground/30' />
            <div class='skeleton-pulse h-3 w-2/3 bg-muted-foreground/30' />
          </div>
        ))}
      </div>

      <script>
        {`document.addEventListener('click',function(e){var l=e.target.closest('a');if(l&&l.href&&l.href.startsWith(location.origin)&&!l.hasAttribute('download')){document.getElementById('feed-skeleton')?.classList.remove('hidden')}})`}
      </script>

      <header class='mb-8'>
        <h1 class='text-3xl font-bold text-primary mb-2'>Descubra</h1>
        <p class='text-muted-foreground text-sm'>
          Fique por dentro das novidades do seu bairro.
        </p>
      </header>

      {events.length === 0
        ? (
          <div class='text-center py-16 bg-card rounded-2xl border border-dashed border-border px-8 shadow-sm'>
            <div class='w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='24'
                height='24'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                stroke-width='2'
                stroke-linecap='round'
                stroke-linejoin='round'
                class='text-primary/40'
              >
                <path d='M22 12h-4l-3 9L9 3l-3 9H2' />
              </svg>
            </div>
            <p class='text-muted-foreground font-medium'>
              Nenhuma novidade por aqui ainda.
            </p>
            <p class='text-muted-foreground text-xs mt-2'>
              Fique de olho — em breve novos benefícios aparecerão.
            </p>
          </div>
        )
        : (
          <div class='grid gap-3'>
            {events.map((event: FeedEvent) => (
              <FeedEventCard key={event.id} event={event} />
            ))}
          </div>
        )}

      <BottomNav active='feed' />
      <div class='h-24' />
    </div>
  )
})

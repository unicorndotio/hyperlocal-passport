import { Card, CardContent } from '@/components/ui/card.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { formatBRL } from '../lib/utils.ts'
import type { FeedEvent } from '../lib/feed.ts'

export function FeedEventCard({ event }: { event: FeedEvent }) {
  switch (event.type) {
    case 'merchant_post':
      return <MerchantPostCard event={event} />
    case 'coupon_released':
      return <CouponReleasedCard event={event} />
    case 'savings_notice':
      return <SavingsNoticeCard event={event} />
    default:
      return null
  }
}

function MerchantPostCard({ event }: { event: FeedEvent }) {
  return (
    <Card size='sm' className='border-none shadow-sm bg-card overflow-hidden'>
      <CardContent className='px-4 py-3'>
        <p class='text-xs font-bold text-secondary uppercase tracking-wider mb-1'>
          {event.businessName}
        </p>
        <h3 class='font-bold text-foreground text-sm mb-1'>{event.title}</h3>
        {event.description && (
          <p class='text-muted-foreground text-xs leading-relaxed'>
            {event.description}
          </p>
        )}
        {event.imageUrl && (
          <img
            src={event.imageUrl}
            alt={event.title}
            loading='lazy'
            class='w-full h-48 object-cover rounded-lg mt-3 bg-muted'
          />
        )}
      </CardContent>
    </Card>
  )
}

function CouponReleasedCard({ event }: { event: FeedEvent }) {
  return (
    <Card size='sm' className='border-none shadow-sm bg-card overflow-hidden'>
      <CardContent className='px-4 py-3'>
        <Badge
          variant='default'
          className='mb-2 text-[10px] uppercase tracking-wider'
        >
          Novo cupom!
        </Badge>
        <p class='text-xs font-bold text-secondary uppercase tracking-wider mb-1'>
          {event.businessName}
        </p>
        <h3 class='font-bold text-foreground text-sm'>{event.title}</h3>
      </CardContent>
    </Card>
  )
}

function SavingsNoticeCard({ event }: { event: FeedEvent }) {
  const savings = event.amountCents ? formatBRL(event.amountCents) : null

  return (
    <Card
      size='sm'
      className='border-none shadow-sm bg-card overflow-hidden border-l-4 border-l-success'
    >
      <CardContent className='px-4 py-3'>
        <p class='text-xs font-bold text-success uppercase tracking-wider mb-1'>
          Economia
        </p>
        <p class='text-muted-foreground text-xs leading-relaxed'>
          Você economizou{' '}
          {savings && <span class='text-success font-bold'>{savings}</span>} na
          {' '}
          {event.businessName}
        </p>
      </CardContent>
    </Card>
  )
}

import type { JSX } from 'preact'

interface BottomNavProps {
  active: 'feed' | 'catalog' | 'passaporte'
}

const tabs: Array<{
  id: BottomNavProps['active']
  label: string
  href: string
  icon: (active: boolean) => JSX.Element
}> = [
  {
    id: 'feed',
    label: 'Feed',
    href: '/',
    icon: () => (
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
        <path d='m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' />
        <polyline points='9 22 9 12 15 12 15 22' />
      </svg>
    ),
  },
  {
    id: 'catalog',
    label: 'Catálogo',
    href: '/catalog',
    icon: () => (
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
    ),
  },
  {
    id: 'passaporte',
    label: 'Passaporte',
    href: '/passaporte',
    icon: () => (
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
    ),
  },
]

export default function BottomNav({ active }: BottomNavProps) {
  return (
    <nav class='fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t border-border px-6 py-3 flex justify-around items-center max-w-md mx-auto z-50'>
      {tabs.map((tab) => {
        const isActive = tab.id === active
        return (
          <a
            key={tab.id}
            href={tab.href}
            class={`flex flex-col items-center gap-1 transition-colors ${
              isActive
                ? 'text-primary'
                : 'text-muted-foreground hover:text-primary'
            }`}
          >
            {tab.icon(isActive)}
            <span class='text-[10px] font-black uppercase'>{tab.label}</span>
          </a>
        )
      })}
    </nav>
  )
}

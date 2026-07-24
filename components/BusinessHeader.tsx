import InactiveBanner from './InactiveBanner.tsx'

// 'analytics' is accepted in the type so existing analytics.tsx compiles,
// but deliberately omitted from the links array (hidden per task 07).
export type BusinessHeaderTab =
  | 'coupons'
  | 'checkout'
  | 'profile'
  | 'posts'
  | 'analytics'

export default function BusinessHeader(
  { active, businessName, isActiveBusiness = true }: {
    active: BusinessHeaderTab
    businessName: string
    isActiveBusiness?: boolean
  },
) {
  const links: { href: string; label: string; id: BusinessHeaderTab }[] = [
    { href: '/business/coupons', label: 'Meus Cupons', id: 'coupons' },
    { href: '/business/checkout', label: 'Validar Cupom', id: 'checkout' },
    { href: '/business/posts', label: 'Publicações', id: 'posts' },
    { href: '/business/profile', label: 'Meu Perfil', id: 'profile' },
    // Analytics is intentionally excluded — hidden from nav per task 07.
  ]

  return (
    <header className='bg-white border-b sticky top-0 z-10'>
      <InactiveBanner isActive={isActiveBusiness} />
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between'>
        <div className='flex items-center gap-8'>
          <h1 className='text-xl font-bold text-slate-900'>
            Painel do Parceiro
          </h1>
          <nav className='flex items-center gap-4'>
            {links.map((link, i) => (
              <>
                {i > 0 && <span className='text-slate-300'>|</span>}
                <a
                  href={link.href}
                  className={active === link.id
                    ? 'text-sm font-semibold text-blue-600 transition-colors'
                    : 'text-sm text-slate-500 hover:text-slate-900 transition-colors'}
                >
                  {link.label}
                </a>
              </>
            ))}
          </nav>
        </div>
        <div className='flex items-center gap-4 text-sm font-medium text-slate-700'>
          <span>{businessName}</span>
        </div>
      </div>
    </header>
  )
}

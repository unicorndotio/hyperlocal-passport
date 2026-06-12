export default function BusinessHeader(
  { active, businessName }: { active: 'coupons' | 'checkout' | 'profile'; businessName: string },
) {
  const links = [
    { href: '/business/coupons', label: 'Meus Cupons', id: 'coupons' as const },
    { href: '/business/checkout', label: 'Validar Cupom', id: 'checkout' as const },
    { href: '/business/profile', label: 'Meu Perfil', id: 'profile' as const },
  ]

  return (
    <header className='bg-white border-b sticky top-0 z-10'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between'>
        <div className='flex items-center gap-8'>
          <h1 className='text-xl font-bold text-slate-900'>
            Painel do Lojista
          </h1>
          <nav className='flex items-center gap-4'>
            {links.map((link, i) => (
              <>
                {i > 0 && <span className='text-slate-300'>|</span>}
                <a
                  href={link.href}
                  className={
                    active === link.id
                      ? 'text-sm font-semibold text-blue-600 transition-colors'
                      : 'text-sm text-slate-500 hover:text-slate-900 transition-colors'
                  }
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

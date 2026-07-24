interface Props {
  isActive: boolean
}

export default function InactiveBanner({ isActive }: Props) {
  if (isActive) return null

  return (
    <div class='bg-amber-50 border-b border-amber-200'>
      <div class='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3'>
        <svg
          class='w-5 h-5 text-amber-600 shrink-0'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            stroke-linecap='round'
            stroke-linejoin='round'
            stroke-width={2}
            d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z'
          />
        </svg>
        <p class='text-sm text-amber-800'>
          Sua conta está inativa. Entre em contato com{' '}
          <a
            href='mailto:passaporte@nodolabs.xyz'
            class='font-semibold underline hover:text-amber-900'
          >
            passaporte@nodolabs.xyz
          </a>{' '}
          para reativar seu plano e voltar a criar campanhas e publicações.
        </p>
      </div>
    </div>
  )
}

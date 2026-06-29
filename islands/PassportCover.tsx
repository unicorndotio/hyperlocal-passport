import { useSignal } from '@preact/signals'
import QRCodeDisplay from './QRCodeDisplay.tsx'
import { formatBRL } from '../lib/utils.ts'

interface SavingsByBusiness {
  businessId: string
  businessName: string
  savingsCents: number
  count: number
}

interface PassportCoverProps {
  status: 'approved' | 'pending' | 'rejected'
  redemptions: Array<{
    id: string
    businessName: string
    redeemedAt: number
  }>
  savingsHistory: {
    totalSavingsCents: number
    totalRedemptions: number
    byBusiness: SavingsByBusiness[]
  }
  residentName: string
}

export default function PassportCover({
  status,
  redemptions,
  savingsHistory,
  residentName,
}: PassportCoverProps) {
  const isOpen = useSignal(false)
  const isLocked = status === 'pending' || status === 'rejected'

  const handleToggle = () => {
    if (!isLocked) {
      isOpen.value = !isOpen.value
    }
  }

  if (isLocked) {
    return (
      <div class='rounded-[2.5rem] bg-gradient-to-br from-[#0f172a] via-[#1e3a5f] to-[#1a2a6c] p-8 shadow-2xl ring-1 ring-white/10'>
        <div class='flex flex-col items-center text-center py-6'>
          <div class='w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-6'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='28'
              height='28'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              stroke-width='2'
              stroke-linecap='round'
              stroke-linejoin='round'
              class='text-white/60'
            >
              <rect width='18' height='11' x='3' y='11' rx='2' ry='2' />
              <path d='M7 11V7a5 5 0 0 1 10 0v4' />
            </svg>
          </div>
          <h2 class='text-2xl font-black text-white tracking-tight mb-2'>
            {status === 'pending' ? 'Cadastro Pendente' : 'Cadastro Rejeitado'}
          </h2>
          <p class='text-white/60 text-sm leading-relaxed max-w-xs font-medium'>
            {status === 'pending'
              ? 'Seu cadastro está em análise. Assim que for aprovado, você poderá acessar seu passaporte digital e resgatar cupons.'
              : 'Seu cadastro não foi aprovado. Entre em contato com o suporte para mais informações.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div class='relative min-h-[420px]' onClick={handleToggle}>
      <div
        class='absolute inset-0 z-10 transition-all duration-500 ease-in-out cursor-pointer
          data-[open]:-translate-y-full data-[open]:opacity-0 data-[open]:pointer-events-none'
        data-open={isOpen.value ? '' : undefined}
      >
        <div class='h-full rounded-[2.5rem] bg-gradient-to-br from-[#0f172a] via-[#1e3a5f] to-[#1a2a6c] p-8 shadow-2xl ring-1 ring-white/10 flex flex-col justify-between'>
          <div>
            <div class='flex items-center gap-3 mb-8'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='24'
                height='24'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                stroke-width='1.5'
                stroke-linecap='round'
                stroke-linejoin='round'
                class='text-[#D4A843]'
              >
                <path d='M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z' />
                <circle cx='12' cy='10' r='3' />
              </svg>
              <span class='text-[10px] font-mono font-black text-[#D4A843] uppercase tracking-[0.3em]'>
                Passaporte Local
              </span>
            </div>
            <h1 class='text-4xl font-black text-white tracking-tight leading-tight mb-3'>
              PASSAPORTE
            </h1>
            <h2 class='text-xl font-black text-white/80 tracking-tight'>
              {residentName}
            </h2>
          </div>

          <div class='flex flex-col items-center gap-3'>
            <div class='w-8 h-8 rounded-full border-2 border-white/20 flex items-center justify-center animate-bounce'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='14'
                height='14'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                stroke-width='3'
                stroke-linecap='round'
                stroke-linejoin='round'
                class='text-white/40'
              >
                <path d='m6 9 6 6 6-6' />
              </svg>
            </div>
            <span class='text-[10px] font-mono font-black text-white/30 uppercase tracking-[0.2em]'>
              Toque para abrir
            </span>
          </div>

          <div class='border-t border-white/10 pt-4 flex justify-between items-center'>
            <span class='text-[8px] font-mono text-white/20 tracking-[0.2em] uppercase'>
              {redemptions.length} cupom{redemptions.length !== 1 ? 's' : ''}
              {' '}
              ativo
              {redemptions.length !== 1 ? 's' : ''}
            </span>
            <span class='text-[8px] font-mono text-white/20 tracking-[0.2em] uppercase'>
              Economia: {formatBRL(savingsHistory.totalSavingsCents)}
            </span>
          </div>
        </div>
      </div>

      <div
        class='transition-all duration-500 delay-100 ease-in-out
          opacity-0 translate-y-4 pointer-events-none
          data-[open]:opacity-100 data-[open]:translate-y-0 data-[open]:pointer-events-auto'
        data-open={isOpen.value ? '' : undefined}
      >
        {redemptions.length === 0
          ? (
            <div class='min-h-[420px] rounded-[2.5rem] bg-[#FFF5E6] border-2 border-[#FAD4C0]/30 p-8 flex flex-col items-center justify-center text-center'>
              <div class='w-16 h-16 rounded-full bg-[#FAD4C0]/20 flex items-center justify-center mb-4'>
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
                  class='text-[#FAD4C0]'
                >
                  <path d='M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z' />
                  <path d='M3 6h18' />
                  <path d='M16 10a4 4 0 0 1-8 0' />
                </svg>
              </div>
              <h3 class='text-lg font-black text-[#111827] mb-1'>
                Nenhum cupom ativo
              </h3>
              <p class='text-sm text-[#111827]/60 leading-relaxed max-w-xs'>
                Explore o catálogo e resgate descontos exclusivos nas lojas do
                seu bairro.
              </p>
            </div>
          )
          : (
            <div class='min-h-[420px] rounded-[2.5rem] bg-[#FFF5E6] border-2 border-[#FAD4C0]/30 overflow-hidden'>
              <div class='p-6 pb-2'>
                <h3 class='text-[10px] font-mono font-black text-[#111827]/40 uppercase tracking-[0.3em] mb-4'>
                  Cupons Ativos
                </h3>
                <div class='grid gap-4'>
                  {redemptions.map((r) => (
                    <div
                      key={r.id}
                      class='bg-white rounded-2xl p-5 shadow-sm ring-1 ring-[#FAD4C0]/20'
                    >
                      <div class='flex flex-col items-center text-center mb-4'>
                        <span class='text-[10px] font-mono font-black text-[#80A1C1] uppercase tracking-[0.2em] mb-2'>
                          Válido em
                        </span>
                        <h4 class='text-lg font-black text-[#111827] tracking-tight'>
                          {r.businessName}
                        </h4>
                      </div>
                      <div class='flex justify-center'>
                        <QRCodeDisplay code={r.id} />
                      </div>
                      <div class='mt-4 text-center'>
                        <span class='text-[9px] font-mono font-black text-[#111827]/40 uppercase tracking-[0.2em]'>
                          Código: {r.id}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        {savingsHistory.totalRedemptions > 0 && (
          <div class='mt-4 rounded-[2.5rem] bg-white p-6 shadow-sm ring-1 ring-[#FAD4C0]/20'>
            <h3 class='text-[10px] font-mono font-black text-[#111827]/40 uppercase tracking-[0.3em] mb-4'>
              Histórico de Economia
            </h3>
            <div class='flex items-center justify-between mb-4 pb-4 border-b border-[#FAD4C0]/20'>
              <div>
                <span class='text-sm font-black text-[#111827]/60'>
                  Total economizado
                </span>
              </div>
              <span class='text-2xl font-black text-[#16A34A]'>
                {formatBRL(savingsHistory.totalSavingsCents)}
              </span>
            </div>
            <div class='grid gap-2'>
              {savingsHistory.byBusiness.map((b) => (
                <div
                  key={b.businessId}
                  class='flex items-center justify-between py-1'
                >
                  <div class='flex items-center gap-2'>
                    <span class='text-sm font-bold text-[#111827]'>
                      {b.businessName}
                    </span>
                    <span class='text-[10px] font-mono font-black text-[#111827]/40'>
                      {b.count}x
                    </span>
                  </div>
                  <span class='text-sm font-black text-[#16A34A]'>
                    {formatBRL(b.savingsCents)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

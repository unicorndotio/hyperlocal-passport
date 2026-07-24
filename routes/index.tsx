import { define } from '../utils.ts'
import { Head } from 'fresh/runtime'

export default define.page(function ComingSoonPage() {
  return (
    <div class='min-h-screen bg-[#FFF5E6] font-sans selection:bg-[#FAD4C0] selection:text-[#111827] flex flex-col items-center justify-center p-4 md:p-8'>
      <Head>
        <title>Passaporte Jurerê - Em Breve</title>
        <meta
          name='description'
          content='A plataforma de privilégios e benefícios exclusivos para os moradores de Jurerê. Em breve.'
        />
      </Head>

      <main class='w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6'>
        {/* Passport Block (Main Column - 4 cols wide for perfect ratio) */}
        <section class='md:col-span-5 relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#1A2E46] to-[#0F1C2E] p-8 md:p-12 text-center shadow-2xl flex flex-col items-center justify-center border border-[#FAD4C0]/20 min-h-[500px]'>
          <div
            class='absolute inset-0 opacity-10 pointer-events-none'
            style='background-image: radial-gradient(#FAD4C0 1px, transparent 1px); background-size: 24px 24px;'
          >
          </div>

          <div class='relative z-10 w-full flex flex-col items-center'>
            <div class='flex flex-col items-center gap-6'>
              <img
                src='/logo/separator.png'
                alt=''
                class='h-3 md:h-4 object-contain opacity-80'
              />
              <img
                src='/logo/jurere.png'
                alt='Jurerê'
                class='h-12 md:h-16 object-contain'
              />
              <img
                src='/logo/compass.png'
                alt='Compass'
                class='h-40 md:h-56 object-contain my-2 opacity-90 transition-opacity hover:opacity-100 drop-shadow-lg'
              />
              <img
                src='/logo/separator.png'
                alt=''
                class='h-3 md:h-4 object-contain opacity-80'
              />
              <img
                src='/logo/passport.png'
                alt='Passport'
                class='h-4 md:h-5 object-contain mt-2 opacity-90'
              />
            </div>
          </div>
        </section>

        {/* Info Blocks (Right Side - 7 cols wide) */}
        <div class='md:col-span-7 flex flex-col gap-4 md:gap-6 h-full'>
          {/* Main Info Card */}
          <div class='bg-white rounded-[32px] p-8 md:p-12 shadow-sm border border-[#80A1C1]/20 flex-1 flex flex-col justify-center transition-shadow hover:shadow-md'>
            <p class='font-mono text-xs font-semibold tracking-[0.2em] uppercase text-[#D97706] mb-4'>
              O Clube do Bairro
            </p>
            <h2 class='text-4xl md:text-5xl lg:text-5xl font-bold text-[#111827] leading-[1.2]'>
              A sua chave de acesso aos{' '}
              <span class='text-[#D97706] italic font-light'>
                privilégios mais exclusivos
              </span>
              .
            </h2>
          </div>

          {/* Secondary Info & Status Card */}
          <div class='bg-[#FAD4C0] rounded-[32px] p-8 md:p-12 shadow-sm border border-[#D97706]/20 flex-1 flex flex-col justify-between gap-8'>
            <div class='text-left'>
              <p class='text-[#111827]/80 text-lg md:text-xl leading-relaxed max-w-lg'>
                Uma plataforma fechada, criada para conectar você aos melhores
                estabelecimentos locais.{' '}
                <br />Comércio, gastronomia, serviços e experiências com
                vantagens inesquecíveis.
              </p>
            </div>
            <div class='w-full'>
              <div class='w-full inline-flex items-center justify-center gap-3 px-8 py-5 rounded-full border-2 border-[#D97706]/30 bg-transparent'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  width='20'
                  height='20'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='#D97706'
                  stroke-width='2'
                  stroke-linecap='round'
                  stroke-linejoin='round'
                >
                  <circle cx='12' cy='12' r='10'></circle>
                  <polyline points='12 6 12 12 16 14'></polyline>
                </svg>
                <span class='font-mono text-sm md:text-base font-semibold tracking-widest uppercase text-[#D97706]'>
                  Lançamento em Breve
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
})

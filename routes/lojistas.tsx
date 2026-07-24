import { define } from '../utils.ts'
import { Head } from 'fresh/runtime'

export default define.page(function LojistasLandingPage() {
  return (
    <div class='min-h-screen bg-[#FFF5E6] font-sans selection:bg-[#FAD4C0] selection:text-[#111827]'>
      <Head>
        <title>Passaporte Jurerê - Para Parceiros</title>
        <meta
          name='description'
          content='Seja um parceiro do Passaporte Jurerê e conecte-se com os moradores do bairro.'
        />
      </Head>

      <main class='max-w-5xl mx-auto px-4 py-12 md:py-24 grid gap-8'>
        {/* Header */}
        <header class='flex flex-col items-center justify-center mb-8 text-center'>
          <p class='font-mono text-xs font-medium tracking-[0.2em] uppercase text-[#80A1C1] mb-4'>
            Passaporte Jurerê
          </p>
          <h1 class='text-4xl md:text-5xl font-bold text-[#111827] tracking-tight'>
            Portal do Lojista
          </h1>
          <p class='text-[#80A1C1] text-lg mt-4 max-w-xl mx-auto leading-relaxed'>
            Faça parte da rede exclusiva que conecta os melhores
            estabelecimentos aos moradores da região.
          </p>
        </header>

        {/* Business Registration Block */}
        <div class='bg-[#FAD4C0] rounded-[24px] p-8 md:p-12 shadow-sm border border-[#D97706]/20 flex flex-col lg:flex-row gap-12 items-center'>
          <div class='flex-1 order-2 lg:order-1 text-center lg:text-left'>
            <div class='w-16 h-16 rounded-full bg-white/50 flex items-center justify-center mb-6 mx-auto lg:mx-0 shadow-sm'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='32'
                height='32'
                viewBox='0 0 24 24'
                fill='none'
                stroke='#D97706'
                stroke-width='2'
                stroke-linecap='round'
                stroke-linejoin='round'
              >
                <path d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'></path>
                <polyline points='9 22 9 12 15 12 15 22'></polyline>
              </svg>
            </div>
            <h3 class='text-3xl font-bold text-[#111827] mb-4'>
              Alavanque o seu negócio
            </h3>
            <p class='text-[#111827]/80 text-lg mb-8 leading-relaxed max-w-lg mx-auto lg:mx-0'>
              O <strong>Passaporte Jurerê</strong>{' '}
              é a ferramenta ideal para atrair clientes frequentes que moram
              perto de você. Ofereça benefícios exclusivos e fidelize um público
              qualificado da sua vizinhança, fomentando a economia local de
              forma inteligente.
            </p>
            <a
              href='/business/register'
              class='inline-flex px-8 py-4 rounded-xl bg-[#111827] text-[#FFF5E6] font-medium font-mono text-sm uppercase tracking-wider text-center hover:bg-[#111827]/90 transition-all transform hover:-translate-y-0.5 shadow-lg focus:ring-2 focus:ring-offset-2 focus:ring-[#111827] outline-none'
            >
              Iniciar Cadastro da Loja
            </a>
          </div>

          <div class='flex-1 w-full order-1 lg:order-2 flex justify-center'>
            <div class='w-full max-w-[320px] rounded-[24px] bg-gradient-to-br from-[#1A2E46] to-[#0F1C2E] p-10 shadow-2xl flex flex-col items-center justify-center border border-[#FAD4C0]/20 aspect-[3/4] relative overflow-hidden'>
              <div
                class='absolute inset-0 opacity-10 pointer-events-none'
                style='background-image: radial-gradient(#FAD4C0 1px, transparent 1px); background-size: 16px 16px;'
              >
              </div>

              <img
                src='/logo/separator.png'
                alt=''
                class='h-3 object-contain opacity-80 mb-6'
              />
              <img
                src='/logo/jurere.png'
                alt='Jurerê'
                class='h-10 object-contain mb-4'
              />
              <img
                src='/logo/compass.png'
                alt='Compass'
                class='h-32 object-contain my-2 opacity-90 drop-shadow-md'
              />
              <img
                src='/logo/separator.png'
                alt=''
                class='h-3 object-contain opacity-80 mt-4 mb-4'
              />
              <img
                src='/logo/passport.png'
                alt='Passport'
                class='h-4 object-contain opacity-90'
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
})

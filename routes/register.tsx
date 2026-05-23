import { define } from '../utils.ts'
import RegistrationForm from '../islands/RegistrationForm.tsx'

export default define.page(function RegisterPage() {
  return (
    <main class='min-h-screen bg-[#FFF5E6] flex items-center justify-center px-4 py-8'>
      <div class='w-full max-w-md'>
        {/* Header */}
        <div class='mb-8 text-center'>
          <p class='font-mono text-xs font-500 tracking-widest uppercase text-[#80A1C1] mb-2'>
            Passaporte Local
          </p>
          <h1 class='font-sans text-[2rem] font-700 leading-tight text-[#111827]'>
            Cadastro de Morador
          </h1>
        </div>
        <RegistrationForm />
      </div>
    </main>
  )
})

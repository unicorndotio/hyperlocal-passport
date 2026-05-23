import { define } from '../utils.ts'
import RegistrationForm from '../islands/RegistrationForm.tsx'

export default define.page(function RegisterPage() {
  return (
    <div class='min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8'>
      <div class='w-full max-w-md'>
        <h1 class='text-2xl font-bold text-center mb-6'>Cadastro de Morador</h1>
        <RegistrationForm />
      </div>
    </div>
  )
})

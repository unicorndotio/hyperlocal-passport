import { define } from '../utils.ts'
import LoginForm from '../islands/LoginForm.tsx'

export default define.page(function LoginPage() {
  return (
    <div className='min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4'>
      <div className='mb-8 text-center'>
        <h1 className='text-3xl font-extrabold text-slate-900 tracking-tight'>
          Passaporte Local
        </h1>
        <p className='text-slate-500 mt-2'>Jurerê em comunidade</p>
      </div>
      
      <LoginForm />
      
      <div className='mt-8'>
        <a href='/' className='text-sm text-slate-400 hover:text-slate-600 transition'>
          &larr; Voltar para o início
        </a>
      </div>
    </div>
  )
})

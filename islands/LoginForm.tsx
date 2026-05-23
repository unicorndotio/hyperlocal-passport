import { useState } from 'preact/hooks'
import { signIn } from '../lib/auth-client.ts'
import { Button } from '../components/ui/button.tsx'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: Event) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data, error: authError } = await signIn.email({
        email,
        password,
        callbackURL: '/admin/approvals', // Default for now, can be improved
      })

      if (authError) {
        setError(authError.message || 'Credenciais inválidas')
      } else if (data) {
        // Successful login - Better Auth handles the redirect if callbackURL is provided
        // or we can manually redirect if needed.
        window.location.href = '/admin/approvals'
      }
    } catch (err) {
      setError('Erro ao tentar entrar. Tente novamente.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className='space-y-4 max-w-sm mx-auto p-6 bg-white rounded-xl shadow-sm border border-slate-100'
    >
      <div className='space-y-1 text-center mb-6'>
        <h2 className='text-2xl font-bold text-slate-900'>Entrar</h2>
        <p className='text-sm text-slate-500'>Acesse sua conta do Passaporte Local</p>
      </div>

      {error && (
        <div className='p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg'>
          {error}
        </div>
      )}

      <div className='space-y-2'>
        <label className='text-xs font-mono font-medium uppercase tracking-wide text-slate-500'>
          E-mail
        </label>
        <input
          type='email'
          value={email}
          onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
          placeholder='seu@email.com'
          required
          className='w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-slate-200 transition'
        />
      </div>

      <div className='space-y-2'>
        <label className='text-xs font-mono font-medium uppercase tracking-wide text-slate-500'>
          Senha
        </label>
        <input
          type='password'
          value={password}
          onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
          placeholder='••••••••'
          required
          className='w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-slate-200 transition'
        />
      </div>

      <Button
        type='submit'
        disabled={loading}
        className='w-full h-10 font-semibold'
      >
        {loading ? 'Entrando...' : 'Entrar'}
      </Button>

      <div className='text-center pt-2'>
        <p className='text-xs text-slate-400'>
          Ainda não tem conta? <a href='/register' className='text-slate-600 hover:underline'>Cadastre-se</a>
        </p>
      </div>
    </form>
  )
}

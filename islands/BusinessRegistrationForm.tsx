import { useState } from 'preact/hooks'
import {
  formatCnpjDisplay,
  isValidCnpj,
  normalizeCnpj,
} from '../lib/business.ts'

export {
  formatCnpjDisplay,
  isValidCnpj,
  normalizeCnpj,
} from '../lib/business.ts'

export function validatePassword(value: string): boolean {
  return value.trim().length >= 8
}

export function validateEmail(value: string): boolean {
  return value.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function validateRequired(value: string): boolean {
  return value.trim().length > 0
}

export interface BusinessRegistrationErrors {
  name?: string
  companyName?: string
  cnpj?: string
  email?: string
  password?: string
  global?: string
}

const colors = {
  primary: '#FAD4C0',
  secondary: '#80A1C1',
  danger: '#DC2626',
  success: '#16A34A',
  text: '#111827',
}

export default function BusinessRegistrationForm() {
  const [name, setName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<BusinessRegistrationErrors>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  function setFieldError(
    field: keyof BusinessRegistrationErrors,
    message: string | undefined,
  ) {
    setErrors((prev) => {
      const next = { ...prev }
      if (message) next[field] = message as never
      else delete next[field]
      return next
    })
  }

  function validateNameField(v: string) {
    setFieldError(
      'name',
      v.trim() ? undefined : 'Nome do negócio é obrigatório.',
    )
  }
  function validateCompanyNameField(v: string) {
    setFieldError(
      'companyName',
      v.trim() ? undefined : 'Razão social é obrigatória.',
    )
  }
  function validateCnpjField(v: string) {
    setFieldError('cnpj', isValidCnpj(v) ? undefined : 'CNPJ inválido.')
  }
  function validateEmailField(v: string) {
    setFieldError(
      'email',
      validateEmail(v) ? undefined : 'E-mail inválido.',
    )
  }
  function validatePasswordField(v: string) {
    setFieldError(
      'password',
      validatePassword(v)
        ? undefined
        : 'Senha deve ter no mínimo 8 caracteres.',
    )
  }

  async function handleSubmit(e: Event) {
    e.preventDefault()
    const errs: BusinessRegistrationErrors = {}
    if (!name.trim()) errs.name = 'Nome do negócio é obrigatório.'
    if (!companyName.trim()) errs.companyName = 'Razão social é obrigatória.'
    if (!isValidCnpj(cnpj)) errs.cnpj = 'CNPJ inválido.'
    if (!validateEmail(email)) errs.email = 'E-mail inválido.'
    if (!validatePassword(password)) {
      errs.password = 'Senha deve ter no mínimo 8 caracteres.'
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    setLoading(true)

    const form = new FormData()
    form.append('name', name.trim())
    form.append('companyName', companyName.trim())
    form.append('cnpj', normalizeCnpj(cnpj))
    form.append('email', email.trim())
    form.append('password', password)

    try {
      const res = await fetch('/api/businesses/register', {
        method: 'POST',
        body: form,
      })
      if (res.ok) {
        setSuccess(true)
        setTimeout(() => {
          globalThis.location.href = '/login?registered=business'
        }, 3000)
      } else {
        const body = await res.json().catch(() => ({}))
        if (res.status === 409) {
          setErrors({
            global: body.error || 'E-mail ou CNPJ já cadastrado.',
          })
        } else {
          setErrors({
            global: body.error || 'Erro ao enviar cadastro. Tente novamente.',
          })
        }
      }
    } catch {
      setErrors({
        global: 'Erro de conexão. Verifique sua internet e tente novamente.',
      })
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div
        class='rounded-[8px] p-8 text-center'
        style={{ background: 'white', border: `2px solid ${colors.primary}` }}
      >
        <div class='text-5xl mb-4'>✅</div>
        <h2 class='text-xl font-semibold text-[#111827] mb-2'>
          Cadastro enviado!
        </h2>
        <p class='text-base text-[#374151]'>
          Sua conta foi criada, mas o negócio só aparecerá no catálogo após
          confirmação de pagamento e ativação pelo admin. Você já pode fazer
          login e preparar seu perfil.
        </p>
        <p class='text-sm text-[#6B7280] mt-4'>
          Redirecionando para o login...
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      class='rounded-[8px] p-6 space-y-5'
      style={{
        background: 'white',
        boxShadow: '0 1px 4px 0 rgba(17,24,39,0.06)',
      }}
    >
      {errors.global && (
        <div
          role='alert'
          class='rounded-[4px] px-4 py-3 text-sm'
          style={{
            background: '#FEF2F2',
            color: colors.danger,
            border: '1px solid #FECACA',
          }}
        >
          {errors.global}
        </div>
      )}

      <Field label='Nome fantasia' error={errors.name}>
        <input
          type='text'
          value={name}
          onInput={(e) => setName((e.target as HTMLInputElement).value)}
          onBlur={(e) =>
            validateNameField((e.target as HTMLInputElement).value)}
          placeholder='Minha Empresa'
          class={inputClass(!!errors.name)}
          aria-invalid={!!errors.name}
          autocomplete='organization'
        />
      </Field>

      <Field label='Razão social' error={errors.companyName}>
        <input
          type='text'
          value={companyName}
          onInput={(e) => setCompanyName((e.target as HTMLInputElement).value)}
          onBlur={(e) =>
            validateCompanyNameField((e.target as HTMLInputElement).value)}
          placeholder='Minha Empresa Ltda'
          class={inputClass(!!errors.companyName)}
          aria-invalid={!!errors.companyName}
          autocomplete='off'
        />
      </Field>

      <Field label='CNPJ' error={errors.cnpj}>
        <input
          type='text'
          inputMode='numeric'
          value={formatCnpjDisplay(cnpj)}
          onInput={(e) => setCnpj((e.target as HTMLInputElement).value)}
          onBlur={(e) =>
            validateCnpjField((e.target as HTMLInputElement).value)}
          placeholder='00.000.000/0000-00'
          maxLength={18}
          class={inputClass(!!errors.cnpj)}
          aria-invalid={!!errors.cnpj}
          autocomplete='off'
        />
      </Field>

      <Field label='E-mail' error={errors.email}>
        <input
          type='email'
          value={email}
          onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
          onBlur={(e) =>
            validateEmailField((e.target as HTMLInputElement).value)}
          placeholder='contato@minhaempresa.com'
          class={inputClass(!!errors.email)}
          aria-invalid={!!errors.email}
          autocomplete='email'
        />
      </Field>

      <Field label='Senha' error={errors.password}>
        <input
          type='password'
          value={password}
          onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
          onBlur={(e) =>
            validatePasswordField((e.target as HTMLInputElement).value)}
          placeholder='Mínimo 8 caracteres'
          class={inputClass(!!errors.password)}
          aria-invalid={!!errors.password}
          autocomplete='new-password'
        />
      </Field>

      <button
        type='submit'
        disabled={loading}
        class='w-full rounded-[8px] py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50'
        style={{ background: colors.primary, color: colors.text }}
      >
        {loading ? 'Enviando…' : 'Cadastrar Negócio'}
      </button>

      <div class='text-center pt-2'>
        <p class='text-xs text-[#6B7280]'>
          Já tem uma conta?{' '}
          <a href='/login' class='text-[#111827] hover:underline font-medium'>
            Faça login
          </a>
        </p>
      </div>
    </form>
  )
}

function Field(
  { label, error, children }: {
    label: string
    error?: string
    children: preact.ComponentChildren
  },
) {
  return (
    <div class='space-y-1'>
      <label class='block text-xs font-mono font-medium uppercase tracking-wide text-[#6B7280]'>
        {label}
      </label>
      {children}
      {error && (
        <p class='text-xs font-medium' style={{ color: '#DC2626' }}>{error}</p>
      )}
    </div>
  )
}

function inputClass(hasError: boolean) {
  return [
    'block w-full rounded-[8px] border px-3 py-2 text-sm text-[#111827] bg-white outline-none transition',
    'focus:ring-2 focus:ring-[#FAD4C0] focus:border-[#FAD4C0]',
    hasError ? 'border-[#DC2626]' : 'border-[#E5E7EB]',
  ].join(' ')
}

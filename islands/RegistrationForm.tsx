import { useState } from 'preact/hooks'
import {
  formatCpfDisplay,
  isValidCpf,
  isValidFileType,
  normalizeCpf,
  validateForm,
} from '../lib/registration.ts'

export { formatCpfDisplay, isValidCpf, isValidFileType, normalizeCpf } from '../lib/registration.ts'

export default function RegistrationForm() {
  const [name, setName] = useState('')
  const [cpf, setCpf] = useState('')
  const [email, setEmail] = useState('')
  const [idPhoto, setIdPhoto] = useState<File | null>(null)
  const [residenceProof, setResidenceProof] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  function setFieldError(field: string, message: string | undefined) {
    setErrors((prev) => {
      const next = { ...prev }
      if (message) next[field] = message
      else delete next[field]
      return next
    })
  }

  function validateName(value: string) {
    setFieldError('name', value.trim() ? undefined : 'Nome é obrigatório.')
  }

  function validateCpf(value: string) {
    setFieldError('cpf', isValidCpf(value) ? undefined : 'CPF inválido. Informe 11 dígitos.')
  }

  function validateEmail(value: string) {
    const ok = value.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    setFieldError('email', ok ? undefined : 'E-mail inválido.')
  }

  function validateFile(field: string, file: File | null) {
    if (!file) {
      setFieldError(field, field === 'idPhoto' ? 'Foto do documento é obrigatória.' : 'Comprovante de residência é obrigatório.')
    } else if (!isValidFileType(file)) {
      setFieldError(field, 'Formato inválido. Use JPG, PNG ou PDF.')
    } else {
      setFieldError(field, undefined)
    }
  }

  async function handleSubmit(e: Event) {
    e.preventDefault()
    const errs = validateForm({ name, cpf, email, idPhoto, residenceProof })
    if (Object.keys(errs).length > 0) {
      setErrors(errs as Record<string, string>)
      return
    }
    setErrors({})
    setLoading(true)

    const form = new FormData()
    form.append('name', name.trim())
    form.append('cpf', normalizeCpf(cpf))
    form.append('email', email.trim())
    form.append('idPhoto', idPhoto!)
    form.append('residenceProof', residenceProof!)

    try {
      const res = await fetch('/api/users/register', { method: 'POST', body: form })
      if (res.ok) {
        setSuccess(true)
      } else {
        const body = await res.json().catch(() => ({}))
        setErrors({ global: body.error || 'Erro ao enviar cadastro. Tente novamente.' })
      }
    } catch {
      setErrors({ global: 'Erro de conexão. Verifique sua internet e tente novamente.' })
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div class='bg-white rounded-xl shadow p-8 text-center space-y-4'>
        <div class='text-5xl'>✅</div>
        <h2 class='text-xl font-semibold'>Cadastro enviado!</h2>
        <p class='text-gray-600'>
          Seus dados foram recebidos. A análise será concluída em até{' '}
          <strong>1 dia útil</strong>. Você receberá uma confirmação por e-mail.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate class='bg-white rounded-xl shadow p-6 space-y-5'>
      {errors.global && (
        <p role='alert' class='text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3'>
          {errors.global}
        </p>
      )}

      <Field label='Nome completo' error={errors.name}>
        <input
          type='text'
          value={name}
          onInput={(e) => setName((e.target as HTMLInputElement).value)}
          onBlur={(e) => validateName((e.target as HTMLInputElement).value)}
          placeholder='João da Silva'
          class={inputClass(!!errors.name)}
          aria-invalid={!!errors.name}
          autocomplete='name'
        />
      </Field>

      <Field label='CPF' error={errors.cpf}>
        <input
          type='text'
          inputMode='numeric'
          value={formatCpfDisplay(cpf)}
          onInput={(e) => setCpf((e.target as HTMLInputElement).value)}
          onBlur={(e) => validateCpf((e.target as HTMLInputElement).value)}
          placeholder='000.000.000-00'
          maxLength={14}
          class={inputClass(!!errors.cpf)}
          aria-invalid={!!errors.cpf}
          autocomplete='off'
        />
      </Field>

      <Field label='E-mail' error={errors.email}>
        <input
          type='email'
          value={email}
          onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
          onBlur={(e) => validateEmail((e.target as HTMLInputElement).value)}
          placeholder='joao@exemplo.com'
          class={inputClass(!!errors.email)}
          aria-invalid={!!errors.email}
          autocomplete='email'
        />
      </Field>

      <Field label='Foto do documento (RG ou CNH)' error={errors.idPhoto}>
        <input
          type='file'
          accept='image/jpeg,image/png,image/webp,application/pdf'
          onChange={(e) => {
            const file = (e.target as HTMLInputElement).files?.[0] ?? null
            setIdPhoto(file)
            validateFile('idPhoto', file)
          }}
          class='block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200'
          aria-invalid={!!errors.idPhoto}
        />
      </Field>

      <Field label='Comprovante de residência' error={errors.residenceProof}>
        <input
          type='file'
          accept='image/jpeg,image/png,image/webp,application/pdf'
          onChange={(e) => {
            const file = (e.target as HTMLInputElement).files?.[0] ?? null
            setResidenceProof(file)
            validateFile('residenceProof', file)
          }}
          class='block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200'
          aria-invalid={!!errors.residenceProof}
        />
      </Field>

      <button
        type='submit'
        disabled={loading}
        class='w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium transition-opacity disabled:opacity-50'
      >
        {loading ? 'Enviando…' : 'Cadastrar'}
      </button>
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
      <label class='block text-sm font-medium text-gray-700'>{label}</label>
      {children}
      {error && <p class='text-xs text-red-600'>{error}</p>}
    </div>
  )
}

function inputClass(hasError: boolean) {
  return `block w-full rounded-md border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-primary/50 ${
    hasError ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:border-primary'
  }`
}

import { useState } from 'preact/hooks'
import {
  formatCpfDisplay,
  isValidCpf,
  isValidFileType,
  normalizeCpf,
  validateForm,
} from '../lib/registration.ts'

export { formatCpfDisplay, isValidCpf, isValidFileType, normalizeCpf } from '../lib/registration.ts'

// --- Bento design tokens (inline for island isolation) ---
const colors = {
  primary: '#FAD4C0',
  secondary: '#80A1C1',
  danger: '#DC2626',
  success: '#16A34A',
  surface: '#FFF5E6',
  text: '#111827',
}

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

  function validateName(v: string) {
    setFieldError('name', v.trim() ? undefined : 'Nome é obrigatório.')
  }
  function validateCpf(v: string) {
    setFieldError('cpf', isValidCpf(v) ? undefined : 'CPF inválido.')
  }
  function validateEmail(v: string) {
    setFieldError(
      'email',
      v.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? undefined : 'E-mail inválido.',
    )
  }
  function validateFile(field: string, file: File | null) {
    if (!file) {
      setFieldError(
        field,
        field === 'idPhoto' ? 'Foto do documento é obrigatória.' : 'Comprovante é obrigatório.',
      )
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

  // --- Success state ---
  if (success) {
    return (
      <div
        class='rounded-[8px] p-8 text-center'
        style={{ background: 'white', border: `2px solid ${colors.primary}` }}
      >
        <div class='text-5xl mb-4'>✅</div>
        <h2 class='font-sans text-xl font-600 text-[#111827] mb-2'>Cadastro enviado!</h2>
        <p class='text-base text-[#374151]'>
          Seus dados foram recebidos. A análise será concluída em até{' '}
          <strong class='font-600'>1 dia útil</strong>. Você receberá uma confirmação por e-mail.
        </p>
      </div>
    )
  }

  // --- Form ---
  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      class='rounded-[8px] p-6 space-y-5'
      style={{ background: 'white', boxShadow: '0 1px 4px 0 rgba(17,24,39,0.06)' }}
    >
      {errors.global && (
        <div
          role='alert'
          class='rounded-[4px] px-4 py-3 text-sm font-500'
          style={{ background: '#FEF2F2', color: colors.danger, border: `1px solid #FECACA` }}
        >
          {errors.global}
        </div>
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
        <label
          class='flex items-center gap-3 rounded-[8px] border px-3 py-2 cursor-pointer text-sm transition'
          style={{
            borderColor: errors.idPhoto ? colors.danger : '#E5E7EB',
            background: idPhoto ? '#F0FDF4' : 'white',
          }}
        >
          <span
            class='shrink-0 rounded-[4px] px-2 py-1 text-xs font-mono font-500 uppercase tracking-wide'
            style={{ background: colors.primary, color: colors.text }}
          >
            Escolher
          </span>
          <span class='truncate text-[#6B7280]'>
            {idPhoto ? idPhoto.name : 'JPG, PNG ou PDF'}
          </span>
          <input
            type='file'
            accept='image/jpeg,image/png,image/webp,application/pdf'
            class='sr-only'
            onChange={(e) => {
              const file = (e.target as HTMLInputElement).files?.[0] ?? null
              setIdPhoto(file)
              validateFile('idPhoto', file)
            }}
            aria-invalid={!!errors.idPhoto}
          />
        </label>
      </Field>

      <Field label='Comprovante de residência' error={errors.residenceProof}>
        <label
          class='flex items-center gap-3 rounded-[8px] border px-3 py-2 cursor-pointer text-sm transition'
          style={{
            borderColor: errors.residenceProof ? colors.danger : '#E5E7EB',
            background: residenceProof ? '#F0FDF4' : 'white',
          }}
        >
          <span
            class='shrink-0 rounded-[4px] px-2 py-1 text-xs font-mono font-500 uppercase tracking-wide'
            style={{ background: colors.primary, color: colors.text }}
          >
            Escolher
          </span>
          <span class='truncate text-[#6B7280]'>
            {residenceProof ? residenceProof.name : 'JPG, PNG ou PDF'}
          </span>
          <input
            type='file'
            accept='image/jpeg,image/png,image/webp,application/pdf'
            class='sr-only'
            onChange={(e) => {
              const file = (e.target as HTMLInputElement).files?.[0] ?? null
              setResidenceProof(file)
              validateFile('residenceProof', file)
            }}
            aria-invalid={!!errors.residenceProof}
          />
        </label>
      </Field>

      <button
        type='submit'
        disabled={loading}
        class='w-full rounded-[8px] py-2.5 text-sm font-600 transition-opacity disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
        style={{
          background: colors.primary,
          color: colors.text,
          outlineColor: colors.secondary,
        }}
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
      <label class='block text-xs font-mono font-500 uppercase tracking-wide text-[#6B7280]'>
        {label}
      </label>
      {children}
      {error && (
        <p class='text-xs font-500' style={{ color: '#DC2626' }}>
          {error}
        </p>
      )}
    </div>
  )
}

function inputClass(hasError: boolean) {
  return [
    'block w-full rounded-[8px] border px-3 py-2 text-sm text-[#111827] bg-white',
    'outline-none transition',
    'focus:ring-2 focus:ring-[#FAD4C0] focus:border-[#FAD4C0]',
    hasError ? 'border-[#DC2626]' : 'border-[#E5E7EB]',
  ].join(' ')
}

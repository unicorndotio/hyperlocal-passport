import { useState } from 'preact/hooks'
import type { JSX } from 'preact'
import type { Business, SocialLinks, OpeningHours, OpeningHoursEntry } from '@/lib/business.ts'
import { Button } from '@/components/ui/button.tsx'

interface Props {
  business: Business
}

const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

const DAY_LABELS: Record<string, string> = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo',
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

export function validateSocialLinkURL(value: string): boolean {
  if (!value || !value.trim()) return true
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

export function validateOpeningHourTime(value: string): boolean {
  if (!value) return true
  return TIME_PATTERN.test(value)
}

export function validateOpeningHourOrder(open: string, close: string): boolean {
  if (!open || !close) return true
  return open < close
}

export default function BusinessProfileEditor({ business }: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(
    business.logoUrl || null,
  )
  const [description, setDescription] = useState(business.description || '')
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(
    business.socialLinks || {},
  )
  const [openingHours, setOpeningHours] = useState<OpeningHours>(
    business.openingHours || {},
  )
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  function handleLogoChange(e: JSX.TargetedEvent<HTMLInputElement, Event>) {
    const file = e.currentTarget.files?.[0] || null
    setLogoFile(file)
    if (file) {
      const reader = new FileReader()
      reader.onload = () => setLogoPreview(reader.result as string)
      reader.readAsDataURL(file)
    } else {
      setLogoPreview(business.logoUrl || null)
    }
  }

  function handleSocialLinkChange(key: string, value: string) {
    setSocialLinks((prev) => ({ ...prev, [key]: value || undefined }))
  }

  function handleOpeningHourChange(
    day: string,
    field: 'open' | 'close',
    value: string,
  ) {
    setOpeningHours((prev) => {
      const current = prev[day] || { open: '', close: '' }
      return { ...prev, [day]: { ...current, [field]: value } }
    })
  }

  function validate(): boolean {
    const errors: Record<string, string> = {}

    for (const [key, value] of Object.entries(socialLinks)) {
      if (value && !validateSocialLinkURL(value)) {
        errors[`social_${key}`] = `URL inválida`
      }
    }

    for (const day of DAYS) {
      const entry = openingHours[day]
      if (entry?.open || entry?.close) {
        if (!validateOpeningHourTime(entry.open || '')) {
          errors[`hours_${day}_open`] = 'Horário inválido (HH:MM)'
        }
        if (!validateOpeningHourTime(entry.close || '')) {
          errors[`hours_${day}_close`] = 'Horário inválido (HH:MM)'
        }
        if (
          entry.open &&
          entry.close &&
          validateOpeningHourTime(entry.open) &&
          validateOpeningHourTime(entry.close) &&
          !validateOpeningHourOrder(entry.open, entry.close)
        ) {
          errors[`hours_${day}`] =
            'Abertura deve ser anterior ao fechamento'
        }
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: Event) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!validate()) return

    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('description', description)

      const sl: Record<string, string> = {}
      for (const [key, value] of Object.entries(socialLinks)) {
        if (value) sl[key] = value
      }
      formData.append('socialLinks', JSON.stringify(sl))

      const oh: Record<string, OpeningHoursEntry> = {}
      for (const day of DAYS) {
        const entry = openingHours[day]
        if (entry?.open && entry?.close) {
          oh[day] = entry
        }
      }
      formData.append('openingHours', JSON.stringify(oh))

      if (logoFile) {
        formData.append('logo', logoFile)
      }

      const res = await fetch(`/api/businesses/${business.id}/profile`, {
        method: 'PUT',
        body: formData,
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Erro ao salvar perfil')
      }

      setSuccess('Perfil atualizado com sucesso!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar perfil')
    } finally {
      setSaving(false)
    }
  }

  const SOCIAL_FIELDS = [
    {
      key: 'instagram',
      label: 'Instagram',
      placeholder: 'https://instagram.com/seuperfil',
    },
    {
      key: 'facebook',
      label: 'Facebook',
      placeholder: 'https://facebook.com/seuperfil',
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      placeholder: 'https://wa.me/5548999999999',
    },
    {
      key: 'menu',
      label: 'Cardápio Online',
      placeholder: 'https://cardapio.com/seuperfil',
    },
  ]

  return (
    <div className='space-y-6'>
      {!business.isActive && (
        <div className='bg-amber-50 border-l-4 border-amber-500 rounded p-4 text-amber-800 text-sm'>
          <p className='font-medium'>
            Sua listagem está pendente de ativação. Você será listado assim que
            sua assinatura for confirmada.
          </p>
        </div>
      )}

      <div className='bg-white rounded-xl border shadow-sm'>
        <div className='px-6 py-5 border-b'>
          <h2 className='text-lg font-bold text-slate-900'>
            Editar Perfil
          </h2>
          <p className='text-sm text-slate-500 mt-1'>
            Atualize as informações da sua empresa para atrair mais clientes.
          </p>
        </div>

        {error && (
          <div className='mx-6 mt-4 p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200'>
            {error}
          </div>
        )}

        {success && (
          <div className='mx-6 mt-4 p-3 bg-green-50 text-green-700 text-xs rounded border border-green-200'>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className='p-6 space-y-6'>
          <div>
            <label className='block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider'>
              Logotipo
            </label>
            {logoPreview && (
              <div className='mb-2 flex items-center gap-3'>
                <div className='h-16 w-16 rounded border bg-slate-100 overflow-hidden flex items-center justify-center'>
                  <img
                    src={logoPreview}
                    alt='Logo preview'
                    className='h-full w-full object-cover'
                  />
                </div>
                <span className='text-xs text-slate-500'>
                  {logoFile ? 'Nova logo selecionada' : 'Logo atual'}
                </span>
              </div>
            )}
            <input
              type='file'
              accept='image/jpeg,image/png,image/webp'
              onChange={handleLogoChange}
              className='w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer'
              disabled={saving}
            />
          </div>

          <div>
            <label className='block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider'>
              Descrição
            </label>
            <textarea
              value={description}
              onInput={(e: JSX.TargetedEvent<HTMLTextAreaElement, Event>) =>
                setDescription(e.currentTarget.value)}
              className='w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[100px]'
              placeholder='Descreva seu negócio e principais ofertas...'
              disabled={saving}
            />
          </div>

          <div>
            <label className='block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider'>
              Redes Sociais
            </label>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className='block text-xs font-medium text-slate-600 mb-1'>
                    {label}
                  </label>
                  <input
                    type='url'
                    value={socialLinks[key as keyof SocialLinks] || ''}
                    onInput={(
                      e: JSX.TargetedEvent<HTMLInputElement, Event>,
                    ) => handleSocialLinkChange(key, e.currentTarget.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                      formErrors[`social_${key}`]
                        ? 'border-red-500 ring-1 ring-red-500'
                        : 'border-slate-300'
                    }`}
                    placeholder={placeholder}
                    disabled={saving}
                  />
                  {formErrors[`social_${key}`] && (
                    <p className='mt-1 text-xs text-red-500'>
                      {formErrors[`social_${key}`]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className='block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider'>
              Horários de Funcionamento
            </label>
            <div className='space-y-2'>
              {DAYS.map((day) => {
                const entry = openingHours[day] || { open: '', close: '' }
                const openErr = formErrors[`hours_${day}_open`]
                const closeErr = formErrors[`hours_${day}_close`]
                const dayErr = formErrors[`hours_${day}`]
                const hasErr = !!(openErr || closeErr || dayErr)
                return (
                  <div
                    key={day}
                    className='grid grid-cols-[140px_1fr_1fr] gap-3 items-start'
                  >
                    <span className='text-sm font-medium text-slate-700 pt-2'>
                      {DAY_LABELS[day]}
                    </span>
                    <div>
                      <input
                        type='time'
                        value={entry.open || ''}
                        onInput={(
                          e: JSX.TargetedEvent<HTMLInputElement, Event>,
                        ) =>
                          handleOpeningHourChange(
                            day,
                            'open',
                            e.currentTarget.value,
                          )}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                          hasErr
                            ? 'border-red-500 ring-1 ring-red-500'
                            : 'border-slate-300'
                        }`}
                        disabled={saving}
                      />
                      {openErr && (
                        <p className='mt-0.5 text-xs text-red-500'>
                          {openErr}
                        </p>
                      )}
                    </div>
                    <div>
                      <input
                        type='time'
                        value={entry.close || ''}
                        onInput={(
                          e: JSX.TargetedEvent<HTMLInputElement, Event>,
                        ) =>
                          handleOpeningHourChange(
                            day,
                            'close',
                            e.currentTarget.value,
                          )}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                          hasErr
                            ? 'border-red-500 ring-1 ring-red-500'
                            : 'border-slate-300'
                        }`}
                        disabled={saving}
                      />
                      {closeErr && (
                        <p className='mt-0.5 text-xs text-red-500'>
                          {closeErr}
                        </p>
                      )}
                    </div>
                    {dayErr && (
                      <div className='col-span-3'>
                        <p className='text-xs text-red-500'>{dayErr}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className='flex justify-end pt-4 border-t'>
            <Button
              type='submit'
              disabled={saving}
              className='bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors border-none'
            >
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

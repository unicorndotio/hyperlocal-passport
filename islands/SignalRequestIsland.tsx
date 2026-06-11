import { useState } from 'preact/hooks'
import { Button } from '../components/ui/button.tsx'

const VALID_CATEGORIES = [
  'Alimentação',
  'Casa',
  'Corpo',
  'Esporte',
  'Náutica',
  'Entretenimento',
  'Outros',
]

export default function SignalRequestIsland() {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: Event) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSubmitting(true)

    try {
      const res = await fetch('/api/signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, description }),
      })

      if (res.ok) {
        setSuccess(true)
        setCategory('')
        setDescription('')
      } else {
        const data = await res.json()
        setError(data.error || 'Erro ao enviar solicitação')
      }
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    setOpen(false)
    setError(null)
    setSuccess(false)
    setCategory('')
    setDescription('')
  }

  return (
    <>
      <div class='mt-8 flex justify-center'>
        <Button
          variant='outline'
          onClick={() => setOpen(true)}
          class='gap-2'
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='16'
            height='16'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            stroke-width='2'
            stroke-linecap='round'
            stroke-linejoin='round'
          >
            <circle cx='11' cy='11' r='8' />
            <path d='m21 21-4.3-4.3' />
            <path d='M11 8v6' />
            <path d='M8 11h6' />
          </svg>
          Solicitar serviço
        </Button>
      </div>

      {open && (
        <div class='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'>
          <div class='bg-white rounded-xl max-w-md w-full p-6 relative shadow-2xl'>
            <button
              type='button'
              onClick={handleClose}
              class='absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-2xl'
            >
              ×
            </button>

            {success
              ? (
                <div class='text-center py-8'>
                  <div class='w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4'>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      width='24'
                      height='24'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      stroke-width='2'
                      stroke-linecap='round'
                      stroke-linejoin='round'
                      class='text-green-600'
                    >
                      <path d='M22 11.08V12a10 10 0 1 1-5.93-9.14' />
                      <path d='m9 11 3 3L22 4' />
                    </svg>
                  </div>
                  <h3 class='text-lg font-bold text-slate-900 mb-2'>
                    Solicitação enviada!
                  </h3>
                  <p class='text-sm text-slate-500 mb-6'>
                    Sua sugestão foi registrada. A administração irá analisar.
                  </p>
                  <Button onClick={handleClose}>Fechar</Button>
                </div>
              )
              : (
                <form onSubmit={handleSubmit}>
                  <h3 class='text-lg font-bold text-slate-900 mb-1'>
                    Solicitar serviço
                  </h3>
                  <p class='text-sm text-slate-500 mb-6'>
                    Não encontrou o que procura? Sugira um novo serviço para o
                    bairro.
                  </p>

                  <div class='space-y-4'>
                    <div>
                      <label
                        for='signal-category'
                        class='block text-sm font-medium text-slate-700 mb-1'
                      >
                        Categoria
                      </label>
                      <select
                        id='signal-category'
                        value={category}
                        onChange={(e) =>
                          setCategory(
                            (e.target as HTMLSelectElement).value,
                          )}
                        required
                        class='w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white'
                      >
                        <option value=''>Selecione uma categoria</option>
                        {VALID_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        for='signal-description'
                        class='block text-sm font-medium text-slate-700 mb-1'
                      >
                        Descrição
                      </label>
                      <textarea
                        id='signal-description'
                        value={description}
                        onChange={(e) =>
                          setDescription(
                            (e.target as HTMLTextAreaElement).value,
                          )}
                        required
                        minLength={10}
                        maxLength={500}
                        rows={4}
                        placeholder='Descreva o serviço que você gostaria de encontrar no bairro...'
                        class='w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none'
                      />
                      <p class='text-xs text-slate-400 mt-1'>
                        {description.length}/500 caracteres
                      </p>
                    </div>

                    {error && (
                      <div class='bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2'>
                        {error}
                      </div>
                    )}

                    <div class='flex gap-2 pt-2'>
                      <Button
                        type='button'
                        variant='outline'
                        onClick={handleClose}
                        class='flex-1'
                      >
                        Cancelar
                      </Button>
                      <Button
                        type='submit'
                        disabled={submitting || !category || !description.trim()}
                        class='flex-1'
                      >
                        {submitting ? 'Enviando...' : 'Enviar'}
                      </Button>
                    </div>
                  </div>
                </form>
              )}
          </div>
        </div>
      )}
    </>
  )
}

import { useSignal } from '@preact/signals'
import { Button } from '@/components/ui/button.tsx'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx'

interface MerchantPost {
  id: string
  title: string
  body: string | null
  imageUrl: string | null
  isVisible: boolean
  createdAt: string | Date
  updatedAt: string | Date
}

interface Props {
  businessId: string
  initialPosts: MerchantPost[]
}

export default function MerchantPostForm(
  { businessId: _businessId, initialPosts }: Props,
) {
  const posts = useSignal<MerchantPost[]>(initialPosts)
  const showForm = useSignal(false)
  const loading = useSignal(false)
  const error = useSignal<string | null>(null)
  const success = useSignal<string | null>(null)

  const title = useSignal('')
  const body = useSignal('')
  const imageFile = useSignal<File | null>(null)

  function resetForm() {
    title.value = ''
    body.value = ''
    imageFile.value = null
    error.value = null
    success.value = null
  }

  function validate(): string | null {
    if (!title.value.trim()) return 'O título é obrigatório.'
    if (title.value.trim().length > 255) {
      return 'O título deve ter no máximo 255 caracteres.'
    }
    if (body.value.length > 10000) {
      return 'O texto deve ter no máximo 10000 caracteres.'
    }
    if (imageFile.value) {
      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
      ]
      if (!allowedTypes.includes(imageFile.value.type)) {
        return 'Tipo de imagem não suportado. Use JPEG, PNG, GIF ou WebP.'
      }
      if (imageFile.value.size > 5 * 1024 * 1024) {
        return 'A imagem deve ter no máximo 5MB.'
      }
    }
    return null
  }

  async function handleSubmit(e: Event) {
    e.preventDefault()
    error.value = null
    success.value = null

    const validationError = validate()
    if (validationError) {
      error.value = validationError
      return
    }

    loading.value = true

    const formData = new FormData()
    formData.append('title', title.value.trim())
    if (body.value.trim()) formData.append('body', body.value.trim())
    if (imageFile.value) formData.append('image', imageFile.value)

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const newPost = await res.json()
        posts.value = [newPost, ...posts.value]
        success.value = 'Publicação criada com sucesso!'
        showForm.value = false
        resetForm()
      } else {
        const data = await res.json().catch(() => ({}))
        error.value = data.error || 'Falha ao criar publicação.'
      }
    } catch {
      error.value = 'Erro de conexão. Verifique sua internet.'
    } finally {
      loading.value = false
    }
  }

  async function handleDelete(postId: string) {
    if (!confirm('Tem certeza que deseja excluir esta publicação?')) return

    try {
      const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' })
      if (res.ok) {
        posts.value = posts.value.filter((p) => p.id !== postId)
      } else {
        const data = await res.json().catch(() => ({}))
        error.value = data.error || 'Falha ao excluir publicação.'
      }
    } catch {
      error.value = 'Erro de conexão.'
    }
  }

  return (
    <div class='space-y-6'>
      <div class='flex justify-between items-center'>
        <h3 class='text-lg font-medium text-slate-900'>Publicações</h3>
        <Button
          onClick={() => {
            showForm.value = !showForm.value
            if (showForm.value) resetForm()
          }}
          variant={showForm.value ? 'outline' : 'default'}
        >
          {showForm.value ? 'Cancelar' : 'Nova Publicação'}
        </Button>
      </div>

      {showForm.value && (
        <form
          onSubmit={handleSubmit}
          class='bg-slate-50 p-6 rounded-lg border border-slate-200 space-y-4'
        >
          <h4 class='font-semibold text-slate-800 text-sm'>
            Nova Publicação
          </h4>

          {error.value && (
            <div class='bg-red-50 text-red-600 p-3 rounded text-sm border border-red-100'>
              {error.value}
            </div>
          )}

          <div class='space-y-1'>
            <label class='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>
              Título
            </label>
            <input
              type='text'
              value={title.value}
              onInput={(e) =>
                title.value = (e.target as HTMLInputElement).value}
              placeholder='ex: Festival da Banana Esse Fim de Semana!'
              class='w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white'
              required
            />
          </div>

          <div class='space-y-1'>
            <label class='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>
              Texto
            </label>
            <textarea
              value={body.value}
              onInput={(e) =>
                body.value = (e.target as HTMLTextAreaElement).value}
              placeholder='Descreva sua promoção ou novidade...'
              rows={4}
              class='w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white'
            />
          </div>

          <div class='space-y-1'>
            <label class='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>
              Imagem (opcional)
            </label>
            <input
              type='file'
              accept='image/jpeg,image/png,image/gif,image/webp'
              onChange={(e) => {
                const files = (e.target as HTMLInputElement).files
                imageFile.value = files && files.length > 0 ? files[0] : null
              }}
              class='w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white file:mr-3 file:py-1 file:px-3 file:border-0 file:bg-blue-50 file:text-blue-700 file:text-sm file:font-medium hover:file:bg-blue-100'
            />
          </div>

          <div class='flex justify-end pt-2'>
            <Button type='submit' disabled={loading.value}>
              {loading.value ? 'Publicando...' : 'Publicar'}
            </Button>
          </div>
        </form>
      )}

      {success.value && (
        <div class='bg-green-50 text-green-700 p-3 rounded text-sm border border-green-200'>
          {success.value}
        </div>
      )}

      <div class='space-y-4'>
        {posts.value.length === 0
          ? (
            <div class='text-center py-10 text-slate-500'>
              Nenhuma publicação ainda. Crie a primeira acima.
            </div>
          )
          : (
            posts.value.map((post) => (
              <Card key={post.id}>
                <CardHeader>
                  <div class='flex justify-between items-start'>
                    <div>
                      <CardTitle>{post.title}</CardTitle>
                      {post.body && (
                        <CardDescription>{post.body}</CardDescription>
                      )}
                    </div>
                    <div class='flex items-center gap-2'>
                      {post.isVisible
                        ? (
                          <span class='text-[10px] font-bold uppercase text-green-600 bg-green-50 px-2 py-0.5 rounded'>
                            Visível
                          </span>
                        )
                        : (
                          <span class='text-[10px] font-bold uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded'>
                            Pendente
                          </span>
                        )}
                      <button
                        type='button'
                        onClick={() => handleDelete(post.id)}
                        class='text-red-500 hover:text-red-700 text-sm font-medium'
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                  {post.imageUrl && (
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      class='mt-2 rounded-md max-h-48 object-cover'
                    />
                  )}
                  <div class='text-xs text-slate-400 mt-1'>
                    {new Date(post.createdAt).toLocaleDateString('pt-BR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
      </div>
    </div>
  )
}

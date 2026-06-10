import { useEffect, useState } from 'preact/hooks'
import type { JSX } from 'preact'
import { Button } from '../components/ui/button.tsx'
import { Badge } from '../components/ui/badge.tsx'
import {
  BusinessFormErrors,
  formatCnpjDisplay,
  normalizeCnpj,
  validateBusinessForm,
} from '../lib/business.ts'

interface Business {
  id: string
  name: string
  companyName?: string
  cnpj: string
  category: string
  logoUrl: string
  description?: string
  userId: string
  isActive: boolean
  createdAt?: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
  status: string
}

const CATEGORIES = [
  'Alimentação',
  'Casa',
  'Corpo',
  'Esporte',
  'Serviços',
  'Outro',
]

export default function BusinessManager() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [isOpen, setIsOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form values
  const [name, setName] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [category, setCategory] = useState('')
  const [userId, setUserId] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [logo, setLogo] = useState<File | null>(null)
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null)

  const [formErrors, setFormErrors] = useState<BusinessFormErrors>({})
  const [saving, setSaving] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchBusinesses(), fetchUsers()]).finally(() =>
      setLoading(false)
    )
  }, [])

  async function fetchBusinesses() {
    try {
      const res = await fetch('/api/businesses')
      if (!res.ok) throw new Error('Falha ao carregar empresas')
      const data = await res.json()
      setBusinesses(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar empresas')
    }
  }

  async function fetchUsers() {
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) throw new Error('Falha ao carregar usuários')
      const data = await res.json()
      setUsers(data)
    } catch (err) {
      console.error(err)
    }
  }

  function handleOpenCreate() {
    setIsEdit(false)
    setEditingId(null)
    setName('')
    setCnpj('')
    setCategory(CATEGORIES[0])
    setUserId(users[0]?.id || '')
    setDescription('')
    setIsActive(true)
    setLogo(null)
    setCurrentLogoUrl(null)
    setFormErrors({})
    setIsOpen(true)
  }

  function handleEdit(b: Business) {
    setIsEdit(true)
    setEditingId(b.id)
    setName(b.companyName || b.name || '')
    setCnpj(formatCnpjDisplay(b.cnpj))
    setCategory(b.category || CATEGORIES[0])
    setUserId(b.userId || '')
    setDescription(b.description || '')
    setIsActive(b.isActive !== false)
    setLogo(null)
    setCurrentLogoUrl(b.logoUrl || null)
    setFormErrors({})
    setIsOpen(true)
  }

  function handleCnpjChange(e: JSX.TargetedEvent<HTMLInputElement, Event>) {
    const rawVal = e.currentTarget.value
    setCnpj(formatCnpjDisplay(rawVal))
  }

  async function handleToggleActive(b: Business) {
    const newStatus = !b.isActive
    setActionLoadingId(b.id)
    try {
      const res = await fetch(`/api/admin/businesses/${b.id}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus }),
      })
      if (!res.ok) throw new Error('Falha ao atualizar status')
      const updated = await res.json()
      setBusinesses((prev) =>
        prev.map((item) => item.id === b.id ? updated : item)
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao atualizar status')
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleSave(e: Event) {
    e.preventDefault()

    const errors = validateBusinessForm({
      name,
      cnpj: normalizeCnpj(cnpj),
      category,
      logo,
      userId,
      isEdit,
    })

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setSaving(true)
    setFormErrors({})

    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('companyName', name)
      formData.append('cnpj', normalizeCnpj(cnpj))
      formData.append('category', category)
      formData.append('userId', userId)
      formData.append('description', description)
      formData.append('isActive', String(isActive))
      if (logo) {
        formData.append('logo', logo)
      }

      const url = isEdit ? `/api/businesses/${editingId}` : '/api/businesses'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        body: formData,
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Falha ao salvar empresa')
      }

      const savedBusiness = await res.json()

      if (isEdit) {
        setBusinesses((prev) =>
          prev.map((b) => b.id === editingId ? savedBusiness : b)
        )
      } else {
        setBusinesses((prev) => [...prev, savedBusiness])
      }

      setIsOpen(false)
      // Refresh user roles in the background in case user role updated to business
      fetchUsers()
    } catch (err) {
      setFormErrors({
        global: err instanceof Error ? err.message : 'Erro desconhecido',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className='p-8 text-center text-slate-500 font-medium'>
        Carregando dados das empresas...
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <div>
          <h2 className='text-lg font-bold text-slate-900'>
            Empresas Parceiras
          </h2>
          <p className='text-sm text-slate-500'>
            Gerencie as lojas, restaurantes e prestadores de serviço que
            oferecem descontos.
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className='bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors border-none'
        >
          Nova Empresa
        </Button>
      </div>

      {error && (
        <div className='p-4 bg-red-50 border-l-4 border-red-500 rounded text-red-700 text-sm'>
          {error}
        </div>
      )}

      {businesses.length === 0
        ? (
          <div className='p-12 text-center border-2 border-dashed rounded-xl bg-slate-50'>
            <p className='text-slate-500 font-medium'>
              Nenhuma empresa parceira cadastrada ainda.
            </p>
            <Button
              onClick={handleOpenCreate}
              variant='outline'
              className='mt-4'
            >
              Cadastrar Primeira Empresa
            </Button>
          </div>
        )
        : (
          <div className='overflow-x-auto border rounded-xl bg-white shadow-sm'>
            <table className='w-full text-sm text-left border-collapse'>
              <thead className='bg-slate-50 border-b border-slate-100'>
                <tr>
                  <th className='px-6 py-4 font-semibold text-slate-700'>
                    Logo
                  </th>
                  <th className='px-6 py-4 font-semibold text-slate-700'>
                    Empresa
                  </th>
                  <th className='px-6 py-4 font-semibold text-slate-700'>
                    CNPJ
                  </th>
                  <th className='px-6 py-4 font-semibold text-slate-700'>
                    Categoria
                  </th>
                  <th className='px-6 py-4 font-semibold text-slate-700'>
                    Responsável
                  </th>
                  <th className='px-6 py-4 font-semibold text-slate-700'>
                    Status
                  </th>
                  <th className='px-6 py-4 font-semibold text-slate-700 text-right'>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100'>
                {businesses.map((b) => {
                  const matchedUser = users.find((u) => u.id === b.userId)
                  return (
                    <tr
                      key={b.id}
                      className='hover:bg-slate-50/50 transition-colors'
                    >
                      <td className='px-6 py-4'>
                        <div className='h-10 w-10 rounded-full bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center'>
                          {b.logoUrl
                            ? (
                              <img
                                src={b.logoUrl}
                                alt='Logo'
                                className='h-full w-full object-cover'
                              />
                            )
                            : (
                              <span className='text-xs text-slate-400 font-bold'>
                                L
                              </span>
                            )}
                        </div>
                      </td>
                      <td className='px-6 py-4'>
                        <div className='font-semibold text-slate-900'>
                          {b.companyName || b.name}
                        </div>
                        {b.description && (
                          <div className='text-xs text-slate-500 max-w-[200px] truncate'>
                            {b.description}
                          </div>
                        )}
                      </td>
                      <td className='px-6 py-4 text-slate-600 font-mono'>
                        {formatCnpjDisplay(b.cnpj)}
                      </td>
                      <td className='px-6 py-4'>
                        <Badge
                          variant='outline'
                          className='bg-slate-50 text-slate-700 border-slate-200'
                        >
                          {b.category}
                        </Badge>
                      </td>
                      <td className='px-6 py-4'>
                        {matchedUser
                          ? (
                            <div>
                              <div className='font-medium text-slate-900'>
                                {matchedUser.name}
                              </div>
                              <div className='text-xs text-slate-500'>
                                {matchedUser.email}
                              </div>
                            </div>
                          )
                          : (
                            <span className='text-xs text-slate-400 italic'>
                              Desconhecido ({b.userId?.slice(0, 8)})
                            </span>
                          )}
                      </td>
                      <td className='px-6 py-4'>
                        {b.isActive !== false
                          ? (
                            <Badge className='bg-green-100 text-green-800 hover:bg-green-100 border-none'>
                              Ativa
                            </Badge>
                          )
                          : (
                            <Badge className='bg-slate-100 text-slate-600 hover:bg-slate-100 border-none'>
                              Desativada
                            </Badge>
                          )}
                      </td>
                      <td className='px-6 py-4 text-right space-x-2 whitespace-nowrap'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handleEdit(b)}
                          disabled={actionLoadingId === b.id}
                        >
                          Editar
                        </Button>
                        <Button
                          variant={b.isActive !== false
                            ? 'destructive'
                            : 'default'}
                          size='sm'
                          className={b.isActive !== false
                            ? ''
                            : 'bg-green-600 hover:bg-green-700 text-white border-none'}
                          onClick={() => handleToggleActive(b)}
                          disabled={actionLoadingId === b.id}
                        >
                          {actionLoadingId === b.id
                            ? '...'
                            : (b.isActive !== false ? 'Desativar' : 'Reativar')}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

      {/* Creation/Edit Modal */}
      {isOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm'>
          <div className='bg-white rounded-2xl max-w-xl w-full p-6 relative shadow-2xl overflow-y-auto max-h-[90vh]'>
            <button
              type='button'
              onClick={() => setIsOpen(false)}
              className='absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-2xl transition-colors'
              disabled={saving}
            >
              ×
            </button>

            <h3 className='text-xl font-bold text-slate-900 mb-6'>
              {isEdit ? 'Editar Perfil da Empresa' : 'Cadastrar Nova Empresa'}
            </h3>

            {formErrors.global && (
              <div className='mb-4 p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200'>
                {formErrors.global}
              </div>
            )}

            <form onSubmit={handleSave} className='space-y-4'>
              <div>
                <label className='block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider'>
                  Nome da Empresa / Razão Social *
                </label>
                <input
                  type='text'
                  value={name}
                  onChange={(e: JSX.TargetedEvent<HTMLInputElement, Event>) =>
                    setName(e.currentTarget.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                    formErrors.name
                      ? 'border-red-500 ring-1 ring-red-500'
                      : 'border-slate-300'
                  }`}
                  placeholder='Ex: Restaurante Jurerê Gourmet'
                  disabled={saving}
                />
                {formErrors.name && (
                  <p className='mt-1 text-xs text-red-500'>{formErrors.name}</p>
                )}
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider'>
                    CNPJ *
                  </label>
                  <input
                    type='text'
                    value={cnpj}
                    onInput={handleCnpjChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono ${
                      formErrors.cnpj
                        ? 'border-red-500 ring-1 ring-red-500'
                        : 'border-slate-300'
                    }`}
                    placeholder='00.000.000/0000-00'
                    disabled={saving}
                  />
                  {formErrors.cnpj && (
                    <p className='mt-1 text-xs text-red-500'>
                      {formErrors.cnpj}
                    </p>
                  )}
                </div>

                <div>
                  <label className='block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider'>
                    Categoria *
                  </label>
                  <select
                    value={category}
                    onChange={(
                      e: JSX.TargetedEvent<HTMLSelectElement, Event>,
                    ) => setCategory(e.currentTarget.value)}
                    className='w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white'
                    disabled={saving}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {formErrors.category && (
                    <p className='mt-1 text-xs text-red-500'>
                      {formErrors.category}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className='block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider'>
                  Usuário Responsável *
                </label>
                {users.length === 0
                  ? (
                    <div className='text-xs text-red-500 p-2 border border-red-200 bg-red-50 rounded'>
                      Nenhum usuário cadastrado no sistema. Por favor, crie um
                      usuário primeiro.
                    </div>
                  )
                  : (
                    <select
                      value={userId}
                      onChange={(
                        e: JSX.TargetedEvent<HTMLSelectElement, Event>,
                      ) => setUserId(e.currentTarget.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white ${
                        formErrors.userId
                          ? 'border-red-500 ring-1 ring-red-500'
                          : 'border-slate-300'
                      }`}
                      disabled={saving}
                    >
                      <option value='' disabled>Selecione um usuário...</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email}) - {u.role === 'admin'
                            ? 'Admin'
                            : u.role === 'business'
                            ? 'Lojista'
                            : 'Morador'}
                        </option>
                      ))}
                    </select>
                  )}
                {formErrors.userId && (
                  <p className='mt-1 text-xs text-red-500'>
                    {formErrors.userId}
                  </p>
                )}
              </div>

              <div>
                <label className='block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider'>
                  Descrição / Ofertas
                </label>
                <textarea
                  value={description}
                  onChange={(
                    e: JSX.TargetedEvent<HTMLTextAreaElement, Event>,
                  ) => setDescription(e.currentTarget.value)}
                  className='w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[80px]'
                  placeholder='Ex: Oferecemos 15% de desconto de segunda a quarta-feira.'
                  disabled={saving}
                />
              </div>

              <div>
                <label className='block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider'>
                  Logotipo *
                </label>
                {currentLogoUrl && (
                  <div className='mb-2 flex items-center gap-3'>
                    <div className='h-12 w-12 rounded border bg-slate-100 overflow-hidden flex items-center justify-center'>
                      <img
                        src={currentLogoUrl}
                        alt='Logo atual'
                        className='h-full w-full object-cover'
                      />
                    </div>
                    <span className='text-xs text-slate-500'>
                      Logo atual. Selecione um arquivo abaixo para atualizar.
                    </span>
                  </div>
                )}
                <input
                  type='file'
                  accept='image/jpeg,image/png,image/webp'
                  onChange={(e: JSX.TargetedEvent<HTMLInputElement, Event>) =>
                    setLogo(e.currentTarget.files?.[0] || null)}
                  className={`w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer ${
                    formErrors.logo ? 'border-red-500' : ''
                  }`}
                  disabled={saving}
                />
                {formErrors.logo && (
                  <p className='mt-1 text-xs text-red-500'>{formErrors.logo}</p>
                )}
              </div>

              <div className='flex items-center gap-2 py-2'>
                <input
                  type='checkbox'
                  id='isActive'
                  checked={isActive}
                  onChange={(e: JSX.TargetedEvent<HTMLInputElement, Event>) =>
                    setIsActive(e.currentTarget.checked)}
                  className='rounded text-blue-600 focus:ring-blue-500 h-4 w-4'
                  disabled={saving}
                />
                <label
                  htmlFor='isActive'
                  className='text-sm text-slate-700 font-medium select-none cursor-pointer'
                >
                  Perfil Ativo (Exibir no catálogo)
                </label>
              </div>

              <div className='flex justify-end gap-3 pt-4 border-t border-slate-100'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setIsOpen(false)}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button
                  type='submit'
                  disabled={saving}
                  className='bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors border-none'
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

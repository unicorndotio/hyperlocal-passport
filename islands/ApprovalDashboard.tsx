import { useEffect, useState } from 'preact/hooks'
import { Button } from '../components/ui/button.tsx'

interface PendingUser {
  id: string
  name: string
  cpf: string
  email: string
  status: 'pending' | 'approved' | 'rejected'
  documents?: {
    idPhotoUrl: string
    residenceProofUrl: string
  }
  createdAt: number
}

interface SignalItem {
  id: string
  category: string
  description: string
  residentId: string
  createdAt: number
  reviewed: boolean
}

interface CategoryCount {
  category: string
  count: number
  unreviewed: number
}

interface SignalsResponse {
  signals: SignalItem[]
  categoryCounts: CategoryCount[]
  nextCursor?: string
}

export default function ApprovalDashboard() {
  const [activeTab, setActiveTab] = useState<'approvals' | 'signals'>(
    'approvals',
  )

  // Approvals state
  const [users, setUsers] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDocs, setSelectedDocs] = useState<
    { idPhoto: string; residenceProof: string } | null
  >(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Signals state
  const [signals, setSignals] = useState<SignalItem[]>([])
  const [categoryCounts, setCategoryCounts] = useState<CategoryCount[]>([])
  const [signalsLoading, setSignalsLoading] = useState(false)
  const [signalsError, setSignalsError] = useState<string | null>(null)
  const [reviewLoading, setReviewLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchPendingUsers()
  }, [])

  useEffect(() => {
    if (activeTab === 'signals') {
      fetchSignals()
    }
  }, [activeTab])

  async function fetchPendingUsers() {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/approvals/pending')
      if (!res.ok) throw new Error('Falha ao carregar usuários')
      const data = await res.json()
      setUsers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  async function fetchSignals() {
    try {
      setSignalsLoading(true)
      setSignalsError(null)
      const res = await fetch('/api/admin/signals')
      if (!res.ok) throw new Error('Falha ao carregar sinais')
      const data: SignalsResponse = await res.json()
      setSignals(data.signals.sort((a, b) => b.createdAt - a.createdAt))
      setCategoryCounts(data.categoryCounts)
    } catch (err) {
      setSignalsError(
        err instanceof Error ? err.message : 'Erro desconhecido',
      )
    } finally {
      setSignalsLoading(false)
    }
  }

  async function handleAction(userId: string, status: 'approved' | 'rejected') {
    if (
      !confirm(
        `Tem certeza que deseja ${
          status === 'approved' ? 'aprovar' : 'rejeitar'
        } este morador?`,
      )
    ) {
      return
    }

    try {
      setActionLoading(userId)
      const res = await fetch(`/api/admin/approvals/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Falha na ação')
      }

      setUsers((prev) => prev.filter((u) => u.id !== userId))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao processar ação')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReview(signalId: string) {
    try {
      setReviewLoading(signalId)
      const res = await fetch(`/api/admin/signals/${signalId}/review`, {
        method: 'PUT',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Falha ao revisar sinal')
      }

      setSignals((prev) =>
        prev.map((s) => (s.id === signalId ? { ...s, reviewed: true } : s))
      )
      setCategoryCounts((prev) =>
        prev.map((cc) => ({
          ...cc,
          unreviewed: cc.unreviewed > 0 ? cc.unreviewed - 1 : 0,
        }))
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao revisar sinal')
    } finally {
      setReviewLoading(null)
    }
  }

  const totalUnreviewed = categoryCounts.reduce(
    (sum, cc) => sum + cc.unreviewed,
    0,
  )

  return (
    <div className='space-y-4'>
      {/* Tab Navigation */}
      <div className='flex border-b border-slate-200'>
        <button
          type='button'
          onClick={() => setActiveTab('approvals')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            activeTab === 'approvals'
              ? 'text-blue-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Aprovações
          {activeTab === 'approvals' && (
            <span className='absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600' />
          )}
        </button>
        <button
          type='button'
          onClick={() => setActiveTab('signals')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative inline-flex items-center gap-2 ${
            activeTab === 'signals'
              ? 'text-blue-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Sinais
          {totalUnreviewed > 0 && (
            <span className='inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full'>
              {totalUnreviewed > 99 ? '99+' : totalUnreviewed}
            </span>
          )}
          {activeTab === 'signals' && (
            <span className='absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600' />
          )}
        </button>
      </div>

      {/* Approvals Tab */}
      {activeTab === 'approvals' && (
        <>
          {loading
            ? (
              <div className='p-8 text-center text-slate-500'>
                Carregando moradores pendentes...
              </div>
            )
            : error
            ? (
              <div className='p-8 text-center text-red-500'>
                Erro: {error}
              </div>
            )
            : users.length === 0
            ? (
              <div className='p-12 text-center border-2 border-dashed rounded-lg bg-slate-50'>
                <p className='text-slate-500'>
                  Nenhum cadastro pendente no momento.
                </p>
              </div>
            )
            : (
              <div className='overflow-x-auto border rounded-lg'>
                <table className='w-full text-sm text-left'>
                  <thead className='bg-slate-50 border-b'>
                    <tr>
                      <th className='px-4 py-3 font-medium text-slate-700'>
                        Nome
                      </th>
                      <th className='px-4 py-3 font-medium text-slate-700'>
                        CPF
                      </th>
                      <th className='px-4 py-3 font-medium text-slate-700'>
                        E-mail
                      </th>
                      <th className='px-4 py-3 font-medium text-slate-700'>
                        Data
                      </th>
                      <th className='px-4 py-3 font-medium text-slate-700'>
                        Documentos
                      </th>
                      <th className='px-4 py-3 font-medium text-slate-700 text-right'>
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y'>
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className='hover:bg-slate-50 transition-colors'
                      >
                        <td className='px-4 py-4 font-medium text-slate-900'>
                          {user.name}
                        </td>
                        <td className='px-4 py-4 text-slate-600'>
                          {user.cpf}
                        </td>
                        <td className='px-4 py-4 text-slate-600'>
                          {user.email}
                        </td>
                        <td className='px-4 py-4 text-slate-600'>
                          {new Date(user.createdAt).toLocaleDateString(
                            'pt-BR',
                          )}
                        </td>
                        <td className='px-4 py-4'>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() =>
                              setSelectedDocs({
                                idPhoto:
                                  user.documents?.idPhotoUrl || '',
                                residenceProof:
                                  user.documents?.residenceProofUrl ||
                                  '',
                              })}
                          >
                            Ver Fotos
                          </Button>
                        </td>
                        <td className='px-4 py-4 text-right space-x-2'>
                          <Button
                            variant='default'
                            size='sm'
                            className='bg-green-600 hover:bg-green-700 text-white border-none'
                            onClick={() =>
                              handleAction(user.id, 'approved')}
                            disabled={!!actionLoading}
                          >
                            {actionLoading === user.id ? '...' : 'Aprovar'}
                          </Button>
                          <Button
                            variant='destructive'
                            size='sm'
                            onClick={() =>
                              handleAction(user.id, 'rejected')}
                            disabled={!!actionLoading}
                          >
                            {actionLoading === user.id
                              ? '...'
                              : 'Rejeitar'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          {/* Document Modal */}
          {selectedDocs && (
            <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'>
              <div className='bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 relative shadow-2xl'>
                <button
                  type='button'
                  onClick={() => setSelectedDocs(null)}
                  className='absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-2xl'
                >
                  ×
                </button>
                <h3 className='text-xl font-bold mb-6'>
                  Documentos do Morador
                </h3>

                <div className='grid md:grid-cols-2 gap-8'>
                  <div>
                    <p className='text-sm font-medium text-slate-500 mb-2 uppercase tracking-wider'>
                      Documento de Identidade (RG/CNH)
                    </p>
                    <div className='border rounded-lg overflow-hidden bg-slate-100 min-h-[300px] flex items-center justify-center'>
                      {selectedDocs.idPhoto.toLowerCase().endsWith('.pdf')
                        ? (
                          <iframe
                            src={selectedDocs.idPhoto}
                            className='w-full h-[400px]'
                          />
                        )
                        : (
                          <img
                            src={selectedDocs.idPhoto}
                            alt='RG/CNH'
                            className='max-w-full h-auto'
                          />
                        )}
                    </div>
                    <a
                      href={selectedDocs.idPhoto}
                      target='_blank'
                      className='text-sm text-blue-600 mt-2 block hover:underline'
                    >
                      Abrir em nova aba
                    </a>
                  </div>

                  <div>
                    <p className='text-sm font-medium text-slate-500 mb-2 uppercase tracking-wider'>
                      Comprovante de Residência
                    </p>
                    <div className='border rounded-lg overflow-hidden bg-slate-100 min-h-[300px] flex items-center justify-center'>
                      {selectedDocs.residenceProof
                        .toLowerCase()
                        .endsWith('.pdf')
                        ? (
                          <iframe
                            src={selectedDocs.residenceProof}
                            className='w-full h-[400px]'
                          />
                        )
                        : (
                          <img
                            src={selectedDocs.residenceProof}
                            alt='Comprovante'
                            className='max-w-full h-auto'
                          />
                        )}
                    </div>
                    <a
                      href={selectedDocs.residenceProof}
                      target='_blank'
                      className='text-sm text-blue-600 mt-2 block hover:underline'
                    >
                      Abrir em nova aba
                    </a>
                  </div>
                </div>

                <div className='mt-8 flex justify-end'>
                  <Button onClick={() => setSelectedDocs(null)}>
                    Fechar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Signals Tab */}
      {activeTab === 'signals' && (
        <>
          {signalsLoading
            ? (
              <div className='p-8 text-center text-slate-500'>
                Carregando sinais...
              </div>
            )
            : signalsError
            ? (
              <div className='p-8 text-center text-red-500'>
                Erro: {signalsError}
              </div>
            )
            : signals.length === 0
            ? (
              <div className='p-12 text-center border-2 border-dashed rounded-lg bg-slate-50'>
                <p className='text-slate-500'>
                  Nenhum sinal de demanda recebido.
                </p>
              </div>
            )
            : (
              <div className='space-y-8'>
                {categoryCounts.map((cc) => {
                  const categorySignals = signals.filter(
                    (s) => s.category === cc.category,
                  )
                  if (categorySignals.length === 0) return null
                  return (
                    <div key={cc.category}>
                      <div className='flex items-center justify-between mb-3'>
                        <h3 className='text-lg font-bold text-slate-900'>
                          {cc.category}
                        </h3>
                        <div className='flex items-center gap-2 text-sm'>
                          <span className='text-slate-500'>
                            Total: {cc.count}
                          </span>
                          {cc.unreviewed > 0 && (
                            <span className='text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full'>
                              {cc.unreviewed} não revisado
                              {cc.unreviewed > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className='space-y-2'>
                        {categorySignals.map((signal) => (
                          <div
                            key={signal.id}
                            className={`border rounded-lg p-4 transition-colors ${
                              signal.reviewed
                                ? 'bg-white border-slate-200'
                                : 'bg-amber-50/50 border-amber-200'
                            }`}
                          >
                            <div className='flex items-start justify-between gap-4'>
                              <div className='flex-1 min-w-0'>
                                <p className='text-sm text-slate-700 whitespace-pre-wrap'>
                                  {signal.description}
                                </p>
                                <div className='flex items-center gap-3 mt-2 text-xs text-slate-400'>
                                  <span>
                                    {new Date(
                                      signal.createdAt,
                                    ).toLocaleDateString('pt-BR')}
                                  </span>
                                  {signal.reviewed && (
                                    <span className='text-green-600 font-medium'>
                                      Revisado
                                    </span>
                                  )}
                                </div>
                              </div>
                              {!signal.reviewed && (
                                <Button
                                  variant='outline'
                                  size='sm'
                                  onClick={() => handleReview(signal.id)}
                                  disabled={reviewLoading === signal.id}
                                >
                                  {reviewLoading === signal.id
                                    ? '...'
                                    : 'Marcar revisado'}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
        </>
      )}
    </div>
  )
}

import { useEffect, useState } from 'preact/hooks'
import { Button } from '../components/ui/button.tsx'
import { Badge } from '../components/ui/badge.tsx'

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

export default function ApprovalDashboard() {
  const [users, setUsers] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDocs, setSelectedDocs] = useState<
    { idPhoto: string; residenceProof: string } | null
  >(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchPendingUsers()
  }, [])

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

      // Optimistic update
      setUsers((prev) => prev.filter((u) => u.id !== userId))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao processar ação')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className='p-8 text-center text-slate-500'>
        Carregando moradores pendentes...
      </div>
    )
  }
  if (error) {
    return <div className='p-8 text-center text-red-500'>Erro: {error}</div>
  }

  return (
    <div className='space-y-4'>
      {users.length === 0
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
                  <th className='px-4 py-3 font-medium text-slate-700'>Nome</th>
                  <th className='px-4 py-3 font-medium text-slate-700'>CPF</th>
                  <th className='px-4 py-3 font-medium text-slate-700'>
                    E-mail
                  </th>
                  <th className='px-4 py-3 font-medium text-slate-700'>Data</th>
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
                    <td className='px-4 py-4 text-slate-600'>{user.cpf}</td>
                    <td className='px-4 py-4 text-slate-600'>{user.email}</td>
                    <td className='px-4 py-4 text-slate-600'>
                      {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className='px-4 py-4'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() =>
                          setSelectedDocs({
                            idPhoto: user.documents?.idPhotoUrl || '',
                            residenceProof: user.documents?.residenceProofUrl ||
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
                        onClick={() => handleAction(user.id, 'approved')}
                        disabled={!!actionLoading}
                      >
                        {actionLoading === user.id ? '...' : 'Aprovar'}
                      </Button>
                      <Button
                        variant='destructive'
                        size='sm'
                        onClick={() => handleAction(user.id, 'rejected')}
                        disabled={!!actionLoading}
                      >
                        {actionLoading === user.id ? '...' : 'Rejeitar'}
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
              onClick={() => setSelectedDocs(null)}
              className='absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-2xl'
            >
              ×
            </button>
            <h3 className='text-xl font-bold mb-6'>Documentos do Morador</h3>

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
                  {selectedDocs.residenceProof.toLowerCase().endsWith('.pdf')
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
              <Button onClick={() => setSelectedDocs(null)}>Fechar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

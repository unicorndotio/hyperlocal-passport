import { define } from '../../utils.ts'
import ApprovalDashboard from '../../islands/ApprovalDashboard.tsx'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card.tsx'

export default define.page(function AdminApprovalsPage() {
  return (
    <div className='min-h-screen bg-slate-50'>
      <header className='bg-white border-b sticky top-0 z-10'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between'>
          <h1 className='text-xl font-bold text-slate-900'>Admin: Aprovações de Moradores</h1>
          <div className='flex items-center gap-4'>
             <a href="/" className="text-sm text-slate-500 hover:text-slate-900">Voltar para o site</a>
          </div>
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <Card>
          <CardHeader>
            <CardTitle>Novos Cadastros</CardTitle>
            <CardDescription>
              Analise os documentos enviados pelos moradores para aprovar ou rejeitar o acesso ao Passaporte Local.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ApprovalDashboard />
          </CardContent>
        </Card>
      </main>
    </div>
  )
})

import { define } from '../../utils.ts'
import ApprovalDashboard from '../../islands/ApprovalDashboard.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card.tsx'

export default define.page(function AdminApprovalsPage() {
  return (
    <div className='min-h-screen bg-slate-50'>
      <header className='bg-white border-b sticky top-0 z-10'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between'>
          <div className='flex items-center gap-8'>
            <h1 className='text-xl font-bold text-slate-900'>
              Painel Administrativo
            </h1>
            <nav className='flex items-center gap-4'>
              <a
                href='/admin/approvals'
                className='text-sm font-semibold text-blue-600 transition-colors'
              >
                Aprovações
              </a>
              <span className='text-slate-300'>|</span>
              <a
                href='/admin/businesses'
                className='text-sm text-slate-500 hover:text-slate-900 transition-colors'
              >
                Empresas Parceiras
              </a>
              <span className='text-slate-300'>|</span>
              <a
                href='/admin/coupons'
                className='text-sm text-slate-500 hover:text-slate-900 transition-colors'
              >
                Cupons
              </a>
              <span className='text-slate-300'>|</span>
              <a
                href='/admin/analytics'
                className='text-sm text-slate-500 hover:text-slate-900 transition-colors'
              >
                Analytics
              </a>
            </nav>
          </div>
          <div className='flex items-center gap-4'>
            <a
              href='/'
              className='text-sm text-slate-500 hover:text-slate-900 transition-colors'
            >
              Voltar para o site
            </a>
          </div>
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <Card>
          <CardHeader>
            <CardTitle>Novos Cadastros</CardTitle>
            <CardDescription>
              Analise os documentos enviados pelos moradores para aprovar ou
              rejeitar o acesso ao Passaporte Local.
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

import { define } from '../../utils.ts'
import AdminAnalytics from '../../islands/AdminAnalytics.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card.tsx'

export default define.page(function AdminAnalyticsPage() {
  return (
    <div className='min-h-screen bg-slate-50'>
      <header className='bg-white border-b sticky top-0 z-10'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between'>
          <div className='flex items-center gap-8'>
            <h1 className='text-xl font-bold text-slate-900'>
              Admin Panel
            </h1>
            <nav className='flex items-center gap-4'>
              <a
                href='/admin/approvals'
                className='text-sm text-slate-500 hover:text-slate-900 transition-colors'
              >
                Approvals
              </a>
              <span className='text-slate-300'>|</span>
              <a
                href='/admin/businesses'
                className='text-sm text-slate-500 hover:text-slate-900 transition-colors'
              >
                Businesses
              </a>
              <span className='text-slate-300'>|</span>
              <a
                href='/admin/coupons'
                className='text-sm text-slate-500 hover:text-slate-900 transition-colors'
              >
                Coupons
              </a>
              <span className='text-slate-300'>|</span>
              <a
                href='/admin/analytics'
                className='text-sm font-semibold text-blue-600 transition-colors'
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
              Back to site
            </a>
          </div>
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <Card>
          <CardHeader>
            <CardTitle>System Analytics</CardTitle>
            <CardDescription>
              Aggregate metrics across all businesses and coupons.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminAnalytics />
          </CardContent>
        </Card>
      </main>
    </div>
  )
})

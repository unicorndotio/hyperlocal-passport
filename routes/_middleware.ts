import { define } from '../utils.ts'
import { auth } from '../lib/auth.ts'

export interface AppState {
  session: typeof auth.$Infer.Session['session'] | null
  user: typeof auth.$Infer.Session['user'] | null
}

export async function applyMiddleware(
  req: Request,
  next: () => Promise<Response>,
): Promise<Response> {
  const url = new URL(req.url)

  if (
    url.pathname.startsWith('/api/auth') ||
    url.pathname === '/api/users/register' ||
    url.pathname === '/api/businesses/register' ||
    url.pathname.startsWith('/_fresh') ||
    url.pathname.includes('.')
  ) {
    return await next()
  }

  const session = await auth.api.getSession({ headers: req.headers })

  // 1. API Protections
  if (url.pathname.startsWith('/api/')) {
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Admin-only API paths
    if (
      url.pathname.startsWith('/api/admin/') ||
      (url.pathname.startsWith('/api/businesses') &&
        (req.method === 'POST' || req.method === 'PUT' ||
          req.method === 'DELETE'))
    ) {
      if (session.user.role !== 'admin') {
        return new Response(
          JSON.stringify({ error: 'Forbidden: Admin access required' }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }
    }

    // Business or Admin API paths
    if (
      url.pathname.startsWith('/api/coupons') ||
      url.pathname.startsWith('/api/transactions/')
    ) {
      if (session.user.role !== 'business' && session.user.role !== 'admin') {
        return new Response(
          JSON.stringify({
            error: 'Forbidden: Business or Admin access required',
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }
    }
  }

  // 2. Page Route Protections
  if (
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/business') ||
    url.pathname.startsWith('/dashboard')
  ) {
    if (!session) {
      return new Response(null, {
        status: 302,
        headers: { Location: '/login' },
      })
    }

    // Admin routes
    if (url.pathname.startsWith('/admin') && session.user.role !== 'admin') {
      return new Response('Forbidden: Admin access required', { status: 403 })
    }

    // Business routes (Admin can also access)
    if (
      url.pathname.startsWith('/business') &&
      session.user.role !== 'business' && session.user.role !== 'admin'
    ) {
      return new Response('Forbidden: Business access required', {
        status: 403,
      })
    }
  }

  return await next()
}

export const handler = define.middleware((ctx) => {
  return applyMiddleware(ctx.req, () => ctx.next())
})

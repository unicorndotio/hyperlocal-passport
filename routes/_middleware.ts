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
    url.pathname.startsWith('/_fresh') ||
    url.pathname.includes('.')
  ) {
    return await next()
  }

  const session = await auth.api.getSession({ headers: req.headers })

  if (url.pathname.startsWith('/api/')) {
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  if (
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/business') ||
    url.pathname.startsWith('/dashboard')
  ) {
    if (!session) {
      return new Response(null, { status: 302, headers: { Location: '/login' } })
    }
  }

  return await next()
}

export const handler = define.middleware((ctx) => {
  return applyMiddleware(ctx.req, () => ctx.next())
})

import { Context } from 'fresh'
import { auth } from '../lib/auth.ts'

export interface AppState {
  session: typeof auth.$Infer.Session['session'] | null
  user: typeof auth.$Infer.Session['user'] | null
}

export async function handler(req: Request, ctx: Context<AppState>) {
  const url = new URL(req.url)

  // Exclude auth routes and public assets from middleware check
  if (
    url.pathname.startsWith('/api/auth') ||
    url.pathname.startsWith('/_fresh') ||
    url.pathname.includes('.')
  ) {
    return await ctx.next()
  }

  const session = await auth.api.getSession({
    headers: req.headers,
  })

  // Inject session into state
  ctx.state.session = session?.session || null
  ctx.state.user = session?.user || null

  // Protect /api routes (except /api/auth)
  if (url.pathname.startsWith('/api/')) {
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  // Example of protecting private UI routes
  // For MVP, we can assume routes like /admin, /business are private
  if (
    url.pathname.startsWith('/admin') || url.pathname.startsWith('/business') ||
    url.pathname.startsWith('/dashboard')
  ) {
    if (!session) {
      return new Response(null, {
        status: 302,
        headers: { Location: '/login' },
      })
    }
  }

  return await ctx.next()
}

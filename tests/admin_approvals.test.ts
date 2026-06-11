import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { handler as pendingHandler } from '../routes/api/admin/approvals/pending.ts'
import { handler as actionHandler } from '../routes/api/admin/approvals/[userId].ts'
import { applyMiddleware } from '../routes/_middleware.ts'
import { auth } from '../lib/auth.ts'

const kv = await Deno.openKv()

async function setupTestUser(
  userId: string,
  status: 'pending' | 'approved' | 'rejected' = 'pending',
) {
  const user = {
    id: userId,
    name: 'Test User',
    cpf: '12345678901',
    email: 'test@example.com',
    role: 'resident',
    status,
    createdAt: Date.now(),
  }
  await kv.set(['user', userId], user)
  if (status === 'pending') {
    await kv.set(['approvals', 'pending', userId], {
      userId,
      createdAt: user.createdAt,
    })
  }
  return user
}

async function cleanupTestUser(userId: string) {
  await kv.delete(['user', userId])
  await kv.delete(['approvals', 'pending', userId])
}

Deno.test('Admin Approvals API', async (t) => {
  await t.step(
    'GET /api/admin/approvals/pending returns pending users',
    async () => {
      const userId = crypto.randomUUID()
      await setupTestUser(userId)

      // We need to pass a mock context to the handler if using define.handlers
      // But define.handlers returns a handler that takes a context.
      // Fresh 2.0 handlers are a bit different.
      // Let's see how they are exported.
      // routes/api/admin/approvals/pending.ts: export const handler = define.handlers({ ... })

      // For simplicity, let's extract the GET logic or call it via a mock context.
      // Since I wrote the files, I know how they look.

      const req = new Request(
        'http://localhost:8000/api/admin/approvals/pending',
      )
      // define.handlers returns a function (ctx: Context) => Response | Promise<Response>
      // In Fresh 2, the context has a 'req' property.
      const res = await (pendingHandler as unknown as {
        GET: (ctx: unknown) => Promise<Response>
      }).GET({ req })
      assertEquals(res.status, 200)
      const users = await res.json()
      const found = users.find((u: { id: string }) => u.id === userId)
      assertExists(found)
      assertEquals(found.status, 'pending')

      await cleanupTestUser(userId)
    },
  )

  await t.step(
    'POST /api/admin/approvals/:userId approves a user',
    async () => {
      const userId = crypto.randomUUID()
      await setupTestUser(userId)

      const req = new Request(
        `http://localhost:8000/api/admin/approvals/${userId}`,
        {
          method: 'POST',
          body: JSON.stringify({ status: 'approved' }),
        },
      )
      const res = await (actionHandler as unknown as {
        POST: (ctx: unknown) => Promise<Response>
      }).POST({ req, params: { userId } })
      assertEquals(res.status, 200)

      const user = await res.json()
      assertEquals(user.status, 'approved')

      // Verify KV
      const kvUser = await kv.get(['user', userId])
      assertEquals((kvUser.value as { status: string }).status, 'approved')
      const kvPending = await kv.get(['approvals', 'pending', userId])
      assertEquals(kvPending.value, null)

      await cleanupTestUser(userId)
    },
  )

  await t.step('POST /api/admin/approvals/:userId rejects a user', async () => {
    const userId = crypto.randomUUID()
    await setupTestUser(userId)

    const req = new Request(
      `http://localhost:8000/api/admin/approvals/${userId}`,
      {
        method: 'POST',
        body: JSON.stringify({ status: 'rejected' }),
      },
    )
    const res = await (actionHandler as unknown as {
      POST: (ctx: unknown) => Promise<Response>
    }).POST({ req, params: { userId } })
    assertEquals(res.status, 200)

    const user = await res.json()
    assertEquals(user.status, 'rejected')

    // Verify KV
    const kvUser = await kv.get(['user', userId])
    assertEquals((kvUser.value as { status: string }).status, 'rejected')
    const kvPending = await kv.get(['approvals', 'pending', userId])
    assertEquals(kvPending.value, null)

    await cleanupTestUser(userId)
  })

  await t.step(
    'POST /api/admin/approvals/:userId returns 400 for invalid status',
    async () => {
      const userId = crypto.randomUUID()
      await setupTestUser(userId)

      const req = new Request(
        `http://localhost:8000/api/admin/approvals/${userId}`,
        {
          method: 'POST',
          body: JSON.stringify({ status: 'invalid' }),
        },
      )
      const res = await (actionHandler as unknown as {
        POST: (ctx: unknown) => Promise<Response>
      }).POST({ req, params: { userId } })
      assertEquals(res.status, 400)

      await cleanupTestUser(userId)
    },
  )

  await t.step(
    'POST /api/admin/approvals/:userId returns 400 for invalid JSON',
    async () => {
      const userId = crypto.randomUUID()
      const req = new Request(
        `http://localhost:8000/api/admin/approvals/${userId}`,
        {
          method: 'POST',
          body: 'not-json',
        },
      )
      const res = await (actionHandler as unknown as {
        POST: (ctx: unknown) => Promise<Response>
      }).POST({ req, params: { userId } })
      assertEquals(res.status, 400)
      const body = await res.json()
      assertEquals(body.error, 'Invalid JSON')
    },
  )

  await t.step(
    'POST /api/admin/approvals/:userId returns 404 for missing user',
    async () => {
      const userId = crypto.randomUUID()
      const req = new Request(
        `http://localhost:8000/api/admin/approvals/${userId}`,
        {
          method: 'POST',
          body: JSON.stringify({ status: 'approved' }),
        },
      )
      const res = await (actionHandler as unknown as {
        POST: (ctx: unknown) => Promise<Response>
      }).POST({ req, params: { userId } })
      assertEquals(res.status, 404)
      const body = await res.json()
      assertEquals(body.error, 'User not found')
    },
  )
})

Deno.test('Admin Middleware', async (t) => {
  const originalGetSession = auth.api.getSession

  await t.step('blocks unauthorized from /api/*', async () => {
    // Mock no session
    ;(auth.api as unknown as { getSession: unknown }).getSession = () =>
      Promise.resolve(null)

    const req = new Request('http://localhost:8000/api/admin/approvals/pending')
    const res = await applyMiddleware(
      req,
      () => Promise.resolve(new Response('OK')),
    )

    assertEquals(res.status, 401)
    const body = await res.json()
    assertEquals(body.error, 'Unauthorized')
  })

  await t.step('redirects unauthorized from /admin*', async () => {
    // Mock no session
    ;(auth.api as unknown as { getSession: unknown }).getSession = () =>
      Promise.resolve(null)

    const req = new Request('http://localhost:8000/admin/users')
    const res = await applyMiddleware(
      req,
      () => Promise.resolve(new Response('OK')),
    )

    assertEquals(res.status, 302)
    assertEquals(res.headers.get('Location'), '/login')
  })

  await t.step('blocks non-admin from /admin*', async () => {
    // Mock resident
    ;(auth.api as unknown as { getSession: unknown }).getSession = () =>
      Promise.resolve({
        session: { id: 's1', userId: 'u1' },
        user: { id: 'u1', role: 'resident' },
      } as unknown)

    const req = new Request('http://localhost:8000/admin/users')
    const res = await applyMiddleware(
      req,
      () => Promise.resolve(new Response('OK')),
    )

    assertEquals(res.status, 403)
    assertEquals(await res.text(), 'Forbidden: Admin access required')
  })

  await t.step('redirects unauthorized from /business*', async () => {
    ;(auth.api as unknown as { getSession: unknown }).getSession = () =>
      Promise.resolve(null)
    const req = new Request('http://localhost:8000/business/settings')
    const res = await applyMiddleware(
      req,
      () => Promise.resolve(new Response('OK')),
    )
    assertEquals(res.status, 302)
  })

  await t.step('redirects unauthorized from /dashboard*', async () => {
    ;(auth.api as unknown as { getSession: unknown }).getSession = () =>
      Promise.resolve(null)
    const req = new Request('http://localhost:8000/dashboard')
    const res = await applyMiddleware(
      req,
      () => Promise.resolve(new Response('OK')),
    )
    assertEquals(res.status, 302)
  })

  await t.step('blocks non-admin from /api/admin/*', async () => {
    // Mock session for resident
    ;(auth.api as unknown as { getSession: unknown }).getSession = () =>
      Promise.resolve({
        session: {
          id: 's1',
          userId: 'u1',
          expiresAt: new Date(Date.now() + 100000),
          token: 't1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        user: {
          id: 'u1',
          email: 'user@test.com',
          emailVerified: true,
          name: 'User',
          role: 'resident',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as unknown)

    const req = new Request('http://localhost:8000/api/admin/approvals/pending')
    const res = await applyMiddleware(
      req,
      () => Promise.resolve(new Response('OK')),
    )

    assertEquals(res.status, 403)
    const body = await res.json()
    assertEquals(body.error, 'Forbidden: Admin access required')
  })

  await t.step('allows admin to /api/admin/*', async () => {
    // Mock session for admin
    ;(auth.api as unknown as { getSession: unknown }).getSession = () =>
      Promise.resolve({
        session: {
          id: 's2',
          userId: 'u2',
          expiresAt: new Date(Date.now() + 100000),
          token: 't2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        user: {
          id: 'u2',
          email: 'admin@test.com',
          emailVerified: true,
          name: 'Admin',
          role: 'admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as unknown)

    const req = new Request('http://localhost:8000/api/admin/approvals/pending')
    const res = await applyMiddleware(
      req,
      () => Promise.resolve(new Response('OK')),
    )

    assertEquals(res.status, 200)
    assertEquals(await res.text(), 'OK')
  })

  await t.step('allows public api routes without session', async () => {
    const req = new Request('http://localhost:8000/api/auth/callback')
    const res = await applyMiddleware(
      req,
      () => Promise.resolve(new Response('OK')),
    )
    assertEquals(res.status, 200)
    assertEquals(await res.text(), 'OK')
  })

  await t.step('allows registration without session', async () => {
    const req = new Request('http://localhost:8000/api/users/register')
    const res = await applyMiddleware(
      req,
      () => Promise.resolve(new Response('OK')),
    )
    assertEquals(res.status, 200)
  })

  await t.step('allows static assets', async () => {
    const req = new Request('http://localhost:8000/styles.css')
    const res = await applyMiddleware(
      req,
      () => Promise.resolve(new Response('OK')),
    )
    assertEquals(res.status, 200)
  })

  await t.step('blocks POST /api/businesses as resident', async () => {
    ;(auth.api as unknown as { getSession: unknown }).getSession = () =>
      Promise.resolve({
        session: {
          id: 's3',
          userId: 'u3',
          expiresAt: new Date(Date.now() + 100000),
          token: 't3',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        user: {
          id: 'u3',
          email: 'res@test.com',
          emailVerified: true,
          name: 'Res',
          role: 'resident',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as unknown)

    const req = new Request('http://localhost:8000/api/businesses', {
      method: 'POST',
    })
    const res = await applyMiddleware(
      req,
      () => Promise.resolve(new Response('OK')),
    )
    assertEquals(res.status, 403)
    const body = await res.json()
    assertEquals(body.error, 'Forbidden: Admin access required')
  })

  await t.step('allows GET /api/businesses as resident', async () => {
    ;(auth.api as unknown as { getSession: unknown }).getSession = () =>
      Promise.resolve({
        session: {
          id: 's4',
          userId: 'u4',
          expiresAt: new Date(Date.now() + 100000),
          token: 't4',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        user: {
          id: 'u4',
          email: 'res2@test.com',
          emailVerified: true,
          name: 'Res2',
          role: 'resident',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as unknown)

    const req = new Request('http://localhost:8000/api/businesses', {
      method: 'GET',
    })
    const res = await applyMiddleware(
      req,
      () => Promise.resolve(new Response('OK')),
    )
    assertEquals(res.status, 200)
  })

  await t.step('blocks /api/coupons as resident', async () => {
    ;(auth.api as unknown as { getSession: unknown }).getSession = () =>
      Promise.resolve({
        session: {
          id: 's5',
          userId: 'u5',
          expiresAt: new Date(Date.now() + 100000),
          token: 't5',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        user: {
          id: 'u5',
          email: 'res3@test.com',
          emailVerified: true,
          name: 'Res3',
          role: 'resident',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as unknown)

    const req = new Request('http://localhost:8000/api/coupons/123')
    const res = await applyMiddleware(
      req,
      () => Promise.resolve(new Response('OK')),
    )
    assertEquals(res.status, 403)
    const body = await res.json()
    assertEquals(body.error, 'Forbidden: Business or Admin access required')
  })

  await t.step('allows /api/coupons as business', async () => {
    ;(auth.api as unknown as { getSession: unknown }).getSession = () =>
      Promise.resolve({
        session: {
          id: 's6',
          userId: 'u6',
          expiresAt: new Date(Date.now() + 100000),
          token: 't6',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        user: {
          id: 'u6',
          email: 'biz@test.com',
          emailVerified: true,
          name: 'Biz',
          role: 'business',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as unknown)

    const req = new Request('http://localhost:8000/api/coupons/123')
    const res = await applyMiddleware(
      req,
      () => Promise.resolve(new Response('OK')),
    )
    assertEquals(res.status, 200)
  })

  await t.step('allows /api/coupons as admin', async () => {
    ;(auth.api as unknown as { getSession: unknown }).getSession = () =>
      Promise.resolve({
        session: {
          id: 's7',
          userId: 'u7',
          expiresAt: new Date(Date.now() + 100000),
          token: 't7',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        user: {
          id: 'u7',
          email: 'admin2@test.com',
          emailVerified: true,
          name: 'Admin2',
          role: 'admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as unknown)

    const req = new Request('http://localhost:8000/api/coupons/123')
    const res = await applyMiddleware(
      req,
      () => Promise.resolve(new Response('OK')),
    )
    assertEquals(res.status, 200)
  })

  await t.step('blocks resident from /business page', async () => {
    ;(auth.api as unknown as { getSession: unknown }).getSession = () =>
      Promise.resolve({
        session: {
          id: 's8',
          userId: 'u8',
          expiresAt: new Date(Date.now() + 100000),
          token: 't8',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        user: {
          id: 'u8',
          email: 'resident@test.com',
          emailVerified: true,
          name: 'Resident',
          role: 'resident',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as unknown)

    const req = new Request('http://localhost:8000/business/settings')
    const res = await applyMiddleware(
      req,
      () => Promise.resolve(new Response('OK')),
    )
    assertEquals(res.status, 403)
    assertEquals(await res.text(), 'Forbidden: Business access required')
  })

  await t.step('allows business user to /business page', async () => {
    ;(auth.api as unknown as { getSession: unknown }).getSession = () =>
      Promise.resolve({
        session: {
          id: 's9',
          userId: 'u9',
          expiresAt: new Date(Date.now() + 100000),
          token: 't9',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        user: {
          id: 'u9',
          email: 'biz@test.com',
          emailVerified: true,
          name: 'Biz',
          role: 'business',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as unknown)

    const req = new Request('http://localhost:8000/business/settings')
    const res = await applyMiddleware(
      req,
      () => Promise.resolve(new Response('OK')),
    )
    assertEquals(res.status, 200)
    assertEquals(await res.text(), 'OK')
  })

  auth.api.getSession = originalGetSession
})

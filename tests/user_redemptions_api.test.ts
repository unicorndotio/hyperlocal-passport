import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { stub } from 'https://deno.land/std@0.224.0/testing/mock.ts'
import { handler as redemptionsHandler } from '../routes/api/users/me/redemptions.ts'
import { auth } from '../lib/auth.ts'
import { kv } from '../lib/kv.ts'
import { Redemption } from '../lib/coupon.ts'

Deno.test('User Redemptions API', async (t) => {
  const userId = 'user_' + Math.random().toString(36).slice(2)

  // Stub auth.api.getSession
  const getSessionStub = stub(
    auth.api,
    'getSession',
    (() => {
      return Promise.resolve({
        user: {
          id: userId,
          role: 'resident',
          email: 'test@example.com',
          emailVerified: true,
          name: 'Test User',
          createdAt: new Date(),
          updatedAt: new Date(),
        } satisfies typeof auth.$Infer.Session['user'],
        session: {
          id: 'sess_1',
          userId,
          expiresAt: new Date(Date.now() + 3600000),
          token: 'token_1',
          createdAt: new Date(),
          updatedAt: new Date(),
        } satisfies typeof auth.$Infer.Session['session'],
      })
    }) as (...args: unknown[]) => ReturnType<typeof auth.api.getSession>,
  )

  try {
    await t.step('GET /api/users/me/redemptions - Empty', async () => {
      const req = new Request(
        `http://localhost:8000/api/users/me/redemptions`,
        {
          method: 'GET',
        },
      )
      const res = await (redemptionsHandler as unknown as {
        GET: (ctx: unknown) => Promise<Response>
      }).GET({
        req,
      })

      assertEquals(res.status, 200)
      const body = await res.json()
      assertEquals(Array.isArray(body), true)
      assertEquals(body.length, 0)
    })

    await t.step('GET /api/users/me/redemptions - Success', async () => {
      const now = Date.now()
      const redemption1: Redemption = {
        id: 'CODE1',
        couponId: 'c1',
        businessId: 'b1',
        userId: userId,
        status: 'active',
        redeemedAt: now,
      }
      const redemption2: Redemption = {
        id: 'CODE2',
        couponId: 'c2',
        businessId: 'b1',
        userId: userId,
        status: 'used',
        redeemedAt: now - 1000,
      }

      await kv.set(['user_redemptions', userId, now], redemption1)
      await kv.set(['user_redemptions', userId, now - 1000], redemption2)

      const req = new Request(
        `http://localhost:8000/api/users/me/redemptions`,
        {
          method: 'GET',
        },
      )
      const res = await (redemptionsHandler as unknown as {
        GET: (ctx: unknown) => Promise<Response>
      }).GET({
        req,
      })

      assertEquals(res.status, 200)
      const body = await res.json() as Redemption[]
      assertEquals(body.length, 1)
      assertEquals(body[0].id, 'CODE1')
      assertEquals(body[0].status, 'active')
    })

    await t.step('GET /api/users/me/redemptions - Unauthorized', async () => {
      getSessionStub.restore()
      stub(auth.api, 'getSession', () => Promise.resolve(null))

      const req = new Request(
        `http://localhost:8000/api/users/me/redemptions`,
        {
          method: 'GET',
        },
      )
      const res = await (redemptionsHandler as unknown as {
        GET: (ctx: unknown) => Promise<Response>
      }).GET({
        req,
      })

      assertEquals(res.status, 401)
    })
  } finally {
    // Clean up
    const iter = kv.list({ prefix: ['user_redemptions', userId] })
    for await (const entry of iter) {
      await kv.delete(entry.key)
    }
  }
})

import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { drizzle } from 'npm:drizzle-orm@0.38.2/node-postgres'
import pgModule from 'npm:pg@8.13.1'
import * as schema from '../db/schema.ts'
import { applyMiddleware } from '../routes/_middleware.ts'

const Pool = pgModule.Pool

// Use test database if available
const connString = Deno.env.get('PG_CONNECTION_TEST') ||
  'postgresql://root:password@postgres:5432/passport_test'

async function setupTestDb() {
  const pool = new Pool({
    connectionString: connString,
    max: 2,
  })

  const db = drizzle({ client: pool, schema })
  return { db, pool }
}

async function cleanupTestDb(pool: any) {
  await pool.end()
}

Deno.test('Better Auth Integration with Drizzle', async (t) => {
  const { db, pool } = await setupTestDb()

  try {
    // Clear test data before running tests
    await db.delete(schema.session).execute()
    await db.delete(schema.account).execute()
    await db.delete(schema.users).execute()

    const testAuth = betterAuth({
      database: drizzleAdapter(db, {
        provider: 'pg',
        schema: {
          user: 'user',
          session: 'session',
          account: 'account',
          verification: 'verification',
        },
      }),
      baseURL: 'http://localhost:8000',
      emailAndPassword: {
        enabled: true,
      },
      user: {
        additionalFields: {
          role: {
            type: 'string',
            required: false,
          },
          status: {
            type: 'string',
            required: false,
          },
        },
      },
    })

    await t.step('Sign up new user', async () => {
      const req = new Request('http://localhost:8000/api/auth/sign-up/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'securePassword123',
          name: 'Auth User',
        }),
      })

      const res = await testAuth.handler(req)
      assertEquals(res.status, 200)

      const body = await res.json()
      assertExists(body.user)
      assertEquals(body.user.email, 'test@example.com')
      assertExists(body.user.id)
    })

    await t.step('Sign in user', async () => {
      const req = new Request('http://localhost:8000/api/auth/sign-in/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'securePassword123',
        }),
      })

      const res = await testAuth.handler(req)
      assertEquals(res.status, 200)

      const body = await res.json()
      assertExists(body.token)
      assertExists(body.user)
      assertEquals(body.user.email, 'test@example.com')
    })

    await t.step('Get session with valid token', async () => {
      // First sign up
      const signUpReq = new Request(
        'http://localhost:8000/api/auth/sign-up/email',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'test2@example.com',
            password: 'securePassword123',
            name: 'Auth User 2',
          }),
        },
      )

      const signUpRes = await testAuth.handler(signUpReq)
      const signUpBody = await signUpRes.json()
      const token = signUpBody.token

      // Now get session
      const sessionReq = new Request('http://localhost:8000/api/auth/session', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const sessionRes = await testAuth.handler(sessionReq)
      assertEquals(sessionRes.status, 200)

      const sessionBody = await sessionRes.json()
      assertExists(sessionBody.user)
      assertEquals(sessionBody.user.email, 'test2@example.com')
    })

    await t.step('User has default role and status', async () => {
      // Sign up
      const signUpReq = new Request(
        'http://localhost:8000/api/auth/sign-up/email',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'test3@example.com',
            password: 'securePassword123',
            name: 'Test User 3',
          }),
        },
      )

      const signUpRes = await testAuth.handler(signUpReq)
      const signUpBody = await signUpRes.json()

      // Check user has role and status fields
      assertEquals(signUpBody.user.role, 'resident')
      assertEquals(signUpBody.user.status, 'pending')
    })
  } finally {
    await cleanupTestDb(pool)
  }
})

Deno.test('Fresh Auth Middleware Protection', async (t) => {
  await t.step('Allow public routes', async () => {
    const req = new Request('http://localhost/api/auth/session')
    let nextCalled = false

    const res = await applyMiddleware(req, () => {
      nextCalled = true
      return Promise.resolve(new Response('OK'))
    })
    assertEquals(nextCalled, true)
    assertEquals(res.status, 200)
  })

  await t.step('Reject protected route without session', async () => {
    const req = new Request('http://localhost/api/protected')
    let nextCalled = false

    const res = await applyMiddleware(req, () => {
      nextCalled = true
      return Promise.resolve(new Response('OK'))
    })
    assertEquals(nextCalled, false)
    assertEquals(res.status, 401)
  })
})

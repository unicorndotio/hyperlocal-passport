import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { betterAuth } from 'better-auth'
import { denoKvAdapter, getDenoKvAdapterRaw } from '../lib/kv-adapter.ts'
import {
  AppState,
  handler as middlewareHandler,
} from '../routes/_middleware.ts'
import { Context } from 'fresh'

Deno.test('Deno KV Adapter - Core CRUD operations', async (t) => {
  const kv = await Deno.openKv(':memory:')
  const adapter = getDenoKvAdapterRaw(kv)

  await t.step('create and findOne', async () => {
    const user = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'resident',
    }

    const created = await adapter.create({
      model: 'user',
      data: user,
    })

    assertEquals(created.id, 'user-1')
    assertEquals(created.email, 'test@example.com')

    const found = await adapter.findOne({
      model: 'user',
      where: [{ field: 'email', value: 'test@example.com' }],
    })

    assertExists(found)
    assertEquals(found.name, 'Test User')
  })

  await t.step('update and findOne', async () => {
    const updated = await adapter.update({
      model: 'user',
      where: [{ field: 'id', value: 'user-1' }],
      update: { name: 'Updated Name' },
    })

    assertExists(updated)
    assertEquals(updated.name, 'Updated Name')

    const found = await adapter.findOne({
      model: 'user',
      where: [{ field: 'id', value: 'user-1' }],
    })

    assertEquals(found!.name, 'Updated Name')
  })

  await t.step('findMany', async () => {
    const list = await adapter.findMany({
      model: 'user',
      where: [{ field: 'role', value: 'resident' }],
    })

    assertEquals(list.length, 1)
    assertEquals(list[0].id, 'user-1')
  })

  await t.step('count and updateMany', async () => {
    // create another user
    await adapter.create({
      model: 'user',
      data: {
        id: 'user-2',
        email: 'test2@example.com',
        name: 'Test User 2',
        role: 'resident',
      },
    })

    const cBefore = await adapter.count({
      model: 'user',
      where: [{ field: 'role', value: 'resident' }],
    })
    assertEquals(cBefore, 2)

    const updatedCount = await adapter.updateMany({
      model: 'user',
      where: [{ field: 'role', value: 'resident' }],
      update: { role: 'business' },
    })
    assertEquals(updatedCount, 2)

    const cAfter = await adapter.count({
      model: 'user',
      where: [{ field: 'role', value: 'resident' }],
    })
    assertEquals(cAfter, 0)
  })

  await t.step('delete and deleteMany', async () => {
    await adapter.delete({
      model: 'user',
      where: [{ field: 'id', value: 'user-1' }],
    })

    const deletedCount = await adapter.deleteMany({
      model: 'user',
      where: [{ field: 'role', value: 'business' }],
    })
    assertEquals(deletedCount, 1) // user-2 got deleted since its role was updated to business

    const found = await adapter.findOne({
      model: 'user',
      where: [{ field: 'id', value: 'user-1' }],
    })

    assertEquals(found, null)
  })

  kv.close()
})

Deno.test('Better Auth Integration with Deno KV', async (t) => {
  const kv = await Deno.openKv(':memory:')
  const testAuth = betterAuth({
    database: denoKvAdapter(kv),
    baseURL: 'http://localhost:8000',
    emailAndPassword: {
      enabled: true,
    },
  })

  await t.step('Sign Up new user', async () => {
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
  })

  await t.step('Sign In user', async () => {
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
  })

  kv.close()
})

Deno.test('Fresh Auth Middleware Protection', async (t) => {
  await t.step('Allow public routes', async () => {
    const req = new Request('http://localhost/api/auth/session')
    let nextCalled = false
    const mockCtx = {
      state: {},
      next: () => {
        nextCalled = true
        return Promise.resolve(new Response('OK'))
      },
    } as unknown as Context<AppState>

    const res = await middlewareHandler(req, mockCtx)
    assertEquals(nextCalled, true)
    assertEquals(res.status, 200)
  })

  await t.step('Reject protected route without session', async () => {
    const req = new Request('http://localhost/api/protected')
    let nextCalled = false
    const mockCtx = {
      state: {},
      next: () => {
        nextCalled = true
        return Promise.resolve(new Response('OK'))
      },
    } as unknown as Context<AppState>

    const res = await middlewareHandler(req, mockCtx)
    assertEquals(nextCalled, false)
    assertEquals(res.status, 401)
  })
})

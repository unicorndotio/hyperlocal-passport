import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { getDenoKvAdapterRaw } from '../lib/kv-adapter.ts'

Deno.test('Business API CRUD Operations', async (t) => {
  const kv = await Deno.openKv(':memory:')
  try {
    const adapter = getDenoKvAdapterRaw(kv)

    await t.step('create business', async () => {
      const business = (await adapter.create({
        model: 'businesses',
        data: {
          name: 'Test Business',
          description: 'A test business',
          logoUrl: 'http://localhost/logo.png',
          userId: 'user_123',
        },
      })) as { id: string; name: string }
      assertExists(business.id)
      assertEquals(business.name, 'Test Business')
    })

    await t.step('list businesses', async () => {
      const businesses = await adapter.findMany({ model: 'businesses' })
      assertEquals(businesses.length, 1)
    })

    await t.step('update business', async () => {
      const updated = await adapter.update({
        model: 'businesses',
        where: [{ field: 'name', value: 'Test Business' }],
        update: { name: 'Updated Business' },
      })
      assertExists(updated)
      assertEquals(updated.name, 'Updated Business')
    })

    await t.step('delete business', async () => {
      await adapter.delete({
        model: 'businesses',
        where: [{ field: 'name', value: 'Updated Business' }],
      })
      const businesses = await adapter.findMany({ model: 'businesses' })
      assertEquals(businesses.length, 0)
    })
  } finally {
    kv.close()
  }
})

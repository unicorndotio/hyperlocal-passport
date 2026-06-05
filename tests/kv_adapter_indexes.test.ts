import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { getDenoKvAdapterRaw } from '../lib/kv-adapter.ts'

Deno.test('Deno KV Adapter - Index Maintenance', async (t) => {
  const kv = await Deno.openKv(':memory:')
  const adapter = getDenoKvAdapterRaw(kv)

  await t.step('update indexed field', async () => {
    const user = {
      id: 'user-idx-1',
      email: 'original@example.com',
      name: 'Index Test User',
    }

    await adapter.create({
      model: 'user',
      data: user,
    })

    // Verify index exists in KV
    const initialIdx = await kv.get(['user_by_email', 'original@example.com'])
    assertEquals(initialIdx.value, 'user-idx-1', 'Initial index should exist')

    // Update email
    await adapter.update({
      model: 'user',
      where: [{ field: 'id', value: 'user-idx-1' }],
      update: { email: 'updated@example.com' },
    })

    // Verify lookup by NEW email works
    const foundByNewEmail = await adapter.findOne({
      model: 'user',
      where: [{ field: 'email', value: 'updated@example.com' }],
    })
    assertExists(foundByNewEmail, 'Should find user by updated email')

    // CHECK KV DIRECTLY FOR STALE INDEX
    const staleIdx = await kv.get(['user_by_email', 'original@example.com'])
    assertEquals(staleIdx.value, null, 'Old index should be removed')

    // CHECK KV DIRECTLY FOR NEW INDEX
    const newIdx = await kv.get(['user_by_email', 'updated@example.com'])
    assertEquals(newIdx.value, 'user-idx-1', 'New index should be created')
  })

  await t.step('delete record removes index', async () => {
    const user = {
      id: 'user-idx-2',
      email: 'delete-me@example.com',
      name: 'Delete Test User',
    }

    await adapter.create({
      model: 'user',
      data: user,
    })

    // Delete user
    await adapter.delete({
      model: 'user',
      where: [{ field: 'id', value: 'user-idx-2' }],
    })

    // CHECK KV DIRECTLY FOR REMOVED INDEX
    const removedIdx = await kv.get(['user_by_email', 'delete-me@example.com'])
    assertEquals(
      removedIdx.value,
      null,
      'Index should be removed after deletion',
    )
  })

  kv.close()
})

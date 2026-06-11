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

Deno.test('Deno KV Adapter - Branch Coverage', async (t) => {
  const kv = await Deno.openKv(':memory:')
  const adapter = getDenoKvAdapterRaw(kv)

  const alice = {
    id: 'u-br-1',
    email: 'alice@test.com',
    cpf: '111',
    name: 'Alice',
  }
  const bob = { id: 'u-br-2', email: 'bob@test.com', cpf: '222', name: 'Bob' }

  await adapter.create({ model: 'user', data: alice })
  await adapter.create({ model: 'user', data: bob })

  await t.step(
    'findOne - index matches but secondary where field does not',
    async () => {
      const result = await adapter.findOne({
        model: 'user',
        where: [{ field: 'email', value: 'alice@test.com' }, {
          field: 'cpf',
          value: '999',
        }],
      })
      assertEquals(result, null)
    },
  )

  await t.step('findOne - index does not exist at all', async () => {
    const result = await adapter.findOne({
      model: 'user',
      where: [{ field: 'email', value: 'nonexistent@test.com' }],
    })
    assertEquals(result, null)
  })

  await t.step(
    'findMany - index matches but secondary where field does not',
    async () => {
      const results = await adapter.findMany({
        model: 'user',
        where: [{ field: 'email', value: 'alice@test.com' }, {
          field: 'cpf',
          value: '999',
        }],
      })
      assertEquals(results.length, 0)
    },
  )

  await t.step('findMany - index lookup returns no result', async () => {
    const results = await adapter.findMany({
      model: 'user',
      where: [{ field: 'email', value: 'unknown@test.com' }],
    })
    assertEquals(results.length, 0)
  })

  await t.step(
    'findMany - scan mode filters when using non-indexed field',
    async () => {
      const results = await adapter.findMany({
        model: 'user',
        where: [{ field: 'name', value: 'Nonexistent' }],
      })
      assertEquals(results.length, 0)
    },
  )

  await t.step(
    'findMany - scan mode with multiple where clauses filters correctly',
    async () => {
      const results = await adapter.findMany({
        model: 'user',
        where: [{ field: 'name', value: 'Alice' }, {
          field: 'cpf',
          value: '999',
        }],
      })
      assertEquals(results.length, 0)
    },
  )

  await t.step('findMany - no where clause returns all', async () => {
    const results = await adapter.findMany({ model: 'user' })
    assertEquals(results.length >= 2, true)
  })

  await t.step('updateMany - where clause finds matching records', async () => {
    const count = await adapter.updateMany({
      model: 'user',
      where: [{ field: 'email', value: 'alice@test.com' }],
      update: { name: 'Alice Updated' },
    })
    assertEquals(count, 1)
    const found = await adapter.findOne({
      model: 'user',
      where: [{ field: 'email', value: 'alice@test.com' }],
    })
    assertEquals((found as Record<string, unknown>).name, 'Alice Updated')
  })

  await t.step('updateMany - where clause does not match', async () => {
    const count = await adapter.updateMany({
      model: 'user',
      where: [{ field: 'email', value: 'nobody@test.com' }],
      update: { name: 'Nope' },
    })
    assertEquals(count, 0)
  })

  await t.step('deleteMany - where clause finds matching records', async () => {
    const carol = {
      id: 'u-br-3',
      email: 'carol@test.com',
      cpf: '333',
      name: 'Carol',
    }
    await adapter.create({ model: 'user', data: carol })
    const count = await adapter.deleteMany({
      model: 'user',
      where: [{ field: 'email', value: 'carol@test.com' }],
    })
    assertEquals(count, 1)
    const found = await adapter.findOne({
      model: 'user',
      where: [{ field: 'email', value: 'carol@test.com' }],
    })
    assertEquals(found, null)
  })

  await t.step('deleteMany - where clause does not match', async () => {
    const count = await adapter.deleteMany({
      model: 'user',
      where: [{ field: 'email', value: 'nobody@test.com' }],
    })
    assertEquals(count, 0)
  })

  await t.step('delete - record does not exist', async () => {
    await adapter.delete({
      model: 'user',
      where: [{ field: 'email', value: 'ghost@test.com' }],
    })
    // Should not throw, just return undefined
  })

  await t.step('count - all records', async () => {
    const total = await adapter.count({ model: 'user' })
    assertEquals(total >= 2, true)
  })

  await t.step('count - with where clause matches', async () => {
    const count = await adapter.count({
      model: 'user',
      where: [{ field: 'email', value: 'alice@test.com' }],
    })
    assertEquals(count, 1)
  })

  await t.step('count - with where clause does not match', async () => {
    const count = await adapter.count({
      model: 'user',
      where: [{ field: 'email', value: 'nobody@test.com' }],
    })
    assertEquals(count, 0)
  })

  await t.step('updateMany - index cleanup when field changes', async () => {
    const dave = {
      id: 'u-br-4',
      email: 'dave-old@test.com',
      cpf: '444',
      name: 'Dave',
    }
    await adapter.create({ model: 'user', data: dave })

    await adapter.updateMany({
      model: 'user',
      where: [{ field: 'email', value: 'dave-old@test.com' }],
      update: { email: 'dave-new@test.com' },
    })

    const oldIdx = await kv.get(['user_by_email', 'dave-old@test.com'])
    assertEquals(oldIdx.value, null, 'Old index should be cleaned up')
    const newIdx = await kv.get(['user_by_email', 'dave-new@test.com'])
    assertEquals(newIdx.value, 'u-br-4', 'New index should be created')
  })

  kv.close()
})

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { cleanupDatabase, useDatabase } from '../lib/test-db.ts'
import { db } from '../lib/db.ts'
import * as schema from '../db/schema.ts'

const originalTest = Deno.test

Deno.test({
  name: 'useDatabase - skip guard activates without PG_CONNECTION',
  fn() {
    const oldConn = Deno.env.get('PG_CONNECTION')
    Deno.env.delete('PG_CONNECTION')

    // deno-lint-ignore react-rules-of-hooks
    useDatabase()

    assertEquals(Deno.test !== originalTest, true)

    if (oldConn) Deno.env.set('PG_CONNECTION', oldConn)
    Object.defineProperty(Deno, 'test', {
      value: originalTest,
      writable: true,
      configurable: true,
    })
  },
})

Deno.test({
  name: 'useDatabase - is a function',
  fn() {
    assertEquals(typeof useDatabase, 'function')
  },
})

Deno.test({
  name: 'cleanupDatabase - is a function',
  fn() {
    assertEquals(typeof cleanupDatabase, 'function')
  },
})

Deno.test({
  name: 'cleanupDatabase - truncates businesses without FK errors',
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const userId = 'test_util_' + crypto.randomUUID()
    await db.insert(schema.users).values({
      id: userId,
      email: `${userId}@test.com`,
      name: 'Test Util',
    }).onConflictDoNothing({ target: schema.users.id })

    const bizId = crypto.randomUUID()
    await db.insert(schema.businesses).values({
      id: bizId,
      userId,
      name: 'Cleanup Test Biz',
      companyName: 'Cleanup Test Biz Ltd',
      cnpj: Date.now().toString(36).slice(-4) +
        Math.random().toString(36).slice(2, 12),
      category: 'Test',
      logoUrl: 'http://localhost/logo.png',
      isActive: true,
    })

    await cleanupDatabase()

    const bizRows = await db.select().from(schema.businesses)
    assertEquals(bizRows.length, 0)

    await cleanupDatabase()
  },
})

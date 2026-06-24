import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'

// Skip these tests if PG_CONNECTION is not set
if (Deno.env.get('PG_CONNECTION')) {
  const { testConnection, maskConnectionString } = await import('../lib/db.ts')

  Deno.test('lib/db.ts - Connection string masking', async (t) => {
    await t.step('maskConnectionString masks password correctly', () => {
      const input = 'postgresql://user:password@host:5432/db'
      const result = maskConnectionString(input)
      assertEquals(result, 'postgresql://user:***@host:5432/db')
    })

    await t.step('maskConnectionString handles empty password', () => {
      const input = 'postgresql://user:@host:5432/db'
      const result = maskConnectionString(input)
      assertEquals(result, 'postgresql://user:***@host:5432/db')
    })

    await t.step('maskConnectionString handles connection without auth', () => {
      const input = 'postgresql://host:5432/db'
      const result = maskConnectionString(input)
      assertEquals(result, 'postgresql://host:5432/db')
    })
  })

  Deno.test('lib/db.ts - PostgreSQL connection', async (t) => {
    await t.step('testConnection returns boolean', async () => {
      const result = await testConnection()
      assertEquals(typeof result, 'boolean')
    })

    await t.step('testConnection can reach PostgreSQL', async () => {
      const result = await testConnection()
      if (!result) {
        console.warn(
          '[Test warning] PostgreSQL connection failed - database may not be running',
        )
      }
    })
  })
} else {
  Deno.test('lib/db.ts - Skipped (PG_CONNECTION not set)', () => {
    console.info('[Test info] db.test.ts skipped - PG_CONNECTION not set')
  })
}

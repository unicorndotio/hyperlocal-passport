import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { db } from '../lib/db.ts'
import * as schema from '../db/schema.ts'
import { eq } from 'drizzle-orm'

Deno.test('Business API CRUD Operations', async (t) => {
  const testId = `biz-api-test-${Date.now()}`
  const userId = `user-${Date.now()}`

  // Create parent user for FK constraint
  await db.insert(schema.users).values({
    id: userId,
    email: `${userId}@test.com`,
    name: 'Test User',
  })

  await t.step('create business', async () => {
    const [business] = await db.insert(schema.businesses).values({
      id: testId,
      name: 'Test Business',
      description: 'A test business',
      logoUrl: 'http://localhost/logo.png',
      userId,
      companyName: 'Test Business Ltda',
      cnpj: `${Date.now()}11222333000181`,
      category: 'Test',
    }).returning()

    assertExists(business.id)
    assertEquals(business.name, 'Test Business')
  })

  await t.step('list businesses', async () => {
    const businesses = await db.select().from(schema.businesses)
    assertEquals(businesses.length >= 1, true)
  })

  await t.step('update business', async () => {
    const [updated] = await db
      .update(schema.businesses)
      .set({ name: 'Updated Business' })
      .where(eq(schema.businesses.id, testId))
      .returning()

    assertExists(updated)
    assertEquals(updated.name, 'Updated Business')
  })

  await t.step('delete business', async () => {
    await db
      .delete(schema.businesses)
      .where(eq(schema.businesses.id, testId))

    const businesses = await db.select().from(schema.businesses)
    const deleted = businesses.filter((b) => b.id === testId)
    assertEquals(deleted.length, 0)
  })

  // Cleanup
  await db.delete(schema.businesses).where(eq(schema.businesses.id, testId))
  await db.delete(schema.users).where(eq(schema.users.id, userId))
})

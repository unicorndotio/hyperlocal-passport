import {
  assertEquals,
  assertMatch,
  assertStringIncludes,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { eq, sql } from 'drizzle-orm'

// Unit test — no DB needed
Deno.test('seed - crypto.randomUUID() returns valid UUID v4', () => {
  const uuid = crypto.randomUUID()
  assertMatch(
    uuid,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    'UUID must be v4 format',
  )
})

// Integration tests — require PG_CONNECTION
if (Deno.env.get('PG_CONNECTION')) {
  const { db } = await import('../lib/db.ts')
  const schema = await import('../db/schema.ts')

  const runSeedAsSubprocess = async (): Promise<
    { success: boolean; stdout: string; stderr: string }
  > => {
    const cmd = new Deno.Command('deno', {
      args: ['run', '-A', 'seed.ts'],
      env: {
        PG_CONNECTION: Deno.env.get('PG_CONNECTION')!,
        BETTER_AUTH_SECRET: Deno.env.get('BETTER_AUTH_SECRET') ||
          'test-secret-key',
        BETTER_AUTH_URL: Deno.env.get('BETTER_AUTH_URL') ||
          'http://localhost:8000',
        APP_BASE_URL: Deno.env.get('APP_BASE_URL') || 'http://localhost:8000',
      },
    })
    const { code, stdout, stderr } = await cmd.output()
    const outText = new TextDecoder().decode(stdout)
    const errText = new TextDecoder().decode(stderr)
    return { success: code === 0, stdout: outText, stderr: errText }
  }

  Deno.test('seed - run seed.ts as subprocess + verify entity counts', async (t) => {
    await t.step('seed.ts runs successfully', async () => {
      const result = await runSeedAsSubprocess()
      assertStringIncludes(
        result.stdout,
        'Seed complete',
        `Seed should complete. Output: ${result.stdout}`,
      )
    })

    await t.step('entity counts match expectations', async () => {
      // seed.ts creates:
      //   2 businesses, 4 coupons, 5 merchant posts, 4 redemptions, 3 transactions
      // Users vary (signUpOrGetUser may create or find existing)
      // Coupon analytics: 4 (one per coupon)

      const bizCount = await db.select({ count: sql<number>`count(*)::int` })
        .from(schema.businesses)
      const couponCount = await db.select({ count: sql<number>`count(*)::int` })
        .from(schema.coupons)
      const postCount = await db.select({ count: sql<number>`count(*)::int` })
        .from(schema.merchantPosts)
      const redemptionCount = await db.select({
        count: sql<number>`count(*)::int`,
      }).from(schema.redemptions)
      const txCount = await db.select({ count: sql<number>`count(*)::int` })
        .from(schema.transactions)

      const c = (r: { count: number }[]) => r[0]?.count ?? 0

      assertEquals(c(bizCount), 2, 'Should have 2 businesses')
      assertEquals(c(couponCount), 4, 'Should have 4 coupons')
      assertEquals(c(postCount), 5, 'Should have 5 merchant posts')
      assertEquals(c(redemptionCount), 4, 'Should have 4 redemptions')
      assertEquals(c(txCount), 3, 'Should have 3 transactions')
    })
  })

  Deno.test('seed - FK relationships are valid after seed', async (t) => {
    await t.step('coupons reference valid businesses', async () => {
      const invalidCoupons = await db
        .select({ id: schema.coupons.id })
        .from(schema.coupons)
        .leftJoin(
          schema.businesses,
          eq(schema.coupons.businessId, schema.businesses.id),
        )
        .where(sql`${schema.businesses.id} IS NULL`)
      assertEquals(
        invalidCoupons.length,
        0,
        'All coupons must reference existing businesses',
      )
    })

    await t.step('redemptions reference valid coupons', async () => {
      const invalidRedemptions = await db
        .select({ id: schema.redemptions.id })
        .from(schema.redemptions)
        .leftJoin(
          schema.coupons,
          eq(schema.redemptions.couponId, schema.coupons.id),
        )
        .where(sql`${schema.coupons.id} IS NULL`)
      assertEquals(
        invalidRedemptions.length,
        0,
        'All redemptions must reference existing coupons',
      )
    })

    await t.step('transactions reference valid redemptions', async () => {
      const invalidTx = await db
        .select({ id: schema.transactions.id })
        .from(schema.transactions)
        .leftJoin(
          schema.redemptions,
          eq(schema.transactions.redemptionId, schema.redemptions.id),
        )
        .where(sql`${schema.redemptions.id} IS NULL`)
      assertEquals(
        invalidTx.length,
        0,
        'All transactions must reference existing redemptions',
      )
    })

    await t.step('redemptions reference valid users', async () => {
      const invalidRedemptions = await db
        .select({ id: schema.redemptions.id })
        .from(schema.redemptions)
        .leftJoin(schema.users, eq(schema.redemptions.userId, schema.users.id))
        .where(sql`${schema.users.id} IS NULL`)
      assertEquals(
        invalidRedemptions.length,
        0,
        'All redemptions must reference existing users',
      )
    })

    await t.step('merchant posts reference valid businesses', async () => {
      const invalidPosts = await db
        .select({ id: schema.merchantPosts.id })
        .from(schema.merchantPosts)
        .leftJoin(
          schema.businesses,
          eq(schema.merchantPosts.businessId, schema.businesses.id),
        )
        .where(sql`${schema.businesses.id} IS NULL`)
      assertEquals(
        invalidPosts.length,
        0,
        'All merchant posts must reference existing businesses',
      )
    })
  })

  Deno.test('seed - feed_events materialized view has rows after seed', async () => {
    await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY feed_events`)
    const result = await db.execute(
      sql`SELECT count(*)::int as count FROM feed_events`,
    )
    assertEquals(
      result.rows[0].count > 0,
      true,
      'feed_events should have rows after seed',
    )
  })

  Deno.test('seed - onConflictDoNothing prevents duplicate entities on re-seed', async (t) => {
    await t.step('second seed run succeeds', async () => {
      const result = await runSeedAsSubprocess()
      assertStringIncludes(
        result.stdout,
        'Seed complete',
        'Re-seed should complete',
      )
    })

    await t.step('entity counts are stable (no duplicates)', async () => {
      const bizCount = await db.select({ count: sql<number>`count(*)::int` })
        .from(schema.businesses)
      const couponCount = await db.select({ count: sql<number>`count(*)::int` })
        .from(schema.coupons)
      const postCount = await db.select({ count: sql<number>`count(*)::int` })
        .from(schema.merchantPosts)

      const c = (r: { count: number }[]) => r[0]?.count ?? 0

      assertEquals(c(bizCount), 2, 'Businesses should not duplicate on re-seed')
      assertEquals(c(couponCount), 4, 'Coupons should not duplicate on re-seed')
      assertEquals(
        c(postCount),
        5,
        'Merchant posts should not duplicate on re-seed',
      )
    })
  })
} else {
  Deno.test('seed - Skipped (PG_CONNECTION not set)', () => {
    console.info('[Test info] seed.test.ts skipped - PG_CONNECTION not set')
  })
}

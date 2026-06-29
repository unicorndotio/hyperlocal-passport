import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { sql } from 'drizzle-orm'

if (Deno.env.get('PG_CONNECTION')) {
  const { db } = await import('../lib/db.ts')
  const { refreshFeedView } = await import('../lib/feed.ts')

  Deno.test('lib/feed.ts - refreshFeedView helper', async (t) => {
    const truncate = async () => {
      await db.execute(
        sql`TRUNCATE TABLE merchant_posts, coupons, businesses, "user" RESTART IDENTITY CASCADE`,
      )
    }

    await t.step('refreshFeedView executes without error', async () => {
      await truncate()
      await refreshFeedView(db)
    })

    await t.step('calling refreshFeedView twice is idempotent', async () => {
      await truncate()
      await refreshFeedView(db)
      await refreshFeedView(db)
    })
  })

  Deno.test('lib/feed.ts - feed_events materialized view integration', async (t) => {
    const truncate = async () => {
      await db.execute(
        sql`TRUNCATE TABLE merchant_posts, coupons, businesses, "user" RESTART IDENTITY CASCADE`,
      )
    }

    await t.step('merchant_post appears in MV after refresh', async () => {
      await truncate()

      await db.execute(sql`
        INSERT INTO "user" (id, email, name) VALUES
          ('u-test-01-merchant', 'merchant01@test.com', 'Test Merchant 01')
      `)

      await db.execute(sql`
        INSERT INTO businesses (id, user_id, name, company_name, cnpj, category, logo_url, is_active) VALUES
          ('b-test-01', 'u-test-01-merchant', 'Test Business 01', 'Test Business Co 01', '00000000000001', 'test', '/logo.png', true)
      `)

      await db.execute(sql`
        INSERT INTO merchant_posts (id, business_id, title, body, is_visible) VALUES
          ('a0000000-0000-0000-0000-000000000001', 'b-test-01', 'Test Post', 'Test Body', true)
      `)

      await refreshFeedView(db)

      const result = await db.execute(sql`
        SELECT * FROM feed_events WHERE id = 'a0000000-0000-0000-0000-000000000001-merchant'
      `)

      assertEquals(result.rows.length, 1)
      assertEquals(result.rows[0].type, 'merchant_post')
      assertEquals(result.rows[0].title, 'Test Post')
      assertEquals(result.rows[0].description, 'Test Body')
      assertEquals(result.rows[0].business_name, 'Test Business 01')
    })

    await t.step(
      'coupon appears in MV with correct type discriminator',
      async () => {
        await truncate()

        await db.execute(sql`
        INSERT INTO "user" (id, email, name) VALUES
          ('u-test-02-coupon', 'coupon02@test.com', 'Coupon Merchant 02')
      `)

        await db.execute(sql`
        INSERT INTO businesses (id, user_id, name, company_name, cnpj, category, logo_url, is_active) VALUES
          ('b-test-02', 'u-test-02-coupon', 'Coupon Business 02', 'Coupon Business Co 02', '00000000000002', 'test', '/logo.png', true)
      `)

        await db.execute(sql`
        INSERT INTO coupons (id, business_id, title, description, behavior, restrictions, is_active) VALUES
          ('c-test-feed-02', 'b-test-02', 'Test Coupon 02', 'Test Description 02', '{}', '{}', true)
      `)

        await refreshFeedView(db)

        const result = await db.execute(sql`
        SELECT * FROM feed_events WHERE id = 'c-test-feed-02-coupon'
      `)

        assertEquals(result.rows.length, 1)
        assertEquals(result.rows[0].type, 'coupon_released')
        assertEquals(result.rows[0].title, 'Test Coupon 02')
        assertEquals(result.rows[0].description, 'Test Description 02')
        assertEquals(result.rows[0].business_name, 'Coupon Business 02')
      },
    )

    await t.step(
      'merchant_post with isVisible=false is excluded from MV',
      async () => {
        await truncate()

        await db.execute(sql`
        INSERT INTO "user" (id, email, name) VALUES
          ('u-test-03-hidden', 'hidden03@test.com', 'Hidden Merchant 03')
      `)

        await db.execute(sql`
        INSERT INTO businesses (id, user_id, name, company_name, cnpj, category, logo_url, is_active) VALUES
          ('b-test-03', 'u-test-03-hidden', 'Hidden Business 03', 'Hidden Business Co 03', '00000000000003', 'test', '/logo.png', true)
      `)

        await db.execute(sql`
        INSERT INTO merchant_posts (id, business_id, title, body, is_visible) VALUES
          ('a0000000-0000-0000-0000-000000000003', 'b-test-03', 'Hidden Post', 'Hidden Body', false)
      `)

        await refreshFeedView(db)

        const result = await db.execute(sql`
        SELECT * FROM feed_events WHERE id = 'a0000000-0000-0000-0000-000000000003-merchant'
      `)

        assertEquals(result.rows.length, 0)
      },
    )

    await t.step('coupon with isActive=false is excluded from MV', async () => {
      await truncate()

      await db.execute(sql`
        INSERT INTO "user" (id, email, name) VALUES
          ('u-test-04-inactive', 'inactive04@test.com', 'Inactive Merchant 04')
      `)

      await db.execute(sql`
        INSERT INTO businesses (id, user_id, name, company_name, cnpj, category, logo_url, is_active) VALUES
          ('b-test-04', 'u-test-04-inactive', 'Inactive Business 04', 'Inactive Business Co 04', '00000000000004', 'test', '/logo.png', true)
      `)

      await db.execute(sql`
        INSERT INTO coupons (id, business_id, title, description, behavior, restrictions, is_active) VALUES
          ('c-test-inactive-04', 'b-test-04', 'Inactive Coupon 04', 'Inactive Description 04', '{}', '{}', false)
      `)

      await refreshFeedView(db)

      const result = await db.execute(sql`
        SELECT * FROM feed_events WHERE id = 'c-test-inactive-04-coupon'
      `)

      assertEquals(result.rows.length, 0)
    })

    await t.step(
      'MV returns rows from both sources with correct discriminators',
      async () => {
        await truncate()

        await db.execute(sql`
        INSERT INTO "user" (id, email, name) VALUES
          ('u-test-05-both', 'both05@test.com', 'Both Merchant 05')
      `)

        await db.execute(sql`
        INSERT INTO businesses (id, user_id, name, company_name, cnpj, category, logo_url, is_active) VALUES
          ('b-test-05', 'u-test-05-both', 'Both Business 05', 'Both Business Co 05', '00000000000005', 'test', '/logo.png', true)
      `)

        await db.execute(sql`
        INSERT INTO merchant_posts (id, business_id, title, body, is_visible) VALUES
          ('a0000000-0000-0000-0000-000000000005', 'b-test-05', 'Both Post 05', 'Both Body 05', true)
      `)

        await db.execute(sql`
        INSERT INTO coupons (id, business_id, title, description, behavior, restrictions, is_active) VALUES
          ('c-test-both-05', 'b-test-05', 'Both Coupon 05', 'Both Description 05', '{}', '{}', true)
      `)

        await refreshFeedView(db)

        const result = await db.execute(
          sql`SELECT * FROM feed_events ORDER BY created_at DESC`,
        )

        assertEquals(result.rows.length, 2)

        const types = result.rows.map((r: Record<string, unknown>) => r.type)
          .sort()
        assertEquals(types, ['coupon_released', 'merchant_post'])
      },
    )
  })
} else {
  Deno.test('lib/feed.ts feed tests - Skipped (PG_CONNECTION not set)', () => {
    console.info('[Test info] feed.test.ts skipped - PG_CONNECTION not set')
  })
}

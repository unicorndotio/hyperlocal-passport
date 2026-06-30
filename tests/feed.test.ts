import {
  assertEquals,
  assertExists,
  assertNotEquals,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { sql } from 'drizzle-orm'

if (Deno.env.get('PG_CONNECTION')) {
  const { db } = await import('../lib/db.ts')
  const { refreshFeedView, queryFeed } = await import('../lib/feed.ts')

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
  Deno.test('lib/feed.ts - queryFeed unit tests', async (t) => {
    const truncate = async () => {
      await db.execute(
        sql`TRUNCATE TABLE merchant_posts, coupons, transactions, businesses, "user" RESTART IDENTITY CASCADE`,
      )
    }

    const seedBusinessAndUser = async (
      userId: string,
      bizId: string,
      bizName: string,
    ) => {
      await db.execute(sql`
        INSERT INTO "user" (id, email, name) VALUES (${userId}, ${
        userId + '@test.com'
      }, ${'User ' + userId})
      `)
      await db.execute(sql`
        INSERT INTO businesses (id, user_id, name, company_name, cnpj, category, logo_url, is_active) VALUES
        (${bizId}, ${userId}, ${bizName}, ${bizName + ' Co'}, ${
        'CNPJ' + bizId
      }, 'test', '/logo.png', true)
      `)
    }

    await t.step(
      'queryFeed with empty MV returns empty events and null cursor',
      async () => {
        await truncate()
        await refreshFeedView(db)
        const result = await queryFeed(db, null)
        assertEquals(result.events.length, 0)
        assertEquals(result.cursor, null)
      },
    )

    await t.step(
      'queryFeed with 25 seeded events returns page 1 with 20 items and non-null cursor',
      async () => {
        await truncate()
        await seedBusinessAndUser('u-feed-p1', 'b-feed-p1', 'Feed P1 Biz')

        for (let i = 0; i < 25; i++) {
          const id = `a0000000-0000-0000-0000-${String(i).padStart(12, '0')}`
          const createdAt = new Date(Date.now() - i * 60000).toISOString()
          await db.execute(sql`
          INSERT INTO merchant_posts (id, business_id, title, body, is_visible, created_at) VALUES
          (${id}::uuid, 'b-feed-p1', ${'Post ' + i}, ${
            'Body ' + i
          }, true, ${createdAt}::timestamptz)
        `)
        }

        await refreshFeedView(db)
        const result = await queryFeed(db, null, undefined, 20)

        assertEquals(result.events.length, 20)
        assertNotEquals(result.cursor, null)
        // Events should be ordered by createdAt DESC
        for (let i = 1; i < result.events.length; i++) {
          if (!(result.events[i].createdAt <= result.events[i - 1].createdAt)) {
            throw new Error(
              `Events not ordered by createdAt DESC at index ${i}`,
            )
          }
        }
      },
    )

    await t.step(
      'queryFeed with cursor returns page 2 with remaining items',
      async () => {
        await truncate()
        await seedBusinessAndUser('u-feed-p2', 'b-feed-p2', 'Feed P2 Biz')

        for (let i = 0; i < 25; i++) {
          const id = `a0000000-0000-0000-0000-${String(i).padStart(12, '0')}`
          const createdAt = new Date(Date.now() - i * 60000).toISOString()
          await db.execute(sql`
          INSERT INTO merchant_posts (id, business_id, title, body, is_visible, created_at) VALUES
          (${id}::uuid, 'b-feed-p2', ${'Post ' + i}, ${
            'Body ' + i
          }, true, ${createdAt}::timestamptz)
        `)
        }

        await refreshFeedView(db)
        const page1 = await queryFeed(db, null, undefined, 20)
        assertEquals(page1.events.length, 20)

        const page2 = await queryFeed(db, null, page1.cursor!, 20)
        assertEquals(page2.events.length, 5)
        assertEquals(page2.cursor, null)

        // No overlap between pages
        const page1Ids = new Set(page1.events.map((e: { id: string }) => e.id))
        for (const event of page2.events) {
          if (page1Ids.has(event.id)) {
            throw new Error('Page 2 contains duplicate event from page 1')
          }
        }
      },
    )

    await t.step(
      'queryFeed with invalid cursor returns page 1 (same as no cursor)',
      async () => {
        await truncate()
        await seedBusinessAndUser('u-feed-inv', 'b-feed-inv', 'Feed Inv Biz')

        await db.execute(sql`
        INSERT INTO merchant_posts (id, business_id, title, body, is_visible) VALUES
        ('a0000000-0000-0000-0000-000000000099'::uuid, 'b-feed-inv', 'Test Post', 'Test Body', true)
      `)
        await refreshFeedView(db)

        const resultNoCursor = await queryFeed(db, null, undefined, 20)
        const resultInvalidCursor = await queryFeed(
          db,
          null,
          'invalid-cursor',
          20,
        )
        const resultNegativeCursor = await queryFeed(db, null, '-1', 20)

        assertEquals(
          resultNoCursor.events.length,
          resultInvalidCursor.events.length,
        )
        assertEquals(
          resultNoCursor.events.length,
          resultNegativeCursor.events.length,
        )
        assertEquals(
          resultNoCursor.events[0].id,
          resultInvalidCursor.events[0].id,
        )
      },
    )

    await t.step(
      'queryFeed with userId merges savings_notice events in correct position',
      async () => {
        await truncate()

        // Seed user and business
        await db.execute(sql`
        INSERT INTO "user" (id, email, name) VALUES ('u-feed-savings', 'savings@test.com', 'Savings User')
      `)
        await db.execute(sql`
        INSERT INTO businesses (id, user_id, name, company_name, cnpj, category, logo_url, is_active) VALUES
        ('b-feed-savings', 'u-feed-savings', 'Savings Biz', 'Savings Biz Co', 'CNPJ-savings', 'test', '/logo.png', true)
      `)

        // Seed a merchant post
        await db.execute(sql`
        INSERT INTO merchant_posts (id, business_id, title, body, is_visible, created_at) VALUES
        ('a0000000-0000-0000-0000-000000000101'::uuid, 'b-feed-savings', 'Merchant Post', 'Merchant Body', true, now() - interval '10 minutes')
      `)
        await refreshFeedView(db)

        // Seed a coupon + redemption + transaction for savings notice
        const couponId = 'c-feed-savings'
        await db.execute(sql`
        INSERT INTO coupons (id, business_id, title, description, behavior, restrictions, is_active) VALUES
        (${couponId}, 'b-feed-savings', 'Savings Coupon', 'Savings Desc', '{}', '{}', true)
      `)

        const redemptionId = 'r-feed-savings'
        await db.execute(sql`
        INSERT INTO redemptions (id, coupon_id, business_id, user_id, status) VALUES
        (${redemptionId}, ${couponId}, 'b-feed-savings', 'u-feed-savings', 'used')
      `)

        await db.execute(sql`
        INSERT INTO transactions (id, redemption_id, coupon_id, business_id, user_id, total_amount_cents, discount_applied_cents, final_amount_cents, "timestamp") VALUES
        ('tx-feed-savings', ${redemptionId}, ${couponId}, 'b-feed-savings', 'u-feed-savings', 1000, 200, 800, now())
      `)

        // Query with userId should include savings_notice
        const result = await queryFeed(db, 'u-feed-savings', undefined, 20)
        const hasSavings = result.events.some((e: { type: string }) =>
          e.type === 'savings_notice'
        )
        assertEquals(hasSavings, true)

        const savingsEvent = result.events.find((e: { type: string }) =>
          e.type === 'savings_notice'
        )
        assertExists(savingsEvent)
        assertEquals(savingsEvent.amountCents, 200)
        assertEquals(savingsEvent.businessName, 'Savings Biz')

        // Events should be ordered by createdAt DESC
        for (let i = 1; i < result.events.length; i++) {
          if (!(result.events[i].createdAt <= result.events[i - 1].createdAt)) {
            throw new Error(
              `Events not ordered by createdAt DESC at index ${i}`,
            )
          }
        }
      },
    )

    await t.step(
      'queryFeed with userId=null does not include savings_notice events',
      async () => {
        await truncate()

        await db.execute(sql`
        INSERT INTO "user" (id, email, name) VALUES ('u-feed-no-sess', 'nosess@test.com', 'No Session')
      `)
        await db.execute(sql`
        INSERT INTO businesses (id, user_id, name, company_name, cnpj, category, logo_url, is_active) VALUES
        ('b-feed-no-sess', 'u-feed-no-sess', 'NoSess Biz', 'NoSess Biz Co', 'CNPJ-nosess', 'test', '/logo.png', true)
      `)

        await db.execute(sql`
        INSERT INTO merchant_posts (id, business_id, title, body, is_visible) VALUES
        ('a0000000-0000-0000-0000-000000000102'::uuid, 'b-feed-no-sess', 'Public Post', 'Public Body', true)
      `)
        await refreshFeedView(db)

        const couponId = 'c-feed-no-sess'
        await db.execute(sql`
        INSERT INTO coupons (id, business_id, title, description, behavior, restrictions, is_active) VALUES
        (${couponId}, 'b-feed-no-sess', 'Coupon', 'Desc', '{}', '{}', true)
      `)
        await db.execute(sql`
        INSERT INTO redemptions (id, coupon_id, business_id, user_id, status) VALUES
        ('r-feed-no-sess', ${couponId}, 'b-feed-no-sess', 'u-feed-no-sess', 'used')
      `)
        await db.execute(sql`
        INSERT INTO transactions (id, redemption_id, coupon_id, business_id, user_id, total_amount_cents, discount_applied_cents, final_amount_cents, "timestamp") VALUES
        ('tx-feed-no-sess', 'r-feed-no-sess', ${couponId}, 'b-feed-no-sess', 'u-feed-no-sess', 1000, 200, 800, now())
      `)

        const result = await queryFeed(db, null, undefined, 20)
        const hasSavings = result.events.some((e: { type: string }) =>
          e.type === 'savings_notice'
        )
        assertEquals(hasSavings, false)
      },
    )
  })

  Deno.test('GET /api/feed - integration tests', async (t) => {
    const truncate = async () => {
      await db.execute(
        sql`TRUNCATE TABLE merchant_posts, coupons, transactions, redemptions, businesses, "user" RESTART IDENTITY CASCADE`,
      )
    }

    const seedData = async () => {
      await db.execute(sql`
        INSERT INTO "user" (id, email, name) VALUES ('u-feed-api', 'feedapi@test.com', 'Feed API User')
      `)
      await db.execute(sql`
        INSERT INTO businesses (id, user_id, name, company_name, cnpj, category, logo_url, is_active) VALUES
        ('b-feed-api', 'u-feed-api', 'Feed API Biz', 'Feed API Biz Co', 'CNPJ-feed-api', 'test', '/logo.png', true)
      `)
      await db.execute(sql`
        INSERT INTO merchant_posts (id, business_id, title, body, is_visible, created_at) VALUES
        ('a0000000-0000-0000-0000-000000000201'::uuid, 'b-feed-api', 'API Post 1', 'Body 1', true, now() - interval '5 minutes')
      `)
      await db.execute(sql`
        INSERT INTO merchant_posts (id, business_id, title, body, is_visible, created_at) VALUES
        ('a0000000-0000-0000-0000-000000000202'::uuid, 'b-feed-api', 'API Post 2', 'Body 2', true, now() - interval '3 minutes')
      `)
      await refreshFeedView(db)
    }

    await t.step(
      'GET /api/feed returns 200 with event types and correct ordering',
      async () => {
        await truncate()
        await seedData()

        const { handler } = await import('../routes/api/feed.ts')
        const req = new Request('http://localhost/api/feed')
        const ctx = { req, state: { user: null, session: null } }
        const response = await handler.GET(
          ctx as Parameters<typeof handler.GET>[0],
        )
        assertEquals(response.status, 200)

        const body = await response.json()
        assertEquals(Array.isArray(body.events), true)
        assertEquals(body.events.length, 2)
        assertEquals(typeof body.cursor, 'string')

        // Check correct ordering (newest first)
        for (let i = 1; i < body.events.length; i++) {
          if (!(body.events[i].createdAt <= body.events[i - 1].createdAt)) {
            throw new Error('Events not ordered by createdAt DESC')
          }
        }

        // Check expected fields
        const event = body.events[0]
        assertEquals(typeof event.id, 'string')
        assertEquals(typeof event.type, 'string')
        assertEquals(typeof event.title, 'string')
        assertEquals(typeof event.createdAt, 'number')
      },
    )

    await t.step(
      'GET /api/feed?limit=abc returns 200 with default page size (NaN guard)',
      async () => {
        await truncate()
        await seedData()

        const { handler } = await import('../routes/api/feed.ts')
        const req = new Request('http://localhost/api/feed?limit=abc')
        const ctx = { req, state: { user: null, session: null } }
        const response = await handler.GET(
          ctx as Parameters<typeof handler.GET>[0],
        )
        assertEquals(response.status, 200)

        const body = await response.json()
        assertEquals(Array.isArray(body.events), true)
        assertEquals(body.events.length, 2)
      },
    )

    await t.step('GET /api/feed?limit=5 returns exactly 5 events', async () => {
      await truncate()
      await seedData()

      // Seed 10 posts
      for (let i = 0; i < 8; i++) {
        const id = `a0000000-0000-0000-0000-${
          String(300 + i).padStart(12, '0')
        }`
        await db.execute(sql`
          INSERT INTO merchant_posts (id, business_id, title, body, is_visible, created_at) VALUES
          (${id}::uuid, 'b-feed-api', ${'Extra Post ' + i}, ${
          'Body ' + i
        }, true, now() - interval '1 minute')
        `)
      }
      await refreshFeedView(db)

      const { handler } = await import('../routes/api/feed.ts')
      const req = new Request('http://localhost/api/feed?limit=5')
      const ctx = { req, state: { user: null, session: null } }
      const response = await handler.GET(
        ctx as Parameters<typeof handler.GET>[0],
      )
      assertEquals(response.status, 200)

      const body = await response.json()
      assertEquals(body.events.length, 5)
    })

    await t.step(
      'GET /api/feed with no session returns 200 with global events only',
      async () => {
        await truncate()
        await seedData()

        const { handler } = await import('../routes/api/feed.ts')
        const req = new Request('http://localhost/api/feed')
        const ctx = { req, state: { user: null, session: null } }
        const response = await handler.GET(
          ctx as Parameters<typeof handler.GET>[0],
        )
        assertEquals(response.status, 200)

        const body = await response.json()
        for (const event of body.events) {
          if (event.type === 'savings_notice') {
            throw new Error(
              'Unauthenticated feed should not include savings_notice events',
            )
          }
        }
      },
    )
  })
} else {
  Deno.test('lib/feed.ts feed tests - Skipped (PG_CONNECTION not set)', () => {
    console.info('[Test info] feed.test.ts skipped - PG_CONNECTION not set')
  })
  Deno.test('GET /api/feed integration tests - Skipped (PG_CONNECTION not set)', () => {
    console.info('[Test info] feed API tests skipped - PG_CONNECTION not set')
  })
}

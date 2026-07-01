import {
  assertEquals,
  assertExists,
  assertMatch,
  assertRejects,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'

// Unit tests — no database required
Deno.test('FK hardening - all .references() calls include explicit onDelete', () => {
  const schemaContent = Deno.readTextFileSync('./db/schema.ts')

  // Find all .references() calls using regex
  const refRegex = /\.references\(\(\) => \w+\.\w+\)/g
  const refsWithoutOnDelete = schemaContent.match(refRegex)

  // Every .references() should have an onDelete parameter
  assertEquals(
    refsWithoutOnDelete,
    null,
    'All .references() calls must include onDelete parameter. Found calls without: ' +
      (refsWithoutOnDelete?.join(', ') ?? 'none'),
  )
})

Deno.test('FK hardening - has onDelete cascade pattern', () => {
  const schemaContent = Deno.readTextFileSync('./db/schema.ts')

  // Verify onDelete patterns exist
  const cascadePattern = /onDelete: 'cascade'/g
  const restrictPattern = /onDelete: 'restrict'/g
  const cascadeCount = schemaContent.match(cascadePattern)?.length ?? 0
  const restrictCount = schemaContent.match(restrictPattern)?.length ?? 0

  assertEquals(
    cascadeCount,
    10,
    `Expected 10 cascade FKs, found ${cascadeCount}`,
  )
  assertEquals(
    restrictCount,
    5,
    `Expected 5 restrict FKs, found ${restrictCount}`,
  )
})

Deno.test('FK hardening - file_metadata.user_id FK exists', () => {
  const schemaContent = Deno.readTextFileSync('./db/schema.ts')

  // file_metadata.user_id should have a references() call
  const fileMetaPattern = /userId: text\('user_id'\)\.references\(/
  assertMatch(
    schemaContent,
    fileMetaPattern,
    'file_metadata.user_id must have .references() FK',
  )
})

Deno.test('FK hardening - ownership chain FKs use cascade', () => {
  const schemaContent = Deno.readTextFileSync('./db/schema.ts')
  const cascadeMatches = schemaContent.match(/onDelete: 'cascade'/g)
  assertExists(cascadeMatches, 'Should find cascade declarations')
  assertEquals(
    cascadeMatches.length >= 10,
    true,
    'Should have at least 10 cascade FKs',
  )
})

Deno.test('FK hardening - audit record FKs use restrict', () => {
  const schemaContent = Deno.readTextFileSync('./db/schema.ts')
  const restrictMatches = schemaContent.match(/onDelete: 'restrict'/g)
  assertExists(restrictMatches, 'Should find restrict declarations')
  assertEquals(
    restrictMatches.length,
    5,
    'Should have exactly 5 restrict FK declarations (5 FK columns)',
  )
})

// Integration tests — require PG_CONNECTION
if (Deno.env.get('PG_CONNECTION')) {
  const { db } = await import('../lib/db.ts')
  const schema = await import('../db/schema.ts')
  const { eq } = await import('drizzle-orm')

  const cleanupAll = async () => {
    await db.delete(schema.couponAnalytics)
    await db.delete(schema.transactions)
    await db.delete(schema.redemptions)
    await db.delete(schema.merchantPosts)
    await db.delete(schema.coupons)
    await db.delete(schema.businesses)
    await db.delete(schema.fileMetadata)
    await db.delete(schema.users)
  }

  const createTestData = async () => {
    const userId = 'fk_cascade_user_' + crypto.randomUUID()
    const userId2 = 'fk_cascade_user2_' + crypto.randomUUID()
    await db.insert(schema.users).values([
      { id: userId, email: 'fk_cascade_owner@test.com', name: 'Cascade Owner' },
      {
        id: userId2,
        email: 'fk_cascade_other@test.com',
        name: 'Cascade Other',
      },
    ])

    const bizId = crypto.randomUUID()
    await db.insert(schema.businesses).values({
      id: bizId,
      userId,
      name: 'Cascade Test Business',
      companyName: 'Cascade Test Ltda',
      cnpj: 'fk_csc_' + crypto.randomUUID().slice(0, 16),
      category: 'Test',
      logoUrl: 'http://localhost/logo.png',
    })

    const couponId = crypto.randomUUID()
    await db.insert(schema.coupons).values({
      id: couponId,
      businessId: bizId,
      title: 'Cascade Test Coupon',
      behavior: { type: 'percentage_discount', percent: 10 },
      restrictions: {},
    })

    await db.insert(schema.couponAnalytics).values({
      id: crypto.randomUUID(),
      couponId,
      views: 1,
    })

    await db.insert(schema.merchantPosts).values({
      id: crypto.randomUUID(),
      businessId: bizId,
      title: 'Cascade Test Post',
    })

    await db.insert(schema.fileMetadata).values({
      id: crypto.randomUUID(),
      filename: 'fk_csc_' + crypto.randomUUID(),
      userId,
    })

    return { userId, userId2, bizId, couponId }
  }

  Deno.test({
    name:
      'FK hardening - cascade: delete user deletes owned businesses, file_metadata',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
      await cleanupAll()
      const { userId, bizId } = await createTestData()

      await db.delete(schema.users).where(eq(schema.users.id, userId))

      const remainingBiz = await db.select({ id: schema.businesses.id })
        .from(schema.businesses)
        .where(eq(schema.businesses.id, bizId))
      assertEquals(
        remainingBiz.length,
        0,
        'Business should be cascade-deleted when owner user is deleted',
      )

      const remainingFm = await db.select({ id: schema.fileMetadata.id })
        .from(schema.fileMetadata)
        .where(eq(schema.fileMetadata.userId, userId))
      assertEquals(
        remainingFm.length,
        0,
        'file_metadata should be cascade-deleted when user is deleted',
      )
    },
  })

  Deno.test({
    name:
      'FK hardening - cascade: delete business deletes owned coupons, posts, analytics',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
      await cleanupAll()
      const { userId, bizId, couponId } = await createTestData()

      await db.delete(schema.businesses).where(eq(schema.businesses.id, bizId))

      const remainingCoupons = await db.select({ id: schema.coupons.id })
        .from(schema.coupons)
        .where(eq(schema.coupons.id, couponId))
      assertEquals(
        remainingCoupons.length,
        0,
        'Coupons should be cascade-deleted when business is deleted',
      )

      const remainingPosts = await db.select({ id: schema.merchantPosts.id })
        .from(schema.merchantPosts)
        .where(eq(schema.merchantPosts.businessId, bizId))
      assertEquals(
        remainingPosts.length,
        0,
        'Merchant posts should be cascade-deleted when business is deleted',
      )

      // Clean up remaining data
      await db.delete(schema.users).where(eq(schema.users.id, userId))
    },
  })

  Deno.test({
    name:
      'FK hardening - cascade: delete coupon deletes owned redemptions and analytics',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
      await cleanupAll()
      const { userId, bizId, couponId } = await createTestData()

      // Create redemption for this coupon
      const redemptionId = crypto.randomUUID()
      await db.insert(schema.redemptions).values({
        id: redemptionId,
        couponId,
        businessId: bizId,
        userId,
        status: 'used',
      })

      await db.delete(schema.coupons).where(eq(schema.coupons.id, couponId))

      const remainingRedemptions = await db.select({
        id: schema.redemptions.id,
      })
        .from(schema.redemptions)
        .where(eq(schema.redemptions.id, redemptionId))
      assertEquals(
        remainingRedemptions.length,
        0,
        'Redemptions should be cascade-deleted when coupon is deleted',
      )

      const remainingAnalytics = await db.select({
        id: schema.couponAnalytics.id,
      })
        .from(schema.couponAnalytics)
        .where(eq(schema.couponAnalytics.couponId, couponId))
      assertEquals(
        remainingAnalytics.length,
        0,
        'Coupon analytics should be cascade-deleted when coupon is deleted',
      )

      await db.delete(schema.businesses).where(eq(schema.businesses.id, bizId))
      await db.delete(schema.users).where(eq(schema.users.id, userId))
    },
  })

  Deno.test({
    name: 'FK hardening - restrict: cannot delete user with transactions',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
      await cleanupAll()
      const { userId, bizId, couponId } = await createTestData()

      const redemptionId = crypto.randomUUID()
      await db.insert(schema.redemptions).values({
        id: redemptionId,
        couponId,
        businessId: bizId,
        userId,
        status: 'used',
      })

      await db.insert(schema.transactions).values({
        id: crypto.randomUUID(),
        redemptionId,
        couponId,
        businessId: bizId,
        userId,
        totalAmountCents: 1000,
        discountAppliedCents: 100,
        finalAmountCents: 900,
      })

      await assertRejects(
        async () => {
          await db.delete(schema.users).where(eq(schema.users.id, userId))
        },
        Error,
        'Should reject deleting a user with transactions due to restrict FK',
      )

      // Clean up
      await db.delete(schema.transactions)
      await db.delete(schema.redemptions)
      await db.delete(schema.coupons).where(eq(schema.coupons.id, couponId))
      await db.delete(schema.businesses).where(eq(schema.businesses.id, bizId))
      await db.delete(schema.users).where(eq(schema.users.id, userId))
    },
  })

  Deno.test({
    name: 'FK hardening - restrict: cannot delete business with transactions',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
      await cleanupAll()
      const { userId, bizId, couponId } = await createTestData()

      const redemptionId = crypto.randomUUID()
      await db.insert(schema.redemptions).values({
        id: redemptionId,
        couponId,
        businessId: bizId,
        userId,
        status: 'used',
      })

      await db.insert(schema.transactions).values({
        id: crypto.randomUUID(),
        redemptionId,
        couponId,
        businessId: bizId,
        userId,
        totalAmountCents: 1000,
        discountAppliedCents: 100,
        finalAmountCents: 900,
      })

      await assertRejects(
        async () => {
          await db.delete(schema.businesses).where(
            eq(schema.businesses.id, bizId),
          )
        },
        Error,
        'Should reject deleting a business with transactions due to restrict FK',
      )

      // Clean up
      await db.delete(schema.transactions)
      await db.delete(schema.redemptions)
      await db.delete(schema.coupons).where(eq(schema.coupons.id, couponId))
      await db.delete(schema.businesses).where(eq(schema.businesses.id, bizId))
      await db.delete(schema.users).where(eq(schema.users.id, userId))
    },
  })

  Deno.test({
    name: 'FK hardening - restrict: cannot delete user with signals',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
      await cleanupAll()
      const { userId, bizId } = await createTestData()

      await db.insert(schema.signals).values({
        id: crypto.randomUUID(),
        userId,
        category: 'test_restrict',
        description: 'Testing restrict FK',
      })

      await assertRejects(
        async () => {
          await db.delete(schema.users).where(eq(schema.users.id, userId))
        },
        Error,
        'Should reject deleting a user with signals due to restrict FK',
      )

      // Clean up
      await db.delete(schema.signals)
      await db.delete(schema.businesses).where(eq(schema.businesses.id, bizId))
      await db.delete(schema.users).where(eq(schema.users.id, userId))
    },
  })
} else {
  Deno.test(
    'FK hardening - Integration tests skipped (PG_CONNECTION not set)',
    () => {
      console.info(
        '[Test info] fk_hardening integration tests skipped - PG_CONNECTION not set',
      )
    },
  )
}

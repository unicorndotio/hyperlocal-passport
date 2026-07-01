import {
  assertEquals,
  assertExists,
  assertMatch,
  assertStringIncludes,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'

// Unit tests — no database required
Deno.test('PK type compatibility - uuid import is available in schema', () => {
  // The schema.ts file imports uuid from drizzle-orm/pg-core
  // Compile-time check: importing schema should not error
  // We verify the import exists by checking the exported tables
  const schemaContent = Deno.readTextFileSync('./db/schema.ts')
  assertStringIncludes(
    schemaContent,
    'uuid',
    'schema.ts must import uuid from drizzle-orm/pg-core',
  )
})

Deno.test('PK type compatibility - app-owned tables use uuid PK', () => {
  const schemaContent = Deno.readTextFileSync('./db/schema.ts')

  const appTables = [
    'businesses',
    'coupons',
    'redemptions',
    'transactions',
    'signals',
    'coupon_analytics',
    'merchant_posts',
    'file_metadata',
  ]

  for (const table of appTables) {
    // Each app table should have uuid('id').primaryKey().defaultRandom()
    const uuidPattern = new RegExp(
      `${table}[\\s\\S]*?id: uuid\\('id'\\).*\\.defaultRandom\\(\\)`,
    )
    assertMatch(
      schemaContent,
      uuidPattern,
      `Table '${table}' should use uuid('id').defaultRandom()`,
    )
  }
})

Deno.test('PK type compatibility - Better Auth tables use text PK', () => {
  const schemaContent = Deno.readTextFileSync('./db/schema.ts')

  const authTables = ['user', 'session', 'account', 'verification']

  for (const table of authTables) {
    // Better Auth tables should keep text('id').primaryKey()
    const textPattern = new RegExp(
      `export const ${
        table === 'user' ? 'users' : table
      }[\\s\\S]*?id: text\\('id'\\).*primaryKey`,
    )
    assertMatch(
      schemaContent,
      textPattern,
      `Better Auth table '${table}' should keep text('id').primaryKey()`,
    )
  }
})

Deno.test('PK type compatibility - merchant_posts does not use $defaultFn', () => {
  const schemaContent = Deno.readTextFileSync('./db/schema.ts')

  // Find the merchant_posts section and ensure $defaultFn is NOT present
  const merchantPostsSection = schemaContent.match(
    /export const merchantPosts[\s\S]*?^}/m,
  )
  assertExists(merchantPostsSection, 'merchant_posts table definition found')
  assertStringIncludes(
    merchantPostsSection[0],
    "uuid('id')",
    'merchant_posts.id should use uuid()',
  )
  // $defaultFn should not appear in the merchant_posts section
  assertEquals(
    merchantPostsSection[0].includes('$defaultFn'),
    false,
    'merchant_posts.id should not use $defaultFn',
  )
})

Deno.test('PK type compatibility - crypto.randomUUID generates uuid v4 format', () => {
  const uuid = crypto.randomUUID()
  const uuidV4Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
  assertMatch(
    uuid,
    uuidV4Regex,
    'crypto.randomUUID() should produce valid UUID v4',
  )
})

Deno.test('PK type compatibility - schema exports drizzle table objects', async () => {
  const schema = await import('../db/schema.ts')

  const appTables = [
    'businesses',
    'coupons',
    'redemptions',
    'transactions',
    'signals',
    'couponAnalytics',
    'merchantPosts',
    'fileMetadata',
  ]

  for (const tableName of appTables) {
    const table = schema[tableName as keyof typeof schema]
    assertExists(table, `Table '${tableName}' should be exported from schema`)
    assertEquals(
      typeof table,
      'object',
      `Table '${tableName}' should be an object`,
    )
  }

  // Verify Better Auth tables are also exported
  const authTables = ['users', 'session', 'account', 'verification']
  for (const tableName of authTables) {
    const table = schema[tableName as keyof typeof schema]
    assertExists(
      table,
      `Better Auth table '${tableName}' should be exported from schema`,
    )
  }
})

Deno.test('PK type compatibility - FK columns referencing app uuids are uuid typed', () => {
  const schemaContent = Deno.readTextFileSync('./db/schema.ts')

  // Each app-to-app FK must use uuid() not text()
  const uuidFkDeclarations = [
    'businessId: uuid(',
    'couponId: uuid(',
    'redemptionId: uuid(',
  ]
  for (const decl of uuidFkDeclarations) {
    assertStringIncludes(
      schemaContent,
      decl,
      `FK declaration should use uuid(): ${decl}`,
    )
  }

  // FK columns referencing users.id (text PK) must use text()
  const textFkDeclarations = [
    'userId: text(',
  ]
  for (const decl of textFkDeclarations) {
    assertStringIncludes(
      schemaContent,
      decl,
      `FK to users.id (text PK) should use text(): ${decl}`,
    )
  }
})

// Integration tests — require PG_CONNECTION
if (Deno.env.get('PG_CONNECTION')) {
  const { db } = await import('../lib/db.ts')
  const dbSchema = await import('../db/schema.ts')
  const { eq } = await import('drizzle-orm')

  const cleanupAll = async () => {
    await db.delete(dbSchema.couponAnalytics)
    await db.delete(dbSchema.transactions)
    await db.delete(dbSchema.redemptions)
    await db.delete(dbSchema.merchantPosts)
    await db.delete(dbSchema.coupons)
    await db.delete(dbSchema.businesses)
    await db.delete(dbSchema.users)
  }

  Deno.test({
    name:
      'PK type compatibility - insert without id uses defaultRandom on all app tables',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
      await cleanupAll()

      const userId = 'user_default_' + crypto.randomUUID()
      const userId2 = 'user_default2_' + crypto.randomUUID()
      await db.insert(dbSchema.users).values([
        { id: userId, email: 'default1@test.com', name: 'Default Test 1' },
        { id: userId2, email: 'default2@test.com', name: 'Default Test 2' },
      ])

      const [biz] = await db.insert(dbSchema.businesses).values({
        userId,
        name: 'Default PK Business',
        companyName: 'Default PK Business Ltda',
        cnpj: 'default_pk_' + crypto.randomUUID().slice(0, 16),
        category: 'Test',
        logoUrl: 'http://localhost/logo.png',
      }).returning({ id: dbSchema.businesses.id })

      assertExists(biz, 'Business should have been created')
      assertExists(biz.id, 'Business should have an auto-generated UUID')
      assertMatch(biz.id, /^[0-9a-f-]+$/, 'Auto-generated id should be a UUID')

      const [coup] = await db.insert(dbSchema.coupons).values({
        businessId: biz.id,
        title: 'Default PK Coupon',
        behavior: { type: 'percentage_discount', percent: 10 },
        restrictions: {},
      }).returning({ id: dbSchema.coupons.id })

      assertExists(coup, 'Coupon should have been created')
      assertExists(coup.id, 'Coupon should have an auto-generated UUID')

      const [red] = await db.insert(dbSchema.redemptions).values({
        couponId: coup.id,
        businessId: biz.id,
        userId,
      }).returning({ id: dbSchema.redemptions.id })

      assertExists(red, 'Redemption should have been created')
      assertExists(red.id, 'Redemption should have an auto-generated UUID')

      const [tx] = await db.insert(dbSchema.transactions).values({
        redemptionId: red.id,
        couponId: coup.id,
        businessId: biz.id,
        userId,
        totalAmountCents: 1000,
        discountAppliedCents: 100,
        finalAmountCents: 900,
      }).returning({ id: dbSchema.transactions.id })

      assertExists(tx, 'Transaction should have been created')
      assertExists(tx.id, 'Transaction should have an auto-generated UUID')

      const [sig] = await db.insert(dbSchema.signals).values({
        userId,
        category: 'test_uuid',
        description: 'Testing uuid PK',
      }).returning({ id: dbSchema.signals.id })

      assertExists(sig, 'Signal should have been created')
      assertExists(sig.id, 'Signal should have an auto-generated UUID')

      const [ca] = await db.insert(dbSchema.couponAnalytics).values({
        couponId: coup.id,
        views: 1,
      }).returning({ id: dbSchema.couponAnalytics.id })

      assertExists(ca, 'CouponAnalytics should have been created')
      assertExists(ca.id, 'CouponAnalytics should have an auto-generated UUID')

      const [mp] = await db.insert(dbSchema.merchantPosts).values({
        businessId: biz.id,
        title: 'Default PK Post',
      }).returning({ id: dbSchema.merchantPosts.id })

      assertExists(mp, 'MerchantPost should have been created')
      assertExists(mp.id, 'merchant_posts should have an auto-generated UUID')

      const [fm] = await db.insert(dbSchema.fileMetadata).values({
        filename: crypto.randomUUID(),
        userId,
      }).returning({ id: dbSchema.fileMetadata.id })

      assertExists(fm, 'FileMetadata should have been created')
      assertExists(fm.id, 'FileMetadata should have an auto-generated UUID')
    },
  })

  Deno.test({
    name:
      'PK type compatibility - insert with explicit crypto.randomUUID() id works',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
      await cleanupAll()

      const userId = 'user_explicit_' + crypto.randomUUID()
      await db.insert(dbSchema.users).values({
        id: userId,
        email: 'explicit@test.com',
        name: 'Explicit ID Test',
      })

      const bizId = crypto.randomUUID()
      await db.insert(dbSchema.businesses).values({
        id: bizId,
        userId,
        name: 'Explicit PK Business',
        companyName: 'Explicit PK Business Ltda',
        cnpj: 'explct_pk_' + crypto.randomUUID().slice(0, 16),
        category: 'Test',
        logoUrl: 'http://localhost/logo.png',
      })

      const [found] = await db.select({ id: dbSchema.businesses.id })
        .from(dbSchema.businesses)
        .where(eq(dbSchema.businesses.id, bizId))

      assertExists(found, 'Business should be findable by explicit UUID')
      assertEquals(found.id, bizId, 'Explicit UUID should match')
    },
  })

  Deno.test({
    name:
      'PK type compatibility - join across app-owned tables with uuid PKs works',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
      await cleanupAll()

      const userId = 'user_join_' + crypto.randomUUID()

      await db.insert(dbSchema.users).values({
        id: userId,
        email: 'join_test@test.com',
        name: 'Join Test User',
      })

      const bizId = crypto.randomUUID()
      await db.insert(dbSchema.businesses).values({
        id: bizId,
        userId,
        name: 'Join Test Business',
        companyName: 'Join Test Business Ltda',
        cnpj: 'join_test_' + crypto.randomUUID().slice(0, 16),
        category: 'Test',
        logoUrl: 'http://localhost/logo.png',
      })

      const couponId = crypto.randomUUID()
      await db.insert(dbSchema.coupons).values({
        id: couponId,
        businessId: bizId,
        title: 'Join Test Coupon',
        behavior: { type: 'percentage_discount', percent: 10 },
        restrictions: {},
      })

      const redemptionId = crypto.randomUUID()
      await db.insert(dbSchema.redemptions).values({
        id: redemptionId,
        couponId,
        businessId: bizId,
        userId,
      })

      const result = await db.select({
        redemptionId: dbSchema.redemptions.id,
        couponId: dbSchema.coupons.id,
        businessId: dbSchema.businesses.id,
        couponTitle: dbSchema.coupons.title,
        businessName: dbSchema.businesses.name,
      }).from(dbSchema.redemptions)
        .innerJoin(
          dbSchema.coupons,
          eq(dbSchema.coupons.id, dbSchema.redemptions.couponId),
        )
        .innerJoin(
          dbSchema.businesses,
          eq(dbSchema.businesses.id, dbSchema.redemptions.businessId),
        )

      assertEquals(result.length, 1, 'Join should return one row')
      assertEquals(
        result[0].couponTitle,
        'Join Test Coupon',
        'Coupon title should match',
      )
      assertEquals(
        result[0].businessName,
        'Join Test Business',
        'Business name should match',
      )
    },
  })

  Deno.test({
    name:
      'PK type compatibility - join from app-owned table to Better Auth user table (text PK) works',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
      await cleanupAll()

      const userId = 'user_cross_' + crypto.randomUUID()
      await db.insert(dbSchema.users).values({
        id: userId,
        email: 'cross_type@test.com',
        name: 'Cross Type Join User',
      })

      const bizId = crypto.randomUUID()
      await db.insert(dbSchema.businesses).values({
        id: bizId,
        userId,
        name: 'Cross Type Business',
        companyName: 'Cross Type Business Ltda',
        cnpj: 'cross_type_' + crypto.randomUUID().slice(0, 16),
        category: 'Test',
        logoUrl: 'http://localhost/logo.png',
      })

      const result = await db.select({
        businessId: dbSchema.businesses.id,
        businessName: dbSchema.businesses.name,
        userEmail: dbSchema.users.email,
        userName: dbSchema.users.name,
      }).from(dbSchema.businesses)
        .innerJoin(
          dbSchema.users,
          eq(dbSchema.users.id, dbSchema.businesses.userId),
        )

      assertEquals(result.length, 1, 'Cross-type join should return one row')
      assertEquals(
        result[0].businessName,
        'Cross Type Business',
        'Business name should match',
      )
      assertEquals(
        result[0].userEmail,
        'cross_type@test.com',
        'User email should match from text PK join',
      )
    },
  })
} else {
  Deno.test(
    'PK type compatibility - Integration tests skipped (PG_CONNECTION not set)',
    () => {
      console.info(
        '[Test info] pk_type_compatibility integration tests skipped - PG_CONNECTION not set',
      )
    },
  )
}

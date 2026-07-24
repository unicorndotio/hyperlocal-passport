import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { db } from '../lib/db.ts'
import * as schema from '../db/schema.ts'
import { getCouponAnalytics, incrementViewCount } from '../lib/analytics.ts'

async function cleanupAll() {
  await db.delete(schema.couponAnalytics)
  await db.delete(schema.transactions)
  await db.delete(schema.redemptions)
  await db.delete(schema.merchantPosts)
  await db.delete(schema.coupons)
  await db.delete(schema.signals)
  await db.delete(schema.fileMetadata)
  await db.delete(schema.businesses)
  await db.delete(schema.users)
}

async function setupTestData(
  userId: string,
  businessId: string,
  couponId: string,
) {
  await db.insert(schema.users).values({
    id: userId,
    email: `${userId}@test.com`,
    name: 'Test User',
  })
  await db.insert(schema.businesses).values({
    id: businessId,
    userId,
    name: 'Test Business',
    companyName: 'Test Business Ltda',
    cnpj: `cnpj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    category: 'Test',
    logoUrl: 'http://localhost/logo.png',
  })
  await db.insert(schema.coupons).values({
    id: couponId,
    businessId,
    title: 'Test Coupon',
    behavior: { type: 'percentage_discount', percent: 10 },
    restrictions: {},
  })
}

Deno.test({
  name:
    'incrementViewCount - inserts a new row when no analytics record exists',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    await cleanupAll()
    const userId = crypto.randomUUID()
    const businessId = crypto.randomUUID()
    const couponId = crypto.randomUUID()
    await setupTestData(userId, businessId, couponId)

    await incrementViewCount(couponId)

    const analytics = await getCouponAnalytics(couponId)
    assertExists(analytics)
    assertEquals(analytics.couponId, couponId)
    assertEquals(analytics.views, 1)
    assertEquals(analytics.redemptions, 0)
    assertEquals(analytics.validations, 0)
  },
})

Deno.test({
  name: 'incrementViewCount - increments views when a record already exists',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    await cleanupAll()
    const userId = crypto.randomUUID()
    const businessId = crypto.randomUUID()
    const couponId = crypto.randomUUID()
    await setupTestData(userId, businessId, couponId)

    await incrementViewCount(couponId)
    await incrementViewCount(couponId)

    const analytics = await getCouponAnalytics(couponId)
    assertExists(analytics)
    assertEquals(analytics.views, 2)
  },
})

Deno.test({
  name:
    'incrementViewCount - full flow: coupon exists, increment, getAnalytics returns correct count',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    await cleanupAll()
    const userId = crypto.randomUUID()
    const businessId = crypto.randomUUID()
    const couponId = crypto.randomUUID()
    await setupTestData(userId, businessId, couponId)

    await incrementViewCount(couponId)
    await incrementViewCount(couponId)
    await incrementViewCount(couponId)

    const analytics = await getCouponAnalytics(couponId)
    assertExists(analytics)
    assertEquals(analytics.couponId, couponId)
    assertEquals(analytics.views, 3)
    assertEquals(analytics.redemptions, 0)
    assertEquals(analytics.validations, 0)
  },
})

Deno.test({
  name:
    'incrementViewCount - concurrent increments produce correct final count',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    await cleanupAll()
    const userId = crypto.randomUUID()
    const businessId = crypto.randomUUID()
    const couponId = crypto.randomUUID()
    await setupTestData(userId, businessId, couponId)

    const count = 10
    const calls = Array.from(
      { length: count },
      () => incrementViewCount(couponId),
    )
    await Promise.all(calls)

    const analytics = await getCouponAnalytics(couponId)
    assertExists(analytics)
    assertEquals(analytics.views, count)
  },
})

import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { handler as savingsHandler } from '../routes/api/users/me/savings.ts'
import { db } from '../lib/db.ts'
import * as schema from '../db/schema.ts'
import { eq } from 'drizzle-orm'

if (Deno.env.get('PG_CONNECTION')) {
  Deno.test({
    name: 'Savings API - no used redemptions returns zero totals',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async (t) => {
      const userId = 'sav_user_' + Math.random().toString(36).slice(2)
      const businessId = 'sav_biz_' + Math.random().toString(36).slice(2)
      const couponId = 'sav_coup_' + Math.random().toString(36).slice(2)

      await db.insert(schema.users).values({
        id: userId,
        email: `${userId}@test.com`,
        name: 'Savings User',
      }).onConflictDoNothing({ target: schema.users.id })

      await db.insert(schema.businesses).values({
        id: businessId,
        userId,
        name: 'Savings Shop',
        companyName: 'Savings Shop Ltd',
        cnpj: Date.now().toString(36).slice(-4) +
          Math.random().toString(36).slice(2, 12),
        category: 'Test',
        logoUrl: 'http://localhost/logo.png',
        isActive: true,
      })

      await db.insert(schema.coupons).values({
        id: couponId,
        businessId,
        title: 'Test Coupon',
        behavior: { type: 'percentage_discount', percent: 10 },
        restrictions: {},
        isActive: true,
      })

      try {
        await t.step(
          'returns zero totals when no used redemptions',
          async () => {
            const res = await (savingsHandler as unknown as {
              GET: (ctx: {
                req: Request
                state: {
                  user: Record<string, unknown> | null
                  session: Record<string, unknown> | null
                }
              }) => Promise<Response>
            }).GET({
              req: new Request('http://localhost:8000/api/users/me/savings'),
              state: {
                user: {
                  id: userId,
                  role: 'resident',
                  email: `${userId}@test.com`,
                  emailVerified: true,
                  name: 'Savings User',
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
                session: {
                  id: 'sess_sav',
                  userId,
                  expiresAt: new Date(Date.now() + 3600000),
                  token: 'token_sav',
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              },
            })

            assertEquals(res.status, 200)
            const body = await res.json()
            assertEquals(body.totalSavingsCents, 0)
            assertEquals(body.totalRedemptions, 0)
            assertEquals(body.byBusiness.length, 0)
          },
        )
      } finally {
        await db.delete(schema.coupons).where(eq(schema.coupons.id, couponId))
        await db.delete(schema.businesses).where(
          eq(schema.businesses.id, businessId),
        )
      }
    },
  })

  Deno.test({
    name: 'Savings API - used redemptions return correct totals',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async (t) => {
      const uniqueId = Math.random().toString(36).slice(2, 8)
      const userId = 'sav_used_' + uniqueId
      const businessId = 'biz_used_' + uniqueId
      const couponId = 'coup_used_' + uniqueId
      const redemptionId = 'USED_' + uniqueId
      const transactionId = 'txn_used_' + uniqueId

      await db.insert(schema.users).values({
        id: userId,
        email: `${userId}@test.com`,
        name: 'Used User',
      }).onConflictDoNothing({ target: schema.users.id })

      await db.insert(schema.businesses).values({
        id: businessId,
        userId,
        name: 'Used Shop',
        companyName: 'Used Shop Ltd',
        cnpj: Date.now().toString(36).slice(-4) +
          Math.random().toString(36).slice(2, 12),
        category: 'Test',
        logoUrl: 'http://localhost/logo.png',
        isActive: true,
      })

      await db.insert(schema.coupons).values({
        id: couponId,
        businessId,
        title: '10% Off',
        behavior: { type: 'percentage_discount', percent: 10 },
        restrictions: {},
        isActive: true,
      })

      await db.insert(schema.redemptions).values({
        id: redemptionId,
        couponId,
        businessId,
        userId,
        status: 'used',
        redeemedAt: new Date(),
        usedAt: new Date(),
      })

      await db.insert(schema.transactions).values({
        id: transactionId,
        redemptionId,
        couponId,
        businessId,
        userId,
        totalAmountCents: 5000,
        discountAppliedCents: 500,
        finalAmountCents: 4500,
        timestamp: new Date(),
      })

      try {
        await t.step(
          'returns correct totalSavingsCents and totalRedemptions',
          async () => {
            const res = await (savingsHandler as unknown as {
              GET: (ctx: {
                req: Request
                state: {
                  user: Record<string, unknown> | null
                  session: Record<string, unknown> | null
                }
              }) => Promise<Response>
            }).GET({
              req: new Request('http://localhost:8000/api/users/me/savings'),
              state: {
                user: {
                  id: userId,
                  role: 'resident',
                  email: `${userId}@test.com`,
                  emailVerified: true,
                  name: 'Used User',
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
                session: {
                  id: 'sess_used',
                  userId,
                  expiresAt: new Date(Date.now() + 3600000),
                  token: 'token_used',
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              },
            })

            assertEquals(res.status, 200)
            const body = await res.json()
            assertEquals(body.totalSavingsCents, 500)
            assertEquals(body.totalRedemptions, 1)
            assertEquals(body.byBusiness.length, 1)
            assertEquals(body.byBusiness[0].businessName, 'Used Shop')
            assertEquals(body.byBusiness[0].savingsCents, 500)
            assertEquals(body.byBusiness[0].count, 1)
          },
        )
      } finally {
        await db.delete(schema.transactions).where(
          eq(schema.transactions.id, transactionId),
        )
        await db.delete(schema.redemptions).where(
          eq(schema.redemptions.id, redemptionId),
        )
        await db.delete(schema.coupons).where(eq(schema.coupons.id, couponId))
        await db.delete(schema.businesses).where(
          eq(schema.businesses.id, businessId),
        )
      }
    },
  })

  Deno.test({
    name:
      'Savings API - returns correct per-business breakdown with multiple businesses',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async (t) => {
      const uniqueId = Math.random().toString(36).slice(2, 8)
      const userId = 'sav_multi_' + uniqueId
      const biz1Id = 'biz_m1_' + uniqueId
      const biz2Id = 'biz_m2_' + uniqueId
      const coup1Id = 'coup_m1_' + uniqueId
      const coup2Id = 'coup_m2_' + uniqueId
      const red1Id = 'REDM1_' + uniqueId
      const red2Id = 'REDM2_' + uniqueId
      const txn1Id = 'txn_m1_' + uniqueId
      const txn2Id = 'txn_m2_' + uniqueId

      await db.insert(schema.users).values({
        id: userId,
        email: `${userId}@test.com`,
        name: 'Multi User',
      }).onConflictDoNothing({ target: schema.users.id })

      await db.insert(schema.businesses).values({
        id: biz1Id,
        userId,
        name: 'First Shop',
        companyName: 'First Shop Ltd',
        cnpj: Date.now().toString(36).slice(-4) + '1' +
          Math.random().toString(36).slice(2, 11),
        category: 'Test',
        logoUrl: 'http://localhost/logo.png',
        isActive: true,
      })

      await db.insert(schema.businesses).values({
        id: biz2Id,
        userId,
        name: 'Second Shop',
        companyName: 'Second Shop Ltd',
        cnpj: Date.now().toString(36).slice(-4) + '2' +
          Math.random().toString(36).slice(2, 11),
        category: 'Test',
        logoUrl: 'http://localhost/logo.png',
        isActive: true,
      })

      await db.insert(schema.coupons).values({
        id: coup1Id,
        businessId: biz1Id,
        title: 'Coupon 1',
        behavior: { type: 'percentage_discount', percent: 10 },
        restrictions: {},
        isActive: true,
      })

      await db.insert(schema.coupons).values({
        id: coup2Id,
        businessId: biz2Id,
        title: 'Coupon 2',
        behavior: { type: 'fixed_amount', amountCents: 2000 },
        restrictions: {},
        isActive: true,
      })

      await db.insert(schema.redemptions).values({
        id: red1Id,
        couponId: coup1Id,
        businessId: biz1Id,
        userId,
        status: 'used',
        redeemedAt: new Date(),
        usedAt: new Date(),
      })

      await db.insert(schema.transactions).values({
        id: txn1Id,
        redemptionId: red1Id,
        couponId: coup1Id,
        businessId: biz1Id,
        userId,
        totalAmountCents: 10000,
        discountAppliedCents: 1000,
        finalAmountCents: 9000,
        timestamp: new Date(),
      })

      await db.insert(schema.redemptions).values({
        id: red2Id,
        couponId: coup2Id,
        businessId: biz2Id,
        userId,
        status: 'used',
        redeemedAt: new Date(),
        usedAt: new Date(),
      })

      await db.insert(schema.transactions).values({
        id: txn2Id,
        redemptionId: red2Id,
        couponId: coup2Id,
        businessId: biz2Id,
        userId,
        totalAmountCents: 5000,
        discountAppliedCents: 2000,
        finalAmountCents: 3000,
        timestamp: new Date(),
      })

      try {
        await t.step(
          'returns correct per-business breakdown with names and counts',
          async () => {
            const res = await (savingsHandler as unknown as {
              GET: (ctx: {
                req: Request
                state: {
                  user: Record<string, unknown> | null
                  session: Record<string, unknown> | null
                }
              }) => Promise<Response>
            }).GET({
              req: new Request('http://localhost:8000/api/users/me/savings'),
              state: {
                user: {
                  id: userId,
                  role: 'resident',
                  email: `${userId}@test.com`,
                  emailVerified: true,
                  name: 'Multi User',
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
                session: {
                  id: 'sess_multi',
                  userId,
                  expiresAt: new Date(Date.now() + 3600000),
                  token: 'token_multi',
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              },
            })

            assertEquals(res.status, 200)
            const body = await res.json()
            assertEquals(body.totalSavingsCents, 3000)
            assertEquals(body.totalRedemptions, 2)
            assertEquals(body.byBusiness.length, 2)

            const firstBiz = body.byBusiness.find(
              (b: { businessId: string }) => b.businessId === biz1Id,
            )
            assertExists(firstBiz)
            assertEquals(firstBiz.businessName, 'First Shop')
            assertEquals(firstBiz.savingsCents, 1000)
            assertEquals(firstBiz.count, 1)

            const secondBiz = body.byBusiness.find(
              (b: { businessId: string }) => b.businessId === biz2Id,
            )
            assertExists(secondBiz)
            assertEquals(secondBiz.businessName, 'Second Shop')
            assertEquals(secondBiz.savingsCents, 2000)
            assertEquals(secondBiz.count, 1)
          },
        )
      } finally {
        await db.delete(schema.transactions).where(
          eq(schema.transactions.id, txn1Id),
        )
        await db.delete(schema.transactions).where(
          eq(schema.transactions.id, txn2Id),
        )
        await db.delete(schema.redemptions).where(
          eq(schema.redemptions.id, red1Id),
        )
        await db.delete(schema.redemptions).where(
          eq(schema.redemptions.id, red2Id),
        )
        await db.delete(schema.coupons).where(eq(schema.coupons.id, coup1Id))
        await db.delete(schema.coupons).where(eq(schema.coupons.id, coup2Id))
        await db.delete(schema.businesses).where(
          eq(schema.businesses.id, biz1Id),
        )
        await db.delete(schema.businesses).where(
          eq(schema.businesses.id, biz2Id),
        )
      }
    },
  })

  Deno.test({
    name: 'Savings API - without authentication returns 401',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
      const res = await (savingsHandler as unknown as {
        GET: (ctx: {
          req: Request
          state: {
            user: Record<string, unknown> | null
            session: Record<string, unknown> | null
          }
        }) => Promise<Response>
      }).GET({
        req: new Request('http://localhost:8000/api/users/me/savings'),
        state: { user: null, session: null },
      })

      assertEquals(res.status, 401)
    },
  })

  Deno.test({
    name: 'Savings API - with business role returns 403',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
      const userId = 'sav_biz_role_' + Math.random().toString(36).slice(2)

      const res = await (savingsHandler as unknown as {
        GET: (ctx: {
          req: Request
          state: {
            user: Record<string, unknown> | null
            session: Record<string, unknown> | null
          }
        }) => Promise<Response>
      }).GET({
        req: new Request('http://localhost:8000/api/users/me/savings'),
        state: {
          user: {
            id: userId,
            role: 'business',
            email: `${userId}@test.com`,
            emailVerified: true,
            name: 'Biz User',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          session: {
            id: 'sess_biz_role',
            userId,
            expiresAt: new Date(Date.now() + 3600000),
            token: 'token_biz_role',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      })

      assertEquals(res.status, 403)
    },
  })
} else {
  Deno.test({
    name: 'Savings API - Skipped (PG_CONNECTION not set)',
    fn: () => {
      console.info(
        '[Test info] savings_api.test.ts skipped - PG_CONNECTION not set',
      )
    },
  })
}

import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { handler as passaporteHandler } from '../routes/passaporte.tsx'
import { db } from '../lib/db.ts'
import * as schema from '../db/schema.ts'
import { eq } from 'drizzle-orm'

if (Deno.env.get('PG_CONNECTION')) {
  type PassaportePage = {
    redemptions: Array<Record<string, unknown>>
  }

  type PassaporteCtx = {
    req: Request
    state: Record<string, unknown>
    redirect: (url: string) => Response
  }

  type PassaporteHandler = {
    GET(ctx: PassaporteCtx):
      | { data: PassaportePage }
      | Response
      | Promise<{ data: PassaportePage } | Response>
  }

  const mockRedirect = (_url: string): Response =>
    new Response(null, { status: 303, headers: { location: _url } })

  Deno.test({
    name: 'Passaporte - authenticated user with active redemptions',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async (t) => {
      const uniqueId = Math.random().toString(36).slice(2, 8)
      const userId = 'user_pass_' + uniqueId
      const businessId = 'biz_pass_' + uniqueId
      const couponId = 'coup_pass_' + uniqueId
      const redemptionId = 'REDEEM_' + uniqueId

      await db.insert(schema.users).values({
        id: userId,
        email: userId + '@test.com',
        name: 'Passaporte User',
      }).onConflictDoNothing({ target: schema.users.id })

      await db.insert(schema.businesses).values({
        id: businessId,
        userId,
        name: 'Pass Shop',
        companyName: 'Pass Shop Ltd',
        cnpj: Date.now().toString(36).slice(-4) +
          Math.random().toString(36).slice(2, 12),
        category: 'Alimentação',
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
        status: 'active',
        redeemedAt: new Date(),
      })

      try {
        await t.step(
          'returns active redemptions with businessName',
          async () => {
            const res =
              await (passaporteHandler as unknown as PassaporteHandler).GET({
                req: new Request('http://localhost:8000/passaporte'),
                state: {
                  user: {
                    id: userId,
                    role: 'resident',
                    email: userId + '@test.com',
                    name: 'Passaporte User',
                    emailVerified: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                  session: {
                    id: 'sess_pass',
                    userId,
                    expiresAt: new Date(Date.now() + 3600000),
                    token: 'token_pass',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                },
                redirect: mockRedirect,
              })

            if (res instanceof Response) {
              throw new Error('Expected page data, got redirect')
            }

            assertExists(res.data)
            assertEquals(Array.isArray(res.data.redemptions), true)
            assertEquals(res.data.redemptions.length, 1)

            const r = res.data.redemptions[0]
            assertEquals(r.id, redemptionId)
            assertEquals(r.businessName, 'Pass Shop')
            assertEquals(r.status, 'active')
            assertEquals(r.businessId, businessId)
            assertEquals(typeof r.redeemedAt, 'number')
          },
        )
      } finally {
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
    name: 'Passaporte - authenticated user with no active redemptions',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async (t) => {
      const uniqueId = Math.random().toString(36).slice(2, 8)
      const userId = 'user_pass_empty_' + uniqueId
      const businessId = 'biz_pass_empty_' + uniqueId
      const couponId = 'coup_pass_empty_' + uniqueId
      const redemptionId = 'EMPTY_' + uniqueId

      await db.insert(schema.users).values({
        id: userId,
        email: userId + '@test.com',
        name: 'Empty User',
      }).onConflictDoNothing({ target: schema.users.id })

      await db.insert(schema.businesses).values({
        id: businessId,
        userId,
        name: 'Empty Shop',
        companyName: 'Empty Shop Ltd',
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
        behavior: { type: 'percentage_discount', percent: 5 },
        restrictions: {},
        isActive: true,
      })

      // Create a 'used' redemption that should NOT appear
      await db.insert(schema.redemptions).values({
        id: redemptionId,
        couponId,
        businessId,
        userId,
        status: 'used',
        redeemedAt: new Date(),
      })

      try {
        await t.step('returns empty redemptions array', async () => {
          const res = await (passaporteHandler as unknown as PassaporteHandler)
            .GET({
              req: new Request('http://localhost:8000/passaporte'),
              state: {
                user: {
                  id: userId,
                  role: 'resident',
                  email: userId + '@test.com',
                  name: 'Empty User',
                  emailVerified: true,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
                session: {
                  id: 'sess_empty',
                  userId,
                  expiresAt: new Date(Date.now() + 3600000),
                  token: 'token_empty',
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              },
              redirect: mockRedirect,
            })

          if (res instanceof Response) {
            throw new Error('Expected page data, got redirect')
          }

          assertEquals(typeof res.data, 'object')
          assertEquals(Array.isArray(res.data.redemptions), true)
          assertEquals(res.data.redemptions.length, 0)
        })
      } finally {
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
    name: 'Passaporte - unauthenticated user redirects to /login',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
      const res = await (passaporteHandler as unknown as PassaporteHandler)
        .GET({
          req: new Request('http://localhost:8000/passaporte'),
          state: { user: null, session: null },
          redirect: mockRedirect,
        })

      if (!(res instanceof Response)) {
        throw new Error('Expected Response redirect, got page data')
      }

      assertEquals(res.status, 303)
      assertEquals(res.headers.get('location'), '/login')
    },
  })
} else {
  Deno.test('Passaporte Page - Skipped (PG_CONNECTION not set)', () => {
    console.info(
      '[Test info] passaporte_page.test.ts skipped - PG_CONNECTION not set',
    )
  })
}

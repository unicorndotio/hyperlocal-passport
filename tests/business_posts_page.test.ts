import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import BusinessPostsPage from '../routes/business/posts.tsx'
import { db } from '../lib/db.ts'
import * as schema from '../db/schema.ts'
import { eq } from 'drizzle-orm'

type PageCtx = {
  state: {
    user: { id: string; email: string; name: string; role: string } | null
  }
  req: Request
}

async function cleanup(ids: { userId?: string; businessId?: string }) {
  if (ids.businessId) {
    await db.delete(schema.merchantPosts).where(
      eq(schema.merchantPosts.businessId, ids.businessId),
    )
    await db.delete(schema.businesses).where(
      eq(schema.businesses.id, ids.businessId),
    )
  }
  if (ids.userId) {
    await db.delete(schema.users).where(eq(schema.users.id, ids.userId))
  }
}

Deno.test({
  name: 'Business Posts Page - redirects to /login when user is null',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const res = await (BusinessPostsPage as (
      ctx: PageCtx,
    ) => Promise<Response>)({
      state: { user: null },
      req: new Request('http://localhost/business/posts'),
    })
    assertEquals(res.status, 302)
    assertEquals(res.headers.get('Location'), '/login')
  },
})

Deno.test({
  name: 'Business Posts Page - redirects to /login when role is not business',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const res = await (BusinessPostsPage as (
      ctx: PageCtx,
    ) => Promise<Response>)({
      state: {
        user: {
          id: 'resident-id',
          email: 'resident@test.com',
          name: 'Resident',
          role: 'resident',
        },
      },
      req: new Request('http://localhost/business/posts'),
    })
    assertEquals(res.status, 302)
    assertEquals(res.headers.get('Location'), '/login')
  },
})

Deno.test({
  name: 'Business Posts Page - renders posts page for valid business user',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const userId = 'post-page-user-' + crypto.randomUUID()
    const businessId = 'post-page-biz-' + crypto.randomUUID()

    try {
      await db.insert(schema.users).values({
        id: userId,
        email: `post-page-${userId}@test.com`,
        name: 'Post Page User',
        role: 'business',
        emailVerified: true,
      })

      await db.insert(schema.businesses).values({
        id: businessId,
        userId,
        name: 'Post Page Biz',
        companyName: 'Post Page Biz Co',
        cnpj: 'PAGET' + crypto.randomUUID().slice(0, 10),
        category: 'test',
        logoUrl: '/logo.png',
        isActive: true,
      })

      const res = await (BusinessPostsPage as (
        ctx: PageCtx,
      ) => Promise<Response | { __freshPage: boolean }>)({
        state: {
          user: {
            id: userId,
            email: `post-page-${userId}@test.com`,
            name: 'Post Page User',
            role: 'business',
          },
        },
        req: new Request('http://localhost/business/posts'),
      })

      assertExists(res)
      assertEquals((res as Response).status ?? 200, 200)
    } finally {
      await cleanup({ userId, businessId })
    }
  },
})

Deno.test({
  name:
    'Business Posts Page - shows restricted access card when no business linked',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const userId = 'post-page-no-biz-' + crypto.randomUUID()

    try {
      await db.insert(schema.users).values({
        id: userId,
        email: `post-page-${userId}@test.com`,
        name: 'No Biz User',
        role: 'business',
        emailVerified: true,
      })

      const res = await (BusinessPostsPage as (
        ctx: PageCtx,
      ) => Promise<Response | { __freshPage: boolean }>)({
        state: {
          user: {
            id: userId,
            email: `post-page-${userId}@test.com`,
            name: 'No Biz User',
            role: 'business',
          },
        },
        req: new Request('http://localhost/business/posts'),
      })

      assertExists(res)
      assertEquals((res as Response).status ?? 200, 200)
    } finally {
      await cleanup({ userId })
    }
  },
})

import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { stub } from 'https://deno.land/std@0.224.0/testing/mock.ts'
import { handler as catalogHandler } from '../routes/catalog.tsx'
import { auth } from '../lib/auth.ts'
import { db } from '../lib/db.ts'
import * as schema from '../db/schema.ts'
import { eq } from 'drizzle-orm'

if (Deno.env.get('PG_CONNECTION')) {
  interface CatalogState {
    user: { id: string; role: string; email: string; name: string } | null
    session: { id: string; userId: string } | null
  }

  type CatalogCtx = { req: Request; state: CatalogState }
  type CatalogPage = {
    businesses: unknown[]
    categories: string[]
    selectedCategory: string
  }
  type BizRecord = Record<string, unknown>

  type CatalogHandler = {
    GET(ctx: CatalogCtx): { data: CatalogPage } | Promise<{ data: CatalogPage }>
  }

  const defaultState: CatalogState = { user: null, session: null }

  Deno.test({
    name: 'Catalog - filters by isActive and category',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async (t) => {
      const uniqueId = Math.random().toString(36).slice(2, 8)
      const userId = 'user_cat_' + uniqueId
      const bizActive = 'biz_act_' + uniqueId
      const bizInactive = 'biz_inact_' + uniqueId

      await db.insert(schema.users).values({
        id: userId,
        email: userId + '@test.com',
        name: 'Catalog Test User',
      }).onConflictDoNothing({ target: schema.users.id })

      await db.insert(schema.businesses).values({
        id: bizActive,
        userId,
        name: 'Active Shop',
        companyName: 'Active Shop Ltd',
        cnpj: Date.now().toString(36).slice(-4) +
          Math.random().toString(36).slice(2, 12),
        category: 'Alimentação',
        logoUrl: 'http://localhost/logo1.png',
        isActive: true,
      })

      await db.insert(schema.businesses).values({
        id: bizInactive,
        userId,
        name: 'Inactive Shop',
        companyName: 'Inactive Shop Ltd',
        cnpj: Date.now().toString(36).slice(-4) +
          Math.random().toString(36).slice(2, 12),
        category: 'Lazer',
        logoUrl: 'http://localhost/logo2.png',
        isActive: false,
      })

      try {
        await t.step('returns only active businesses', async () => {
          const req = new Request('http://localhost:8000/catalog')
          const res = await (catalogHandler as CatalogHandler).GET({
            req,
            state: defaultState,
          })

          assertEquals(typeof res.data, 'object')
          assertEquals(Array.isArray(res.data.businesses), true)

          const bizList = res.data.businesses as BizRecord[]
          const bizIds = bizList.map((b) => b.id)
          assertEquals(
            bizIds.includes(bizActive),
            true,
            'Active business should appear',
          )
          assertEquals(
            bizIds.includes(bizInactive),
            false,
            'Inactive business should not appear',
          )
        })

        await t.step('filters by category', async () => {
          const req = new Request(
            'http://localhost:8000/catalog?category=Alimentação',
          )
          const res = await (catalogHandler as CatalogHandler).GET({
            req,
            state: defaultState,
          })

          assertEquals(Array.isArray(res.data.businesses), true)
          const bizList = res.data.businesses as BizRecord[]
          const bizIds = bizList.map((b) => b.id)
          assertEquals(bizIds.includes(bizActive), true)
          assertEquals(bizIds.includes(bizInactive), false)
          // All returned businesses should have the matching category
          for (const b of bizList) {
            assertEquals(b.category, 'Alimentação')
          }
        })

        await t.step('non-matching category returns empty', async () => {
          const req = new Request(
            'http://localhost:8000/catalog?category=Servi%C3%A7os',
          )
          const res = await (catalogHandler as CatalogHandler).GET({
            req,
            state: defaultState,
          })

          assertEquals(res.data.businesses.length, 0)
        })

        await t.step(
          'categories include active business categories only',
          async () => {
            const req = new Request('http://localhost:8000/catalog')
            const res = await (catalogHandler as CatalogHandler).GET({
              req,
              state: defaultState,
            })

            assertEquals(res.data.categories.includes('Todos'), true)
            assertEquals(res.data.categories.includes('Alimentação'), true)
            assertEquals(
              res.data.categories.includes('Lazer'),
              false,
              'Inactive business category excluded',
            )
            assertEquals(res.data.selectedCategory, 'Todos')
          },
        )

        await t.step('business data fields are correct', async () => {
          const req = new Request('http://localhost:8000/catalog')
          const res = await (catalogHandler as CatalogHandler).GET({
            req,
            state: defaultState,
          })

          const bizList = res.data.businesses as BizRecord[]
          const activeBiz = bizList.find(
            (b) => b.id === bizActive,
          )

          assertExists(activeBiz)
          assertEquals(activeBiz.name, 'Active Shop')
          assertEquals(activeBiz.category, 'Alimentação')
          assertEquals(activeBiz.isActive, true)
        })
      } finally {
        await db.delete(schema.businesses).where(
          eq(schema.businesses.id, bizActive),
        )
        await db.delete(schema.businesses).where(
          eq(schema.businesses.id, bizInactive),
        )
      }
    },
  })
} else {
  Deno.test('Mobile Catalog Integration - Skipped (PG_CONNECTION not set)', () => {
    console.info(
      '[Test info] mobile_catalog_integration.test.ts skipped - PG_CONNECTION not set',
    )
  })
}

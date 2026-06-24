import { define } from '../../../../utils.ts'
import { db } from '../../../../lib/db.ts'
import * as schema from '../../../../db/schema.ts'
import { and, desc, eq, gte, lte } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'

interface CouponWithBusiness {
  id: string
  businessId: string
  title: string
  description: string | null
  behavior: unknown
  restrictions: unknown
  isActive: boolean
  createdAt: Date
  businessName: string
}

export const handler = define.handlers({
  async GET(ctx) {
    const url = new URL(ctx.req.url)
    const businessId = url.searchParams.get('businessId')
    const statusFilter = url.searchParams.get('status')
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')

    const conditions: SQL[] = []

    if (businessId) {
      conditions.push(eq(schema.coupons.businessId, businessId))
    }

    if (statusFilter === 'active') {
      conditions.push(eq(schema.coupons.isActive, true))
    } else if (statusFilter === 'inactive') {
      conditions.push(eq(schema.coupons.isActive, false))
    }

    if (dateFrom) {
      const from = new Date(dateFrom)
      if (!isNaN(from.getTime())) {
        conditions.push(gte(schema.coupons.createdAt, from))
      }
    }

    if (dateTo) {
      const to = new Date(dateTo)
      if (!isNaN(to.getTime())) {
        conditions.push(lte(schema.coupons.createdAt, to))
      }
    }

    const rows = await db
      .select({
        id: schema.coupons.id,
        businessId: schema.coupons.businessId,
        title: schema.coupons.title,
        description: schema.coupons.description,
        behavior: schema.coupons.behavior,
        restrictions: schema.coupons.restrictions,
        isActive: schema.coupons.isActive,
        createdAt: schema.coupons.createdAt,
        businessName: schema.businesses.name,
      })
      .from(schema.coupons)
      .leftJoin(
        schema.businesses,
        eq(schema.coupons.businessId, schema.businesses.id),
      )
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.coupons.createdAt))

    const coupons: CouponWithBusiness[] = rows.map((row) => ({
      id: row.id,
      businessId: row.businessId,
      title: row.title,
      description: row.description,
      behavior: row.behavior,
      restrictions: row.restrictions,
      isActive: row.isActive,
      createdAt: row.createdAt,
      businessName: row.businessName ?? 'Unknown Business',
    }))

    return Response.json({
      coupons,
      total: coupons.length,
    })
  },
})

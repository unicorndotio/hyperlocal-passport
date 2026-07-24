import {
  assertEquals,
  assertExists,
  assertStringIncludes,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'

Deno.test('partner_ledger schema - table is exported from schema module', async () => {
  const mod = await import('../../db/schema.ts')
  assertExists(mod.partnerLedger, 'partnerLedger must be exported from schema')
})

Deno.test('partner_ledger schema - partnerLedgerRelations is exported', async () => {
  const mod = await import('../../db/schema.ts')
  assertExists(
    mod.partnerLedgerRelations,
    'partnerLedgerRelations must be exported from schema',
  )
})

Deno.test('partner_ledger schema - businesses table has partnerLedger relation', () => {
  const schemaContent = Deno.readTextFileSync('./db/schema.ts')
  assertStringIncludes(
    schemaContent,
    'partnerLedger: many(partnerLedger)',
    'businessesRelations should include partnerLedger relation',
  )
})

Deno.test('partner_ledger schema - partner_ledger FK uses uuid type', () => {
  const schemaContent = Deno.readTextFileSync('./db/schema.ts')
  assertStringIncludes(
    schemaContent,
    "businessId: uuid('business_id')",
    'partner_ledger.businessId must use uuid type',
  )
})

Deno.test('partner_ledger schema - partner_ledger has all required columns', () => {
  const schemaContent = Deno.readTextFileSync('./db/schema.ts')
  const expectedColumns = [
    "id: uuid('id')",
    "businessId: uuid('business_id')",
    "amountCents: integer('amount_cents')",
    "months: integer('months')",
    "paymentDate: timestamp('payment_date'",
    "createdAt: timestamp('created_at'",
  ]
  for (const col of expectedColumns) {
    assertStringIncludes(
      schemaContent,
      col,
      `partner_ledger should have column: ${col}`,
    )
  }
})

Deno.test('partner_ledger schema - partner_ledger has FK constraint with cascade delete', () => {
  const schemaContent = Deno.readTextFileSync('./db/schema.ts')
  assertStringIncludes(
    schemaContent,
    "onDelete: 'cascade'",
    'partner_ledger FK should have cascade delete',
  )
})

Deno.test('partner_ledger schema - partner_ledger has business_id index', () => {
  const schemaContent = Deno.readTextFileSync('./db/schema.ts')
  assertStringIncludes(
    schemaContent,
    "idxBusinessId: index('idx_partner_ledger_business_id')",
    'partner_ledger should have an index on businessId',
  )
})

Deno.test('partner_ledger schema - businesses has address fields', () => {
  const schemaContent = Deno.readTextFileSync('./db/schema.ts')
  const expectedColumns = [
    "cep: text('cep')",
    "street: text('street')",
    "number: text('number')",
    "neighborhood: text('neighborhood')",
    "mapsUrl: text('maps_url')",
    "expirationDate: timestamp('expiration_date'",
  ]
  for (const col of expectedColumns) {
    assertStringIncludes(
      schemaContent,
      col,
      `businesses should have column: ${col}`,
    )
  }
})

if (Deno.env.get('PG_CONNECTION')) {
  const { db } = await import('../../lib/db.ts')
  const schema = await import('../../db/schema.ts')
  const { eq } = await import('drizzle-orm')
  const { cleanupDatabase } = await import('../../lib/test-db.ts')

  Deno.test({
    name: 'partner_ledger DB - insert and query business with address fields',
    sanitizeOps: false,
    sanitizeResources: false,
    async fn() {
      try {
        await cleanupDatabase()
        const userId = crypto.randomUUID()
        await db.insert(schema.users).values({
          id: userId,
          email: `${userId}@test.com`,
          name: 'Test Business Owner',
        }).onConflictDoNothing({ target: schema.users.id })

        const bizId = crypto.randomUUID()
        await db.insert(schema.businesses).values({
          id: bizId,
          userId,
          name: 'Partner Test Biz',
          companyName: 'Partner Test Biz Ltd',
          cnpj: crypto.randomUUID().slice(0, 14),
          category: 'Alimentação',
          logoUrl: 'http://localhost/logo.png',
          cep: '12345678',
          street: 'Rua das Flores',
          number: '100',
          neighborhood: 'Centro',
          mapsUrl: 'https://maps.google.com/?q=test',
          isActive: false,
        })

        const [row] = await db.select().from(schema.businesses)
          .where(eq(schema.businesses.id, bizId))
        assertExists(row, 'Business should exist')
        assertEquals(row.cep, '12345678')
        assertEquals(row.street, 'Rua das Flores')
        assertEquals(row.number, '100')
        assertEquals(row.neighborhood, 'Centro')
        assertEquals(row.mapsUrl, 'https://maps.google.com/?q=test')
      } finally {
        await cleanupDatabase()
      }
    },
  })

  Deno.test({
    name: 'partner_ledger DB - insert and query partner_ledger entry',
    sanitizeOps: false,
    sanitizeResources: false,
    async fn() {
      try {
        await cleanupDatabase()
        const userId = crypto.randomUUID()
        await db.insert(schema.users).values({
          id: userId,
          email: `${userId}@test.com`,
          name: 'Test Owner',
        }).onConflictDoNothing({ target: schema.users.id })

        const bizId = crypto.randomUUID()
        await db.insert(schema.businesses).values({
          id: bizId,
          userId,
          name: 'Ledger Test Biz',
          companyName: 'Ledger Test Biz Ltd',
          cnpj: crypto.randomUUID().slice(0, 14),
          category: 'Serviços',
          logoUrl: 'http://localhost/logo.png',
          isActive: false,
        })

        const ledgerId = crypto.randomUUID()
        await db.insert(schema.partnerLedger).values({
          id: ledgerId,
          businessId: bizId,
          amountCents: 50000,
          months: 3,
          paymentDate: new Date('2026-07-01'),
        })

        const [row] = await db.select().from(schema.partnerLedger)
          .where(eq(schema.partnerLedger.id, ledgerId))
        assertExists(row, 'Ledger entry should exist')
        assertEquals(row.businessId, bizId)
        assertEquals(row.amountCents, 50000)
        assertEquals(row.months, 3)
      } finally {
        await cleanupDatabase()
      }
    },
  })

  Deno.test({
    name: 'partner_ledger DB - ledger entry references existing business',
    sanitizeOps: false,
    sanitizeResources: false,
    async fn() {
      try {
        await cleanupDatabase()
        const userId = crypto.randomUUID()
        await db.insert(schema.users).values({
          id: userId,
          email: `${userId}@test.com`,
          name: 'Test Owner',
        }).onConflictDoNothing({ target: schema.users.id })

        const bizId = crypto.randomUUID()
        await db.insert(schema.businesses).values({
          id: bizId,
          userId,
          name: 'Join Test Biz',
          companyName: 'Join Test Biz Ltd',
          cnpj: crypto.randomUUID().slice(0, 14),
          category: 'Entretenimento',
          logoUrl: 'http://localhost/logo.png',
          isActive: false,
        })

        await db.insert(schema.partnerLedger).values({
          id: crypto.randomUUID(),
          businessId: bizId,
          amountCents: 100000,
          months: 6,
          paymentDate: new Date('2026-07-01'),
        })

        const [row] = await db
          .select({
            ledgerId: schema.partnerLedger.id,
            bizName: schema.businesses.name,
            amountCents: schema.partnerLedger.amountCents,
            months: schema.partnerLedger.months,
          })
          .from(schema.partnerLedger)
          .innerJoin(
            schema.businesses,
            eq(schema.partnerLedger.businessId, schema.businesses.id),
          )
        assertExists(row, 'Join query should return a result')
        assertEquals(row.bizName, 'Join Test Biz')
        assertEquals(row.amountCents, 100000)
        assertEquals(row.months, 6)
      } finally {
        await cleanupDatabase()
      }
    },
  })
} else {
  Deno.test(
    'partner_ledger DB - Skipped (PG_CONNECTION not set)',
    () => {
      console.info(
        '[Test info] partner_ledger DB tests skipped - PG_CONNECTION not set',
      )
    },
  )
}

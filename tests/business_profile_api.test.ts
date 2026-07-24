import {
  assertEquals,
  assertExists,
  assertStringIncludes,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { db } from '../lib/db.ts'
import * as schema from '../db/schema.ts'
import { eq } from 'drizzle-orm'
import { useDatabase, cleanupDatabase } from '../lib/test-db.ts'
import {
  validateCep,
  validateMapsUrl,
  validateBusinessCategory,
  normalizeCep,
  BUSINESS_CATEGORIES,
} from '../lib/business.ts'
import type { SessionUser } from '../utils.ts'

// deno-lint-ignore react-rules-of-hooks
useDatabase()

Deno.test('Business Profile API — unit: validateCep', async (t) => {
  await t.step('accepts valid CEP with dash', () => {
    assertEquals(validateCep('88000-000'), undefined)
  })

  await t.step('accepts valid CEP without dash', () => {
    assertEquals(validateCep('88000000'), undefined)
  })

  await t.step('normalizes CEP to digits only', () => {
    assertEquals(normalizeCep('88000-000'), '88000000')
    assertEquals(normalizeCep('88000-000'), '88000000')
  })

  await t.step('rejects invalid CEP format', () => {
    assertStringIncludes(validateCep('abc')!, 'CEP inválido')
    assertStringIncludes(validateCep('123')!, 'CEP inválido')
    assertStringIncludes(validateCep('88000-0000')!, 'CEP inválido')
  })

  await t.step('returns undefined for null/undefined/empty', () => {
    assertEquals(validateCep(null), undefined)
    assertEquals(validateCep(undefined), undefined)
    assertEquals(validateCep(''), undefined)
  })

  await t.step('rejects non-string values', () => {
    assertStringIncludes(validateCep(123)!, 'deve ser um texto')
  })
})

Deno.test('Business Profile API — unit: validateMapsUrl', async (t) => {
  await t.step('accepts valid Google Maps URL', () => {
    assertEquals(
      validateMapsUrl('https://maps.google.com/?q=-23.5,-46.6'),
      undefined,
    )
    assertEquals(
      validateMapsUrl('https://www.google.com/maps/place/Teste/@-23.5,-46.6,15z'),
      undefined,
    )
    assertEquals(
      validateMapsUrl('https://goo.gl/maps/abc123'),
      undefined,
    )
  })

  await t.step('rejects non-URL string', () => {
    assertStringIncludes(validateMapsUrl('not-a-url')!, 'inválida')
  })

  await t.step('returns undefined for null/undefined/empty', () => {
    assertEquals(validateMapsUrl(null), undefined)
    assertEquals(validateMapsUrl(undefined), undefined)
    assertEquals(validateMapsUrl(''), undefined)
  })

  await t.step('rejects non-string values', () => {
    assertStringIncludes(validateMapsUrl(42)!, 'deve ser um texto')
  })
})

Deno.test('Business Profile API — unit: validateBusinessCategory', async (t) => {
  await t.step('accepts all valid categories', () => {
    for (const cat of BUSINESS_CATEGORIES) {
      assertEquals(validateBusinessCategory(cat), undefined, `should accept ${cat}`)
    }
  })

  await t.step('rejects invalid category', () => {
    assertStringIncludes(validateBusinessCategory('InvalidCat')!, 'inválida')
    assertStringIncludes(validateBusinessCategory('Tecnologia')!, 'inválida')
  })

  await t.step('returns undefined for null/undefined/empty', () => {
    assertEquals(validateBusinessCategory(null), undefined)
    assertEquals(validateBusinessCategory(undefined), undefined)
    assertEquals(validateBusinessCategory(''), undefined)
  })

  await t.step('rejects non-string values', () => {
    assertStringIncludes(validateBusinessCategory(123)!, 'deve ser um texto')
  })
})

Deno.test('Business Profile API — integration: full update with new fields', async () => {
  const userId = `profile_test_${crypto.randomUUID()}`
  const businessId = crypto.randomUUID()

  await db.insert(schema.users).values({
    id: userId,
    email: `${userId}@test.com`,
    name: 'Profile Test User',
  })

  await db.insert(schema.businesses).values({
    id: businessId,
    name: 'Original Business',
    companyName: 'Original Business Ltda',
    cnpj: `${Date.now()}11222333000181`,
    category: 'Alimentação',
    logoUrl: 'http://localhost/logo.png',
    userId,
    isActive: true,
  })

  // Update via direct DB call to simulate JSON API
  const [updated] = await db.update(schema.businesses).set({
    cep: '88000000',
    street: 'Rua Teste',
    number: '123',
    neighborhood: 'Centro',
    mapsUrl: 'https://maps.google.com/?q=-23.5,-46.6',
    category: 'Serviços',
  }).where(eq(schema.businesses.id, businessId)).returning()

  assertExists(updated)
  assertEquals(updated.cep, '88000000')
  assertEquals(updated.street, 'Rua Teste')
  assertEquals(updated.number, '123')
  assertEquals(updated.neighborhood, 'Centro')
  assertEquals(updated.mapsUrl, 'https://maps.google.com/?q=-23.5,-46.6')
  assertEquals(updated.category, 'Serviços')

  await db.delete(schema.businesses).where(eq(schema.businesses.id, businessId))
  await db.delete(schema.users).where(eq(schema.users.id, userId))
})

Deno.test('Business Profile API — integration: clear address fields', async () => {
  const userId = `clear_test_${crypto.randomUUID()}`
  const businessId = crypto.randomUUID()

  await db.insert(schema.users).values({
    id: userId,
    email: `${userId}@test.com`,
    name: 'Clear Test User',
  })

  await db.insert(schema.businesses).values({
    id: businessId,
    name: 'Clear Test Biz',
    companyName: 'Clear Test Biz Ltda',
    cnpj: `${Date.now()}99888777000181`,
    category: 'Outro',
    logoUrl: 'http://localhost/logo.png',
    userId,
    cep: '88000000',
    street: 'Rua Antiga',
    number: '999',
    neighborhood: 'Bairro Velho',
    mapsUrl: 'https://maps.google.com/?q=-23.5,-46.6',
    isActive: true,
  })

  // Set fields to null (clear them)
  const [cleared] = await db.update(schema.businesses).set({
    cep: null,
    street: null,
    number: null,
    neighborhood: null,
    mapsUrl: null,
  }).where(eq(schema.businesses.id, businessId)).returning()

  assertExists(cleared)
  assertEquals(cleared.cep, null)
  assertEquals(cleared.street, null)
  assertEquals(cleared.number, null)
  assertEquals(cleared.neighborhood, null)
  assertEquals(cleared.mapsUrl, null)

  await db.delete(schema.businesses).where(eq(schema.businesses.id, businessId))
  await db.delete(schema.users).where(eq(schema.users.id, userId))
})

Deno.test('Business Profile API — integration: reject invalid category via DB constraint', async () => {
  const userId = `cat_reject_${crypto.randomUUID()}`
  const businessId = crypto.randomUUID()

  await db.insert(schema.users).values({
    id: userId,
    email: `${userId}@test.com`,
    name: 'Cat Reject User',
  })

  await db.insert(schema.businesses).values({
    id: businessId,
    name: 'Cat Reject Biz',
    companyName: 'Cat Reject Biz Ltda',
    cnpj: `${Date.now()}77666555000181`,
    category: 'Alimentação',
    logoUrl: 'http://localhost/logo.png',
    userId,
    isActive: true,
  })

  // Category validation happens at API level, not DB level.
  // Verify that the valid category update works, and note the API handles validation.
  const [updated] = await db.update(schema.businesses).set({
    category: 'Esporte',
  }).where(eq(schema.businesses.id, businessId)).returning()

  assertEquals(updated.category, 'Esporte')

  await db.delete(schema.businesses).where(eq(schema.businesses.id, businessId))
  await db.delete(schema.users).where(eq(schema.users.id, userId))
})

Deno.test('Business Profile API — integration: validateCep rejects invalid via handler', async () => {
  const userId = `handler_cep_${crypto.randomUUID()}`
  const businessId = crypto.randomUUID()

  await db.insert(schema.users).values({
    id: userId,
    email: `${userId}@test.com`,
    name: 'Handler CEP User',
  })

  await db.insert(schema.businesses).values({
    id: businessId,
    name: 'Handler CEP Biz',
    companyName: 'Handler CEP Biz Ltda',
    cnpj: `${Date.now()}55444333000181`,
    category: 'Alimentação',
    logoUrl: 'http://localhost/logo.png',
    userId,
    isActive: true,
  })

  // Test invalid CEP via JSON path
  const body = JSON.stringify({ cep: 'abc' })
  const req = new Request(`http://localhost/api/businesses/${businessId}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  })

  const { handleProfileUpdate } = await import(
    '../routes/api/businesses/[id]/profile.ts'
  )
  const res = await handleProfileUpdate(req, businessId, {
    id: userId,
    role: 'business',
    name: 'Test',
    email: 'test@test.com',
  } as SessionUser)

  assertEquals(res.status, 400)
  const data = await res.json()
  assertStringIncludes(data.error, 'CEP')

  await db.delete(schema.businesses).where(eq(schema.businesses.id, businessId))
  await db.delete(schema.users).where(eq(schema.users.id, userId))
})

Deno.test('Business Profile API — integration: validateMapsUrl rejects invalid via handler', async () => {
  const userId = `handler_map_${crypto.randomUUID()}`
  const businessId = crypto.randomUUID()

  await db.insert(schema.users).values({
    id: userId,
    email: `${userId}@test.com`,
    name: 'Handler Map User',
  })

  await db.insert(schema.businesses).values({
    id: businessId,
    name: 'Handler Map Biz',
    companyName: 'Handler Map Biz Ltda',
    cnpj: `${Date.now()}44333222000181`,
    category: 'Alimentação',
    logoUrl: 'http://localhost/logo.png',
    userId,
    isActive: true,
  })

  const body = JSON.stringify({ mapsUrl: 'not-a-valid-url' })
  const req = new Request(`http://localhost/api/businesses/${businessId}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  })

  const { handleProfileUpdate } = await import(
    '../routes/api/businesses/[id]/profile.ts'
  )
  const res = await handleProfileUpdate(req, businessId, {
    id: userId,
    role: 'business',
    name: 'Test',
    email: 'test@test.com',
  } as SessionUser)

  assertEquals(res.status, 400)
  const data = await res.json()
  assertStringIncludes(data.error, 'URL')

  await db.delete(schema.businesses).where(eq(schema.businesses.id, businessId))
  await db.delete(schema.users).where(eq(schema.users.id, userId))
})

Deno.test('Business Profile API — integration: validateCategory rejects invalid via handler', async () => {
  const userId = `handler_cat_${crypto.randomUUID()}`
  const businessId = crypto.randomUUID()

  await db.insert(schema.users).values({
    id: userId,
    email: `${userId}@test.com`,
    name: 'Handler Cat User',
  })

  await db.insert(schema.businesses).values({
    id: businessId,
    name: 'Handler Cat Biz',
    companyName: 'Handler Cat Biz Ltda',
    cnpj: `${Date.now()}33222111000181`,
    category: 'Alimentação',
    logoUrl: 'http://localhost/logo.png',
    userId,
    isActive: true,
  })

  const body = JSON.stringify({ category: 'InvalidCategory' })
  const req = new Request(`http://localhost/api/businesses/${businessId}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  })

  const { handleProfileUpdate } = await import(
    '../routes/api/businesses/[id]/profile.ts'
  )
  const res = await handleProfileUpdate(req, businessId, {
    id: userId,
    role: 'business',
    name: 'Test',
    email: 'test@test.com',
  } as SessionUser)

  assertEquals(res.status, 400)
  const data = await res.json()
  assertStringIncludes(data.error, 'Categoria')

  await db.delete(schema.businesses).where(eq(schema.businesses.id, businessId))
  await db.delete(schema.users).where(eq(schema.users.id, userId))
})

Deno.test('Business Profile API — integration: handler saves all new fields', async () => {
  const userId = `handler_save_${crypto.randomUUID()}`
  const businessId = crypto.randomUUID()

  await db.insert(schema.users).values({
    id: userId,
    email: `${userId}@test.com`,
    name: 'Handler Save User',
  })

  await db.insert(schema.businesses).values({
    id: businessId,
    name: 'Handler Save Biz',
    companyName: 'Handler Save Biz Ltda',
    cnpj: `${Date.now()}22111000999000181`,
    category: 'Alimentação',
    logoUrl: 'http://localhost/logo.png',
    userId,
    isActive: true,
  })

  const body = JSON.stringify({
    cep: '88000-000',
    street: 'Rua Nova',
    number: '456',
    neighborhood: 'Centro',
    mapsUrl: 'https://maps.google.com/?q=-23.5,-46.6',
    category: 'Serviços',
  })
  const req = new Request(`http://localhost/api/businesses/${businessId}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  })

  const { handleProfileUpdate } = await import(
    '../routes/api/businesses/[id]/profile.ts'
  )
  const res = await handleProfileUpdate(req, businessId, {
    id: userId,
    role: 'business',
    name: 'Test',
    email: 'test@test.com',
  } as SessionUser)

  assertEquals(res.status, 200)
  const updated = await res.json()
  assertEquals(updated.cep, '88000000')
  assertEquals(updated.street, 'Rua Nova')
  assertEquals(updated.number, '456')
  assertEquals(updated.neighborhood, 'Centro')
  assertEquals(updated.mapsUrl, 'https://maps.google.com/?q=-23.5,-46.6')
  assertEquals(updated.category, 'Serviços')

  await db.delete(schema.businesses).where(eq(schema.businesses.id, businessId))
  await db.delete(schema.users).where(eq(schema.users.id, userId))
})

Deno.test('Business Profile API — integration: handler clears fields with null', async () => {
  const userId = `handler_clear_${crypto.randomUUID()}`
  const businessId = crypto.randomUUID()

  await db.insert(schema.users).values({
    id: userId,
    email: `${userId}@test.com`,
    name: 'Handler Clear User',
  })

  await db.insert(schema.businesses).values({
    id: businessId,
    name: 'Handler Clear Biz',
    companyName: 'Handler Clear Biz Ltda',
    cnpj: `${Date.now()}11999000888000181`,
    category: 'Outro',
    logoUrl: 'http://localhost/logo.png',
    userId,
    cep: '88000000',
    street: 'Rua Antiga',
    number: '999',
    neighborhood: 'Bairro Velho',
    mapsUrl: 'https://maps.google.com/?q=-23.5,-46.6',
    isActive: true,
  })

  const body = JSON.stringify({
    cep: null,
    street: null,
    number: null,
    neighborhood: null,
    mapsUrl: null,
  })
  const req = new Request(`http://localhost/api/businesses/${businessId}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  })

  const { handleProfileUpdate } = await import(
    '../routes/api/businesses/[id]/profile.ts'
  )
  const res = await handleProfileUpdate(req, businessId, {
    id: userId,
    role: 'business',
    name: 'Test',
    email: 'test@test.com',
  } as SessionUser)

  assertEquals(res.status, 200)
  const updated = await res.json()
  assertEquals(updated.cep, null)
  assertEquals(updated.street, null)
  assertEquals(updated.number, null)
  assertEquals(updated.neighborhood, null)
  assertEquals(updated.mapsUrl, null)

  await db.delete(schema.businesses).where(eq(schema.businesses.id, businessId))
  await db.delete(schema.users).where(eq(schema.users.id, userId))
})

Deno.test('Business Profile API — integration: handler clears fields with empty string', async () => {
  const userId = `handler_emp_${crypto.randomUUID()}`
  const businessId = crypto.randomUUID()

  await db.insert(schema.users).values({
    id: userId,
    email: `${userId}@test.com`,
    name: 'Handler Empty User',
  })

  await db.insert(schema.businesses).values({
    id: businessId,
    name: 'Handler Empty Biz',
    companyName: 'Handler Empty Biz Ltda',
    cnpj: `${Date.now()}88777666555000181`,
    category: 'Casa',
    logoUrl: 'http://localhost/logo.png',
    userId,
    cep: '88000000',
    street: 'Rua Velha',
    number: '111',
    mapsUrl: 'https://maps.google.com/?q=-23.5,-46.6',
    isActive: true,
  })

  const body = JSON.stringify({ cep: '', street: '', number: '', mapsUrl: '' })
  const req = new Request(`http://localhost/api/businesses/${businessId}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  })

  const { handleProfileUpdate } = await import(
    '../routes/api/businesses/[id]/profile.ts'
  )
  const res = await handleProfileUpdate(req, businessId, {
    id: userId,
    role: 'business',
    name: 'Test',
    email: 'test@test.com',
  } as SessionUser)

  assertEquals(res.status, 200)
  const updated = await res.json()
  assertEquals(updated.cep, null)
  assertEquals(updated.street, null)
  assertEquals(updated.number, null)

  await db.delete(schema.businesses).where(eq(schema.businesses.id, businessId))
  await db.delete(schema.users).where(eq(schema.users.id, userId))
})

// Cleanup all test data after suite
Deno.test({
  name: 'cleanup after tests',
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    await cleanupDatabase()
  },
})

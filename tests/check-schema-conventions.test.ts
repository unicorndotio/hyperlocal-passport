import {
  assertEquals,
  assertStringIncludes,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { validateSchema } from '../scripts/check-schema-conventions.ts'

// ── Helpers ──

function violationsOf(content: string) {
  return validateSchema(content)
}

// ── Check 1: PK type ──

Deno.test('PK type: app table with text("id") fails', () => {
  const schema = `
import { pgTable, text } from 'drizzle-orm/pg-core'
export const foo = pgTable('foo', {
  id: text('id').primaryKey(),
  name: text('name'),
})
`
  const v = violationsOf(schema)
  assertEquals(v.length, 1)
  assertStringIncludes(v[0].message, "Table 'foo' uses text('id')")
  assertStringIncludes(v[0].rule, 'PK type')
})

Deno.test('PK type: app table with uuid("id").defaultRandom() passes', () => {
  const schema = `
import { pgTable, text, uuid } from 'drizzle-orm/pg-core'
export const foo = pgTable('foo', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
})
`
  const v = violationsOf(schema)
  assertEquals(v.length, 0)
})

Deno.test('PK type: Better Auth user table excluded', () => {
  const schema = `
import { pgTable, text } from 'drizzle-orm/pg-core'
export const users = pgTable('user', {
  id: text('id').primaryKey(),
  email: text('email'),
})
`
  const v = violationsOf(schema)
  const pkViolations = v.filter((x) => x.rule === 'PK type')
  assertEquals(pkViolations.length, 0)
})

Deno.test('PK type: Better Auth session table excluded', () => {
  const schema = `
import { pgTable, text } from 'drizzle-orm/pg-core'
export const session = pgTable('session', {
  id: text('id').primaryKey(),
  token: text('token'),
})
`
  const v = violationsOf(schema)
  const pkViolations = v.filter((x) => x.rule === 'PK type')
  assertEquals(pkViolations.length, 0)
})

Deno.test('PK type: Better Auth account table excluded', () => {
  const schema = `
import { pgTable, text } from 'drizzle-orm/pg-core'
export const account = pgTable('account', {
  id: text('id').primaryKey(),
  providerId: text('provider_id'),
})
`
  const v = violationsOf(schema)
  const pkViolations = v.filter((x) => x.rule === 'PK type')
  assertEquals(pkViolations.length, 0)
})

Deno.test('PK type: Better Auth verification table excluded', () => {
  const schema = `
import { pgTable, text } from 'drizzle-orm/pg-core'
export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier'),
})
`
  const v = violationsOf(schema)
  const pkViolations = v.filter((x) => x.rule === 'PK type')
  assertEquals(pkViolations.length, 0)
})

Deno.test('PK type: feedEvents excluded', () => {
  const schema = `
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
export const feedEvents = pgTable('feed_events', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
})
`
  const v = violationsOf(schema)
  const pkViolations = v.filter((x) => x.rule === 'PK type')
  assertEquals(pkViolations.length, 0)
})

Deno.test('PK type: multiple app tables — all must use uuid', () => {
  const schema = `
import { pgTable, text, uuid } from 'drizzle-orm/pg-core'
export const foo = pgTable('foo', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
})
export const bar = pgTable('bar', {
  id: text('id').primaryKey(),
  name: text('name'),
})
export const baz = pgTable('baz', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
})
`
  const v = violationsOf(schema)
  const pkViolations = v.filter((x) => x.rule === 'PK type')
  assertEquals(pkViolations.length, 1)
  assertStringIncludes(pkViolations[0].message, "Table 'bar'")
})

// ── Check 2: Timestamp timezone ──

Deno.test('Timestamp: bare timestamp("col") fails', () => {
  const schema = `
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
export const foo = pgTable('foo', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
`
  const v = violationsOf(schema)
  const tsViolations = v.filter((x) => x.rule === 'Timestamp timezone')
  assertEquals(tsViolations.length, 1)
  assertStringIncludes(tsViolations[0].message, 'created_at')
  assertStringIncludes(tsViolations[0].message, 'missing withTimezone')
})

Deno.test('Timestamp: timestamp("col", { withTimezone: true }) passes', () => {
  const schema = `
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
export const foo = pgTable('foo', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
`
  const v = violationsOf(schema)
  const tsViolations = v.filter((x) => x.rule === 'Timestamp timezone')
  assertEquals(tsViolations.length, 0)
})

Deno.test('Timestamp: drizzle-orm import line is skipped', () => {
  const schema = `
import { timestamp } from 'drizzle-orm/pg-core'
export const foo = pgTable('foo', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
`
  const v = violationsOf(schema)
  const tsViolations = v.filter((x) => x.rule === 'Timestamp timezone')
  assertEquals(tsViolations.length, 0)
})

Deno.test('Timestamp: multiple bare timestamps on different lines', () => {
  const schema = `
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
export const foo = pgTable('foo', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
`
  const v = violationsOf(schema)
  const tsViolations = v.filter((x) => x.rule === 'Timestamp timezone')
  assertEquals(tsViolations.length, 2)
})

// ── Check 3: FK onDelete ──

Deno.test('FK: .references() without onDelete fails', () => {
  const schema = `
import { pgTable, text, uuid } from 'drizzle-orm/pg-core'
export const users = pgTable('user', {
  id: text('id').primaryKey(),
})
export const foo = pgTable('foo', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => users.id),
})
`
  const v = violationsOf(schema)
  const fkViolations = v.filter((x) => x.rule === 'FK onDelete')
  assertEquals(fkViolations.length, 1)
  assertStringIncludes(fkViolations[0].message, 'missing onDelete')
})

Deno.test('FK: .references() with onDelete passes', () => {
  const schema = `
import { pgTable, text, uuid } from 'drizzle-orm/pg-core'
export const users = pgTable('user', {
  id: text('id').primaryKey(),
})
export const foo = pgTable('foo', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
})
`
  const v = violationsOf(schema)
  const fkViolations = v.filter((x) => x.rule === 'FK onDelete')
  assertEquals(fkViolations.length, 0)
})

Deno.test('FK: multi-line .references() with onDelete passes', () => {
  const schema = `
import { pgTable, text, uuid } from 'drizzle-orm/pg-core'
export const users = pgTable('user', {
  id: text('id').primaryKey(),
})
export const foo = pgTable('foo', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(
    () => users.id,
    { onDelete: 'cascade' },
  ),
})
`
  const v = violationsOf(schema)
  const fkViolations = v.filter((x) => x.rule === 'FK onDelete')
  assertEquals(fkViolations.length, 0)
})

// ── Combined: valid schema passes all checks ──

Deno.test('Combined: schema with all conventions satisfied', () => {
  const schema = `
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
export const users = pgTable('user', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
export const businesses = pgTable('businesses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
export const feedEvents = pgTable('feed_events', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
})
`
  const v = violationsOf(schema)
  assertEquals(v.length, 0)
})

Deno.test('Combined: schema with multiple violations', () => {
  const schema = `
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
export const users = pgTable('user', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
export const businesses = pgTable('businesses', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
`
  const v = violationsOf(schema)
  assertEquals(v.length, 4)
  const rules = v.map((x) => x.rule)
  assertEquals(rules.includes('PK type'), true)
  assertEquals(rules.includes('Timestamp timezone'), true)
  assertEquals(rules.includes('FK onDelete'), true)
})

// ── Exit code behavior (validateSchema returns violations) ──

Deno.test('Script exits 0 on pass', async () => {
  const cmd = new Deno.Command('deno', {
    args: ['run', '-A', 'scripts/check-schema-conventions.ts'],
    stdout: 'piped',
    stderr: 'piped',
  })
  const output = await cmd.output()
  assertEquals(output.code, 0)
})

Deno.test('validateSchema returns violations on non-compliant schema', () => {
  const schema = `
import { pgTable, text } from 'drizzle-orm/pg-core'
export const foo = pgTable('foo', {
  id: text('id').primaryKey(),
  name: text('name'),
})
`
  const v = validateSchema(schema)
  assertEquals(v.length > 0, true)
})

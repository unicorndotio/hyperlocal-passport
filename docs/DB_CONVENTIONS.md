# Database Conventions

This guide documents the schema conventions enforced by
`scripts/check-schema-conventions.ts` and `deno task check`. All new tables and
schema changes must comply.

---

## 1. Primary Key Convention

Every **app-owned** table must use a UUID primary key:

```ts
id: uuid('id').primaryKey().defaultRandom(),
```

**Better Auth tables** (`user`, `session`, `account`, `verification`) keep
`text('id')` because the Better Auth adapter manages them.

**Materialized view mappings** (`feed_events`) use `text('id')` as a read-only
projection of the underlying MV.

```ts
// App-owned (use uuid)
export const businesses = pgTable('businesses', {
  id: uuid('id').primaryKey().defaultRandom(),
  // ...
})

// Better Auth (keep text)
export const users = pgTable('user', {
  id: text('id').primaryKey(),
  // ...
})

// MV mapping (keep text)
export const feedEvents = pgTable('feed_events', {
  id: text('id').primaryKey(),
  // ...
})
```

**Why:** UUID PKs prevent ID enumeration, work across distributed systems, and
eliminate the need for sequential ID management.

---

## 2. Timestamp Policy

Every `timestamp(` column **must** include `{ withTimezone: true }`:

```ts
createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
```

Columns that span multiple lines (common with `deno fmt`) must still include
the option:

```ts
accessTokenExpiresAt: timestamp('access_token_expires_at', {
  withTimezone: true,
}),
```

**Why:** PostgreSQL `timestamp` without timezone silently discards offset
information. With timezone, the database stores the full instant and returns it
consistently regardless of server timezone.

**`$onUpdate` for `updated_at`:**

When using typed Drizzle columns, use `$onUpdate` to auto-set `updated_at`:

```ts
updatedAt: timestamp('updated_at', { withTimezone: true }).notNull()
  .defaultNow().$onUpdate(() => new Date()),
```

---

## 3. Foreign Key Cascade Strategy

Every `.references()` call **must** include an explicit `onDelete` action:

```ts
userId: text('user_id').references(() => users.id, {
  onDelete: 'cascade',
}),
```

### Cascade vs Restrict

| Pattern | `onDelete` | Rationale |
|---------|-----------|-----------|
| **Ownership chains** — parent owns child | `'cascade'` | Deleting the parent should remove dependent records |
| **Audit trails** — transactional references | `'restrict'` | Prevents accidental deletion of records with financial/historical value |

**Ownership cascade examples:**
- `businesses.user_id` → `cascade` (user owns business)
- `coupons.business_id` → `cascade` (business owns coupon)
- `redemptions.coupon_id` → `cascade` (coupon owns redemption)
- `merchant_posts.business_id` → `cascade` (business owns post)

**Audit restrict examples:**
- `transactions.redemption_id` → `restrict` (preserve transaction history)
- `transactions.coupon_id` → `restrict`
- `transactions.business_id` → `restrict`
- `transactions.user_id` → `restrict`
- `signals.user_id` → `restrict`

**Why explicit:** Omitting `onDelete` defaults to `NO ACTION` in PostgreSQL,
which can cause unexpected constraint violations during deletion. Explicit
actions make the behavior intentional and self-documenting.

---

## 4. Index Guidelines

### Naming

All indexes follow the pattern `idx_<table>_<columns>`:

```ts
index('idx_businesses_user_id').on(table.userId),
index('idx_redemptions_user_id_status').on(table.userId, table.status),
```

### When to add indexes

- **FK join columns** — any column used in `.innerJoin()` or `.leftJoin()`
- **Filtered queries** — columns used in `.where()` clauses
- **Unique constraints** — use `.unique()` instead of a manual index

### Current index inventory

| Table | Index | Columns |
|-------|-------|---------|
| `businesses` | `idx_businesses_user_id` | `user_id` |
| `coupons` | `idx_coupons_business_id` | `business_id` |
| `redemptions` | `idx_redemptions_user_coupon_month` | `user_id, coupon_id, redeemed_at` |
| `redemptions` | `idx_redemptions_coupon_id` | `coupon_id` |
| `redemptions` | `idx_redemptions_user_id_status` | `user_id, status` |
| `transactions` | `idx_transactions_coupon_id` | `coupon_id` |
| `transactions` | `idx_transactions_business_id` | `business_id` |
| `transactions` | `idx_transactions_user_id` | `user_id` |
| `transactions` | `idx_transactions_redemption_id` | `redemption_id` |
| `signals` | `idx_signals_user_id` | `user_id` |
| `signals` | `idx_signals_status` | `status` |
| `merchant_posts` | `idx_merchant_posts_business_id` | `business_id` |
| `file_metadata` | `idx_file_metadata_user_id` | `user_id` |
| `verification` | `idx_verification_identifier` | `identifier` |

---

## 5. Query Patterns

### Always use typed Drizzle

Use `db.select().from()` with Drizzle operators — never raw SQL in `lib/`:

```ts
import { db } from './db.ts'
import { businesses } from '../db/schema.ts'
import { eq, and, desc } from 'drizzle-orm'

// Correct
const rows = await db.select()
  .from(businesses)
  .where(eq(businesses.userId, userId))
  .orderBy(desc(businesses.createdAt))

// Wrong — raw SQL
const rows = await db.execute(sql`SELECT * FROM businesses WHERE user_id = ${userId}`)
```

### Operators

- `eq()` — equality
- `and()` / `or()` — boolean logic
- `lt()`, `gte()` — range filters
- `desc()`, `asc()` — ordering
- `inArray()` — IN clause

### Exceptions

Raw SQL (`db.execute(sql\`...\`)`) is permitted only for:
- DDL operations (`REFRESH MATERIALIZED VIEW CONCURRENTLY`)
- UPSERT with `onConflictDoUpdate()` using `sql` template for increments

### Seed data

Use `crypto.randomUUID()` for deterministic FK references within seed scripts:

```ts
const bizId = crypto.randomUUID()
await db.insert(schema.businesses).values({
  id: bizId,
  userId: businessUserId,
  name: 'Café Central',
})
```

---

## 6. Quick Reference

| Convention | Rule | Check |
|-----------|------|-------|
| **PK type** | App tables: `uuid('id').defaultRandom()` | Better Auth + feedEvents excluded |
| **Timestamps** | Always `{ withTimezone: true }` | All `timestamp(` calls |
| **Foreign keys** | Always `{ onDelete: 'cascade' \| 'restrict' }` | All `.references()` calls |
| **Index naming** | `idx_<table>_<columns>` | Manual review |
| **Query style** | Typed Drizzle, no raw SQL in `lib/` | Manual review |
| **Seed IDs** | `crypto.randomUUID()` | Manual review |

### Adding a new table (checklist)

1. PK: `id: uuid('id').primaryKey().defaultRandom()`
2. Timestamps: `timestamp('col', { withTimezone: true })`
3. FKs: `.references(() => parent.id, { onDelete: 'cascade' })` or `'restrict'`
4. Indexes: `index('idx_<table>_<col>').on(table.col)` for FK columns
5. Run `deno task check` to validate

---

## CI Enforcement

`deno task check` runs `scripts/check-schema-conventions.ts` before format,
lint, and type-check. The script reads `db/schema.ts` as text and applies three
regex rules. Violations produce actionable error messages and a non-zero exit
code.

```bash
deno task check  # runs conventions script + fmt + lint + type-check
```

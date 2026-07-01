Looking at the TechSpec, this was a deliberate choice driven by two constraints:

1. Better Auth compatibility — Better Auth generates its own IDs for user,
   session, account, and verification records. Its default ID generator produces
   random strings (not UUIDs), and the Drizzle adapter expects text columns to
   accept whatever format Better Auth emits. Using uuid columns would require
   configuring Better Auth to emit UUID-formatted strings, which adds coupling.
2. Consistency across all tables — Rather than having some tables use uuid
   (app-owned records) and others use text (auth-owned records), the schema uses
   text everywhere. This avoids a mixed type situation where, for example,
   redemptions.userId references users.id but one is uuid and the other is text.

The trade-off: you lose the database-level guarantee that IDs are valid UUIDs,
and you lose the auto-generation that uuid_generate_v4() or gen_random_uuid()
provides in PostgreSQL. App-owned tables compensate with crypto.randomUUID() via
$defaultFn() (you can see this on merchantPosts.id), but most other tables rely
on the caller to supply a valid ID.

If you want to tighten this up without breaking Better Auth compatibility, the
practical option is to use text on Better Auth tables (user, session, account,
verification) and switch app-owned tables (businesses, coupons, redemptions,
transactions, signals, etc.) to uuid with defaultRandom(). That gives you
DB-level UUID enforcement where you control the ID generation, while keeping
text where Better Auth controls it.

# Database Schema Review — Drizzle ORM & PostgreSQL Best Practices

A detailed review of
[schema.ts](file:///Users/dev/nodo/passport/deno/db/schema.ts) against best
practices for Drizzle ORM and PostgreSQL.

---

## 1. Timezone Handling (High Recommendation)

### Issue

All timestamp columns in the schema are declared as `timestamp()` without
parameters:

```ts
createdAt: timestamp("created_at").notNull().defaultNow();
```

By default, this compiles to PostgreSQL `TIMESTAMP WITHOUT TIME ZONE`.

### Why this matters

Storing timestamps without timezones can lead to subtle bugs when servers,
databases, and client devices run in different time zones (e.g. Deno running in
UTC, PostgreSQL running in UTC, but residents accessing from `America/Sao_Paulo`
in Brazil).

### Best Practice

Always use `timestamp(..., { withTimezone: true })` (which compiles to
`TIMESTAMPTZ` in PostgreSQL) for absolute points in time:

```ts
createdAt: timestamp("created_at", { withTimezone: true }).notNull()
  .defaultNow();
```

---

## 2. Referential Integrity & Delete Cascades (Medium Recommendation)

### Issue

Many custom relations lack explicit `onDelete` actions:

```ts
// db/schema.ts
userId: text("user_id").notNull().references(() => users.id);
```

Without an explicit `onDelete` strategy, PostgreSQL defaults to
`NO ACTION`/`RESTRICT`. If a user is deleted, any query trying to delete that
user will fail with a foreign key violation if they have an associated business,
redemption, or transaction.

### Best Practice

Define explicit referential actions on all reference constraints depending on
the domain rules:

- **Cascade**: If the parent is deleted, delete the child (e.g. `merchantPosts`
  when the `business` is deleted).
- **Set Null / Restrict**: If deletion should be blocked or handled gracefully.

```ts
userId: text("user_id").notNull().references(() => users.id, {
  onDelete: "cascade",
});
```

---

## 3. Indexing Strategy Improvements (Medium Recommendation)

While the schema has good indexes, a few queries could benefit from additional
optimization:

### Better Auth Verification Index

The `verification` table does not have any indexes defined:

```ts
export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  ...
})
```

- **Best Practice**: Verification lookups typically search by `identifier` and
  `value`. Adding a composite index on `(identifier, value)` or at least an
  index on `identifier` will speed up token validation.

### Resident Redemptions Querying

`redemptions` has `idxUserCouponMonth` composite index on
`(userId, couponId, redeemedAt)`.

- **Best Practice**: When displaying a resident's active codes via
  `GET /api/users/me/redemptions`, the query filters by `userId` and
  `status = 'active'`. A composite index on `(user_id, status)` would optimize
  this lookup.

---

## 4. Primary Key Data Types & Defaults (Low Recommendation)

### Issue

UUID keys are stored as `text('id')` and some use JS-side generation:

```ts
id: text("id").primaryKey();
```

### Best Practice

For PostgreSQL-native performance and storage efficiency, UUIDs are best stored
in a `uuid` column type. PostgreSQL can also generate UUIDs natively using
`.defaultRandom()` (compiled to `gen_random_uuid()` in Postgres 13+):

```ts
id: uuid("id").primaryKey().defaultRandom();
```

_Note: Better Auth expects `text` columns for its tables, so leaving `users`,
`session`, `account`, and `verification` as `text` is correct to maintain
compatibility with the Better Auth adapter._

---

## Summary of Suggested Drizzle Code Refactoring

Here is a visual representation of how the schema definitions can be hardened:

```diff
export const users = pgTable('user', {
  id: text('id').primaryKey(),
  ...
- createdAt: timestamp('created_at').notNull().defaultNow(),
+ createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const businesses = pgTable('businesses', {
  id: text('id').primaryKey(),
- userId: text('user_id').notNull().references(() => users.id),
+ userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  ...
})
```

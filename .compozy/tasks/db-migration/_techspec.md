# TechSpec: Database Migration — Deno KV to PostgreSQL with Drizzle ORM

## Executive Summary

Migrate Passaporte Local's data layer from Deno KV to PostgreSQL 18 Alpine using Drizzle ORM. A single `drizzle-kit generate` run produces the initial migration from a centralized `src/db/schema.ts` file. The migration is **schema-first with drop-and-recreate**: existing KV data is discarded, and the seed script is rewritten for Drizzle inserts.

The Drizzle client connects via `pg.Pool` (1–10 connections, configurable). Better Auth switches from the custom KV adapter to its official Drizzle adapter. All route handlers, islands, and tests replace KV calls with Drizzle queries. Atomic KV transactions become Drizzle transactions. Rate limiting is removed for V1. The `coupon_analytics` table uses pre-aggregated counters with atomic SQL increments; the monthly user cap is computed via `COUNT` on the `redemptions` table.

All three services (web app, PostgreSQL, Drizzle Gateway) run under Docker Compose. Tests use a dedicated `passport_test` database with per-file cleanup. The `--unstable-kv` flag is removed from all tasks and the Docker CMD.

**Key trade-off:** Short-term friction of rewriting the data layer vs. long-term benefits of relational queries, schema migrations, and production stability. No feature changes — strictly an infrastructure replacement.

---

## System Architecture

### Component Overview

```
┌──────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│   Web App (Deno) │────▶│  PostgreSQL 18 Alpine │     │  Drizzle Gateway     │
│   port 8000      │     │  port 5432            │     │  port 4983           │
│                  │     │  volume: pgdata       │     │  env: MASTERPASS     │
│   env: PG_CONNECTION     │                      │     │  volume: drizzle-store│
└──────────────────┘     └──────────────────────┘     └──────────────────────┘
         │                           │                           │
         └────── docker-compose ─────┴────── depends_on ─────────┘
```

**Web App (Deno/Fresh):**
- Drizzle ORM runtime via `npm:drizzle-orm` + `npm:pg`
- Single `db` instance from `lib/db.ts` (shared `pg.Pool`)
- Better Auth with `@better-auth/drizzle` adapter
- Route handlers call Drizzle directly (no repository layer)

**PostgreSQL 18 Alpine (`postgres:18-alpine`):**
- Single `passport` database (plus `passport_test` for tests)
- Persistent volume `pgdata` for data survival across restarts
- Health check: `pg_isready -U root -d passport`

**Drizzle Gateway:**
- Web UI at port 4983, protected by `MASTERPASS` env var
- Connects to the same PostgreSQL using its own connection string
- Persistent volume `drizzle-store` for Gateway's own data

### Data Flow

1. HTTP request → Fresh route handler → Drizzle query → `pg.Pool` → PostgreSQL
2. Atomic operations (redeem, validate, register) → Drizzle transaction → `pg.Pool` → PostgreSQL (all-or-nothing)
3. Analytics counters → atomic SQL increment on `coupon_analytics` row
4. File uploads → filesystem unchanged; metadata → `file_metadata` table
5. Auth (sign-up, sign-in, session) → Better Auth → Drizzle adapter → `user`, `session`, `account` tables

### Migration Phase Architecture

During the migration window (no new feature work), files are updated in place. The order of changes ensures `deno check` always passes at each commit boundary:

1. `lib/db.ts` created, `src/db/schema.ts` created, migration generated
2. Better Auth switched to Drizzle adapter (auth still works)
3. Route handlers migrated one by one (each commit keeps the app runnable with remaining KV calls)
4. `lib/kv.ts` and `lib/kv-adapter.ts` deleted at the end

---

## Implementation Design

### Core Interfaces

#### `lib/db.ts` — Drizzle Client Singleton

```ts
import { drizzle } from 'npm:drizzle-orm/node-postgres@0.38.2'
import { Pool } from 'npm:pg@8.13.1'
import * as schema from '../src/db/schema.ts'

const pool = new Pool({
  connectionString: Deno.env.get('PG_CONNECTION'),
  max: 10,
  min: 1,
})

export const db = drizzle({ client: pool, schema })
```

#### `src/db/schema.ts` — Centralized Schema

All tables defined with `pgTable` from `drizzle-orm/pg-core`. Relations use Drizzle's `relations` API for relational queries.

```ts
import {
  pgTable, text, integer, timestamp, boolean, jsonb, uniqueIndex, index
} from 'npm:drizzle-orm/pg-core@0.38.2'

export const users = pgTable('user', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  // ... Better Auth required fields
  role: text('role').default('resident'),
  status: text('status').default('pending'),
  cpf: text('cpf'),
  name: text('name'),
  phone: text('phone'),
  address: text('address'),
  documents: jsonb('documents').default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const businesses = pgTable('businesses', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  companyName: text('company_name').notNull(),
  cnpj: text('cnpj').notNull().unique(),
  category: text('category').notNull(),
  description: text('description'),
  logoUrl: text('logo_url').notNull(),
  socialLinks: jsonb('social_links'),
  openingHours: jsonb('opening_hours'),
  isActive: boolean('is_active').notNull().default(false),
  hasSeenMerchantOnboarding: boolean('has_seen_merchant_onboarding').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const coupons = pgTable('coupons', {
  id: text('id').primaryKey(),
  businessId: text('business_id').notNull().references(() => businesses.id),
  title: text('title').notNull(),
  description: text('description'),
  behavior: jsonb('behavior').notNull(),
  restrictions: jsonb('restrictions').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const redemptions = pgTable('redemptions', {
  id: text('id').primaryKey(),    // short alphanumeric code
  couponId: text('coupon_id').notNull().references(() => coupons.id),
  businessId: text('business_id').notNull().references(() => businesses.id),
  userId: text('user_id').notNull().references(() => users.id),
  status: text('status').notNull().default('active'), // active | used | expired
  redeemedAt: timestamp('redeemed_at').notNull().defaultNow(),
  usedAt: timestamp('used_at'),
})

export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  redemptionId: text('redemption_id').notNull().references(() => redemptions.id),
  couponId: text('coupon_id').notNull().references(() => coupons.id),
  businessId: text('business_id').notNull().references(() => businesses.id),
  userId: text('user_id').notNull().references(() => users.id),
  totalAmountCents: integer('total_amount_cents').notNull(),
  discountAppliedCents: integer('discount_applied_cents').notNull(),
  finalAmountCents: integer('final_amount_cents').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
})

export const signals = pgTable('signals', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  category: text('category').notNull(),
  description: text('description'),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const couponAnalytics = pgTable('coupon_analytics', {
  id: text('id').primaryKey(),
  couponId: text('coupon_id').notNull().unique().references(() => coupons.id, { onDelete: 'cascade' }),
  views: integer('views').notNull().default(0),
  redemptions: integer('redemptions').notNull().default(0),
  validations: integer('validations').notNull().default(0),
})

export const fileMetadata = pgTable('file_metadata', {
  id: text('id').primaryKey(),
  filename: text('filename').notNull().unique(),
  userId: text('user_id'),
  isPublic: boolean('is_public').notNull().default(false),
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
})

// Better Auth tables
export const session = pgTable('session', { /* Better Auth schema */ })
export const account = pgTable('account', { /* Better Auth schema */ })
export const verification = pgTable('verification', { /* Better Auth schema */ })
```

#### Indexes

```sql
CREATE INDEX idx_redemptions_user_coupon_month
  ON redemptions(user_id, coupon_id, redeemed_at);
CREATE INDEX idx_redemptions_coupon_id ON redemptions(coupon_id);
CREATE INDEX idx_transactions_coupon_id ON transactions(coupon_id);
CREATE INDEX idx_transactions_business_id ON transactions(business_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_coupons_business_id ON coupons(business_id);
CREATE INDEX idx_businesses_user_id ON businesses(user_id);
CREATE INDEX idx_signals_user_id ON signals(user_id);
CREATE INDEX idx_signals_status ON signals(status);
```

### Data Models

All current TypeScript interfaces (`Business`, `Coupon`, `Redemption`, `Transaction`, `BehaviorType`, `CouponRestrictions`, `SocialLinks`, `OpeningHours`) remain unchanged — they are used for type-checking API request/response payloads. The database schema mirrors these interfaces with appropriate column types. `jsonb` columns store nested objects (behavior, restrictions, socialLinks, openingHours, documents).

### API Endpoints

No API endpoints change. Every route handler's input/output contract is preserved. Only the internal data access mechanism changes:

- `kv.get(['coupons', id])` → `db.select().from(coupons).where(eq(coupons.id, id))`
- `kv.atomic().check(...).set(...)` → `db.transaction(async (tx) => { ... })`
- `kv.list({ prefix: ['coupons'] })` → `db.select().from(coupons)`
- Adapter CRUD (`findOne`, `findMany`, etc.) → direct Drizzle queries (for non-auth models) or Better Auth Drizzle adapter (for auth models)

---

## Integration Points

### Better Auth

| Aspect | Current | Target |
|--------|---------|--------|
| Adapter | Custom KV adapter (`lib/kv-adapter.ts`) | `import { drizzleAdapter } from 'better-auth/adapters/drizzle'` |
| Tables | KV keys `['user', id]`, `['session', id]`, `['account', id]` | PostgreSQL `user`, `session`, `account`, `verification` tables |
| Additional fields | `role`, `status` as `additionalFields` | `role`, `status` columns on `user` table |
| Indexed lookups | Manual secondary index keys | PostgreSQL unique constraints + indexes |

Better Auth expects specific table names (`user`, `session`, `account`, `verification`) with specific column names. The schema must match the adapter's expectations exactly. We use `drizzleAdapter(db)` with the model definitions from `better-auth/adapters/drizzle`.

### Drizzle Gateway

- Authentication: `MASTERPASS` environment variable (set in docker-compose.yml)
- Connection: Gateway reads `PG_CONNECTION` from its own environment
- No data mutations from the app — Gateway is admin-only UI

### File Storage

Unchanged. Files remain on the local filesystem under `UPLOADS_DIR`. Only `file_metadata` moves from KV to PostgreSQL. The `uploadFile` and `deleteFile` functions in `lib/storage.ts` replace `kv.set`/`kv.delete` with Drizzle `db.insert`/`db.delete`.

---

## Impact Analysis

| Component | Impact Type | Description | Action |
|-----------|-------------|-------------|--------|
| `lib/kv.ts` | Deleted | KV singleton initialization | Remove file; create `lib/db.ts` |
| `lib/kv-adapter.ts` | Deleted | Better Auth KV adapter | Remove file; replace with Drizzle adapter |
| `lib/auth.ts` | Modified | Switches adapter to Drizzle | Update `database` config |
| `lib/analytics.ts` | Modified | Replaces KV key builders with Drizzle queries | Rewrite to use `db.update(analytics).set(...)` |
| `lib/storage.ts` | Modified | Replaces `kv.set/delete` with Drizzle | Replace KV calls |
| `lib/db.ts` | New | Drizzle client singleton | Create file |
| `src/db/schema.ts` | New | All table definitions | Create file |
| `drizzle.config.ts` | New | Drizzle Kit config | Create file |
| `routes/api/coupons/[id]/redeem.ts` | Modified | KV → Drizzle transaction | Rewrite atomic block |
| `routes/api/transactions/validate.ts` | Modified | KV → Drizzle transaction | Rewrite atomic block |
| `routes/api/users/register.ts` | Modified | KV → Drizzle | Rewrite |
| `routes/api/businesses/*` | Modified | KV → Drizzle | Rewrite |
| `routes/api/admin/*` | Modified | KV → Drizzle | Rewrite |
| `routes/api/signals/*` | Modified | KV → Drizzle | Rewrite; remove rate limiting |
| All route handlers | Modified | Top-level KV import replaced | Import `db` instead of `kv` |
| `seed.ts` | Modified | KV → Drizzle inserts | Rewrite |
| `main.ts` | Modified | Remove KV init, add PostgreSQL wait | Update startup |
| `deno.json` | Modified | Remove `--unstable-kv`, add Drizzle tasks | Update |
| `Dockerfile` | Modified | Remove `--unstable-kv` from CMD | Update CMD |
| `docker-compose.yml` | Modified | Add PostgreSQL + Gateway services | Update |
| `.env.example` | Modified | Add `PG_CONNECTION`, remove `DENO_KV_PATH` | Update |
| Test files (34) | Modified | KV → Drizzle, use test database | Rewrite per test strategy |
| Rate limit modules | Deleted | Removed for V1 | Remove files and references |

---

## Testing Approach

### Unit Tests

Same strategy as before: pure functions (validation, formatting, calculation) are tested without database interaction. No change needed for `lib/coupon.ts`, `lib/coupon-engine.ts`, `lib/business.ts` tests.

### Integration Tests

**Database:** Dedicated `passport_test` database. Schema is reset before each test run.

**Per-test cleanup:** Each test file truncates the tables it uses in a `beforeEach` hook.

```ts
import { db } from '../lib/db.ts'
import * as schema from '../src/db/schema.ts'

Deno.test('coupon redemption', async (t) => {
  await db.delete(schema.redemptions)
  await db.delete(schema.couponAnalytics)
  await db.delete(schema.coupons)
  // ... test body using Drizzle queries directly
})
```

**Environment:** `PG_CONNECTION_TEST=postgresql://root:password@localhost:5433/passport_test`

**CI cleanup:** Before the full test suite, run: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` then re-apply migrations.

**Parallel safety:** Tests within a file run sequentially (Deno's default). Between files, each file gets its own cleanup, so they can run in parallel using Deno's `--parallel` flag.

**Existing test coverage preserved:** All 34 test files are updated to use Drizzle queries against PostgreSQL. KV-specific test helpers (e.g., `Deno.openKv(':memory:')` setup) are replaced with test database + per-file cleanup.

### Critical Scenarios

1. **Atomic redemption** — two concurrent requests for the same coupon/user: one succeeds, the other gets a 409. Verified with `db.transaction()` and serializable isolation.
2. **Monthly cap** — user reaches 2 redemptions/month, third request returns 400. Verified by inserting 2 redemptions then attempting a third.
3. **Concurrent validation** — two employees validate the same redemption code: first succeeds, second gets 409.
4. **Analytics counter** — after 3 views, 2 redemptions, 1 validation → `coupon_analytics` row has correct counts.
5. **Auth flow** — sign-up, sign-in, sign-out, session persistence across restarts.

---

## Development Sequencing

### Build Order

1. **Infrastructure** — `docker-compose.yml` updated, `drizzle.config.ts` created, PostgreSQL health check, `PG_CONNECTION` env var
2. **Schema** — `src/db/schema.ts` defined, `drizzle-kit generate` produces `0000_initial.sql`, `drizzle-kit migrate` creates tables
3. **Drizzle client** — `lib/db.ts` created, `main.ts` updated to initialize Drizzle (KV still works in parallel)
4. **Better Auth** — switch to Drizzle adapter in `lib/auth.ts`, verify sign-up/sign-in against PostgreSQL
5. **File metadata** — `lib/storage.ts` updated, `file_metadata` table used
6. **Route handlers** — migrate one domain at a time (businesses → coupons → redemptions → transactions → signals → admin → analytics)
7. **Seed script** — rewrite `seed.ts` to use Drizzle
8. **Tests** — update all 34 test files to use test database
9. **Cleanup** — delete `lib/kv.ts`, `lib/kv-adapter.ts`, remove `--unstable-kv` from all configs
10. **Verify** — full test suite pass, smoke test all endpoints via seed data

### Technical Dependencies

- `npm:drizzle-orm@0.38.2` — must work with Deno's npm compatibility layer
- `npm:drizzle-kit@0.30.0` — runs via `npx` (Node.js required on host), not as a Deno task
- `npm:pg@8.13.1` — PostgreSQL driver for Deno
- `npm:@better-auth/drizzle` — Better Auth Drizzle adapter
- `postgres:18-alpine` Docker image — must be available (pulled automatically)
- `drizzle-gateway` Docker image — must be available (pulled automatically)
- Docker must be installed on the developer machine (preexisting requirement)

---

## Monitoring and Observability

### Log Events

| Event | Level | Fields |
|-------|-------|--------|
| DB connection established | info | `poolSize`, `database` |
| DB connection failed | error | `error.message`, `connectionString` (masked) |
| Migration applied | info | `migrationName`, `tablesCreated` |
| Pool connection acquired | debug | `totalCount`, `idleCount`, `waitingCount` |
| Pool connection released | debug | `totalCount`, `idleCount` |

### Key Metrics

- Query execution time (logged if >100ms)
- Pool utilization (total vs. idle vs. waiting connections)
- Number of migration runs (should be 1 for initial, then per schema change)

### Alerting Thresholds

Not applicable for V1 development environment. When deployed for customer use, alert on:
- Pool connection wait time > 5 seconds
- Migration failures
- Database connection failures

---

## Technical Considerations

### Key Decisions

| Decision | Choice | Rationale | Trade-offs | Alternatives Rejected |
|----------|--------|-----------|------------|----------------------|
| Connection management | `pg.Pool` (1–10) | Handles concurrent requests efficiently; standard Drizzle+Deno pattern | Slightly more complex than single connection; pool consumes ~10MB per connection | Single client (serializes queries); PgBouncer (overkill for V1) |
| Analytics counters | Dedicated `coupon_analytics` table + event tables for drill-down | O(1) reads for dashboard; existing `redemptions`, `transactions` tables serve as event log | Counter drift possible | Separate counter table per metric (many COUNT queries); SQL COUNT only (no views table) |
| Test database | Dedicated `passport_test` database | No handler refactoring needed; simple setup | Test data persists between runs without explicit cleanup; manual DB creation step | Transaction-per-test (requires handler refactoring); Testcontainers (slow startup, Deno immaturity) |
| Rate limiting | Removed for V1 | No real users; reduces code complexity | No abuse protection until customer features PRD | PostgreSQL table (wasted effort); In-memory Map (resets on restart) |
| User coupon monthly count | SQL COUNT from `redemptions` table | Single source of truth; no redundant data | COUNT query slower than counter lookup | Dedicated `coupon_usage` table (redundant); Counter column on join table (syncing risk) |
| Coupon views tracking | Aggregated counter only | Simple, matches current behavior; no unbounded event table | No unique view tracking; no view timing data | Counter + event table (YAGNI, double writes) |

### Known Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Missed KV references cause 500 errors after migration | Medium | Systematic `grep -r "kv\."` audit; remove `kv` import and verify `deno check` passes each commit |
| Drizzle Kit incompatibility with Deno | Low | Run `drizzle-kit` via `npx` (Node.js), not as Deno task |
| Better Auth Drizzle adapter expects different column names/types | Medium | Read adapter docs before writing schema; use exact table schemas Better Auth expects |
| Test infrastructure complexity slows test suite | Medium | Keep per-file TRUNCATE strategy; avoid DROP/CREATE schema per test file |
| Concurrent redemption race conditions | Low | Drizzle `db.transaction()` with serializable isolation handles this |
| Team productivity dip during migration | Medium | Strict 10-day timeline; no feature work during migration window |

---

## Architecture Decision Records

- [ADR-001: Full Database Migration from Deno KV to PostgreSQL with Drizzle ORM](adrs/adr-001.md)
- [ADR-002: Schema-First, Drop and Recreate Data Migration Strategy](adrs/adr-002.md)
- [ADR-003: Docker Compose PostgreSQL with Drizzle Gateway Infrastructure](adrs/adr-003.md)
- [ADR-004: Drizzle Client Connection Strategy — Single Pool with pg Driver](adrs/adr-004.md)
- [ADR-005: Analytics Counters Model — Dedicated Table with Event-Based Sources](adrs/adr-005.md)
- [ADR-006: Test Database Strategy — Dedicated Test Database](adrs/adr-006.md)
- [ADR-007: Rate Limiting — Skipped for V1](adrs/adr-007.md)
- [ADR-008: User Coupon Usage — SQL COUNT from Redemptions Table](adrs/adr-008.md)
- [ADR-009: Coupon Views Tracking — Aggregated Counter Only for V1](adrs/adr-009.md)

# Passaporte Local — Database Migration to PostgreSQL with Drizzle ORM

## Overview

Passaporte Local is built on Deno KV — a key-value store that requires the `--unstable-kv` flag, has no migration tooling, no query capabilities beyond key lookups, and no interface for browsing or editing data directly. As the platform moves from admin and merchant features into end-user customer features, the data model will grow in complexity (orders, preferences, notifications, reviews), and these limitations become blockers rather than inconveniences.

**Problem:** Deno KV is explicitly unstable and not recommended for production. It lacks relational query capabilities, schema enforcement, migration tooling, and a data browsing UI. The custom KV adapter for Better Auth is additional maintenance burden. Continuing on KV means accepting technical debt that compounds with every new feature.

**Who it is for:** The development team maintaining the platform. Admins who need to inspect and fix data during support scenarios. Future end-users who depend on a stable, production-grade backend.

**Why it is valuable:** A production-ready database with schema migrations, type-safe queries, and a data UI eliminates a growing source of technical risk before customer features begin. It enables faster development of complex features (joins, aggregations, filtered queries) that are impractical on KV. It removes the `--unstable-kv` flag from the production deployment. Drizzle Gateway gives admins a convenient web interface for data troubleshooting without needing database CLI tools.

**Scope:** Migrate all data from Deno KV to PostgreSQL in a single coordinated effort. Replace the custom Better Auth KV adapter with the official Drizzle adapter. Define all table schemas as a single source of truth. Add PostgreSQL and Drizzle Gateway as Docker Compose services. Drop existing KV data (no production users — development data only, safe to recreate).

## Goals

- Eliminate all Deno KV usage from the codebase — zero `Deno.openKv()` calls remaining
- Define all database schemas in a single centralized file (`db/schema.ts`)
- Generate and apply a single initial migration that creates all tables
- Replace the custom Better Auth KV adapter with the official Drizzle adapter
- Add PostgreSQL and Drizzle Gateway Docker Compose services with health check dependency ordering
- Make the Drizzle Gateway web UI accessible at port 4983, protected by master password
- Update all route handlers, islands, and test files to use Drizzle queries instead of KV operations
- Update the seed script to work with Drizzle + PostgreSQL
- Remove `--unstable-kv` from Docker CMD and all run scripts
- Achieve 100% test pass rate after migration (all existing tests adapted to Drizzle)

## User Stories

### Developer

- As a developer, I want to define the entire database schema in TypeScript so that I get compile-time type safety and autocompletion for all queries.
- As a developer, I want to run `drizzle-kit generate` after schema changes so that I get SQL migration files that I can review and apply.
- As a developer, I want to write queries using Drizzle's query builder so that I catch type errors at compile time instead of runtime.
- As a developer, I want to use SQL joins and aggregations in queries so that I can implement features that require relational data (e.g., "show me all transactions by residents who redeemed coupon X").
- As a developer, I want to run tests against a database that I can reset between test runs so that tests are isolated and repeatable.
- As a developer, I want the Docker Compose setup to start PostgreSQL and Drizzle Gateway automatically so that I don't need to manage database servers manually.

### Admin

- As an admin, I want to open a web browser and browse all database tables so that I can inspect data during support scenarios.
- As an admin, I want to edit individual records through the web UI so that I can fix data issues without writing SQL queries.
- As an admin, I want the database UI to be protected by a password so that unauthorized users cannot access production data.

### Business Owner (indirect)

- As a business owner, I want the platform to be built on a production-grade database so that my data is safe and the platform remains available.
- As a business owner, I want new features to be developed faster so that the platform improves over time.

## Core Features

### F1 — Centralized Drizzle Schema Definition

- Single file `db/schema.ts` containing all PostgreSQL table definitions using Drizzle ORM's `pgTable` and column types
- All tables, columns, types, default values, constraints, and indexes defined in one place
- Relations between tables defined for Drizzle's relational query API
- Schema covers all current data domains:
  - Users (residents, businesses, admins) with CPF, email, status, role, documents
  - Businesses with profile fields, social links, opening hours, activation status
  - Coupons with discriminated union behavior types and restrictions
  - Redemptions with status lifecycle (active → used/expired)
  - Transactions with amounts, discounts, timestamps
  - Demand signals with category, status, rate limiting
  - Analytics counters for coupon views, redemptions, validations
  - File metadata for upload access control
  - Better Auth tables (user, session, account) as required by the Drizzle adapter

- Equivalent to ADR-002

### F2 — Migration Framework

- `drizzle-kit generate` creates SQL migration files from schema changes
- `drizzle-kit migrate` applies migrations to the database
- Initial migration creates all tables in one SQL file
- Future migrations are incremental (additive only) — no destructive changes without explicit review
- Migration files are checked into version control for audit trail

### F3 — PostgreSQL + Drizzle Gateway Infrastructure

- PostgreSQL service in Docker Compose: `postgres:18-alpine` with health check, persistent volume, initialization scripts
- Drizzle Gateway service in Docker Compose: web UI at port 4983, MASTERPASS authentication, persistent store volume
- Web app service updated to use `PG_CONNECTION` environment variable instead of `DENO_KV_PATH`
- Dependency graph: Gateway depends on PostgreSQL → Web app depends on PostgreSQL
- File uploads continue to use local filesystem volumes (unchanged)

- Equivalent to ADR-003

### F4 — Code Migration (KV → Drizzle)

- All route handlers currently calling `kv.get()`, `kv.set()`, `kv.list()`, `kv.delete()`, `kv.atomic()` rewritten to use Drizzle queries
- All atomic operations (coupon redemption, transaction validation, registration) replaced with Drizzle transactions
- Custom Better Auth KV adapter (`lib/kv-adapter.ts`) removed and replaced with Better Auth's Drizzle adapter
- Analytics counters (views, redemptions, validations) replaced with SQL `COUNT` queries or a dedicated analytics table
- Rate limiter counters (signal creation) replaced with Drizzle queries or in-memory rate limiting
- File metadata storage moved from KV to a `file_metadata` PostgreSQL table

### F5 — Test Infrastructure Migration

- All test files using `Deno.openKv(':memory:')` replaced with database-backed test patterns
- Test isolation strategy: transaction-per-test with rollback, or dedicated test database with before-each cleanup
- Seed script (`seed.ts`) updated from direct KV writes to Drizzle inserts
- 100% of existing test cases preserved and passing after migration

## User Experience

### Developer Onboarding After Migration

1. Developer clones the repo and creates `.env` from `.env.example`
2. Runs `docker compose up` — Docker starts PostgreSQL (with health check), Drizzle Gateway, and the web app
3. Runs `deno task db:migrate` to apply the initial migration
4. Runs `deno task db:seed` to create admin user and sample data
5. Opens `http://localhost:8000` — app works as before, backed by PostgreSQL
6. Opens `http://localhost:4983` — Drizzle Gateway shows all tables, protected by master password
7. Developer can browse, filter, and edit data directly in the Gateway UI
8. All existing tests pass with `deno test -A`

### Admin Support Scenario

1. Admin receives a support request about a resident's coupon not working
2. Opens Drizzle Gateway, authenticates with master password
3. Browses the `redemptions` table, filters by the resident's user ID
4. Sees the redemption record, its status (`active`, `used`, or `expired`), and the associated transaction
5. Can edit the redemption status directly if needed (e.g., mark an accidentally expired coupon as active again)
6. Closes the issue with data-driven visibility

## High-Level Technical Constraints

- **Docker Compose only** — No external database hosting in V1. PostgreSQL and Drizzle Gateway run as containers alongside the web app.
- **Drizzle Gateway must be authenticated** — MASTERPASS environment variable controls access. No anonymous data browsing in any environment.
- **Migration files committed to git** — All generated SQL migration files must be version-controlled for audit trail and team collaboration.
- **File storage unchanged** — Uploaded documents and logos continue to use local filesystem with Docker volumes. Only file metadata moves to PostgreSQL.
- **Zero data migration from KV** — The existing KV data file is dropped. Development data is recreated via the seed script. No one-time data migration script is written.
- **`drizzle-kit` runs outside Deno** — Drizzle Kit relies on Node.js APIs. It runs via `npx` or global npm install, not as a Deno task. The ORM runtime (`npm:drizzle-orm`) works within Deno.

## Non-Goals (Out of Scope)

- **Data migration from KV** — No script to read existing KV records and insert into PostgreSQL. No users means no valuable data to preserve.
- **Performance optimization** — No query profiling, index tuning, connection pooling configuration, or query optimization. Default PostgreSQL configuration is sufficient for V1 scale (single neighborhood, ~500 residents, ~50 businesses).
- **Database backups** — No automated backup strategy, point-in-time recovery, or replication setup. These are infrastructure concerns for production launch, separate from this migration.
- **ORM abstraction layer** — No repository pattern or data access layer between route handlers and Drizzle. Route handlers call Drizzle directly (consistent with the current pattern of route handlers calling KV directly).
- **Feature changes** — No changes to user-facing features, API shapes, or business logic. The migration is a behind-the-scenes infrastructure change.
- **Schema optimization** — No schema denormalization or redesign beyond what is needed to map KV document shapes to relational tables. The data model stays as close to the current interfaces as possible.
- **Multi-neighborhood database sharding** — No database-level changes to support multiple neighborhoods. That is a separate product decision.

## Phased Rollout Plan

### Phase 1 — Schema Definition and Migration (Days 1-2)

**Core deliverables:**
- Define all Drizzle table schemas in `db/schema.ts`
- Define relations between tables
- Generate initial migration SQL with `drizzle-kit generate`
- Create `drizzle.config.ts` configuration file
- Add PostgreSQL + Drizzle Gateway services to `docker-compose.yml`
- Update `main.ts` and `lib/kv.ts` to initialize Drizzle client instead of KV
- Create `lib/db.ts` as the single Drizzle client export

**Success criteria:**
- `docker compose up` starts all 3 services and PostgreSQL health check passes
- `drizzle-kit migrate` creates all tables
- Drizzle Gateway at port 4983 shows all tables with correct columns
- `db/schema.ts` compiles with zero TypeScript errors

### Phase 2 — Better Auth Migration (Day 3)

**Core deliverables:**
- Replace `lib/kv-adapter.ts` with Better Auth's Drizzle adapter
- Update `lib/auth.ts` to use Drizzle adapter
- Update `routes/api/auth/[...path].ts` (if needed)
- Test login, logout, session management end-to-end
- Test admin role access control
- Test business role access control

**Success criteria:**
- Better Auth sign-up, sign-in, sign-out work against PostgreSQL
- Session persistence survives container restart
- RBAC middleware correctly identifies resident, business, and admin roles
- All auth tests pass

### Phase 3 — Data Layer Migration (Days 4-8)

**Core deliverables:**
- Convert all route handlers from KV to Drizzle operations (highest impact):
  - `routes/api/users/register.ts` — registration with atomic checks
  - `routes/api/admin/approvals/*` — approval queue management
  - `routes/api/businesses/*` — business CRUD, profile, registration
  - `routes/api/coupons/*` — coupon CRUD, redemption
  - `routes/api/transactions/validate.ts` — checkout validation
  - `routes/api/signals/*` — demand signal creation and management
  - `routes/api/uploads/[filename].ts` — file metadata access control
  - `routes/api/admin/*` — admin dashboards and analytics
  - `lib/analytics.ts` — analytics counters
- Convert all atomic KV operations to Drizzle transactions

**Success criteria:**
- All API endpoints return correct data
- Atomic operations (redeem, validate, register) handle concurrency correctly
- Analytics counters increment correctly on views, redemptions, validations
- All manual smoke tests pass (register user → approve → browse catalog → redeem → validate)

### Phase 4 — Test Migration and Cleanup (Days 9-10)

**Core deliverables:**
- Update or rewrite all test files to work with PostgreSQL instead of in-memory KV
- Implement test database strategy (transaction-per-test rollback or per-test database)
- Update `seed.ts` to use Drizzle
- Remove `lib/kv.ts`, `lib/kv-adapter.ts`, and any remaining KV references
- Remove `--unstable-kv` flag from `deno.json` tasks, `Dockerfile` CMD, and all run scripts
- Update `docker-compose.yml` to remove KV volume mounts (if any)

**Success criteria:**
- 100% test pass rate (all existing tests adapted and passing)
- `grep -r "Deno.openKv\|unstable-kv\|kv\." src/` returns zero results
- Seed script creates working admin user
- Fresh `docker compose down -v && docker compose up` followed by `deno task db:migrate && deno task db:seed` produces a working local environment

## Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| KV references removed | Zero `Deno.openKv()` calls remaining | `grep -r "Deno.openKv" lib/ routes/ islands/` |
| Test pass rate | 100% | `deno test -A` exit code and summary |
| Drizzle Gateway accessible | Confirmed working at port 4983 | curl or browser test |
| PostgreSQL health check | Green within 10s of compose up | `docker compose ps` status |
| Schema compilation | Zero type errors | `deno check db/schema.ts` |
| Auth flow | Sign-up, sign-in, sign-out working against PostgreSQL | Manual E2E test |
| Migration apply | `drizzle-kit migrate` creates all tables | `psql` table list or Gateway UI |
| Seed script | Creates admin user that can log in | Manual verification |

## Risks and Mitigations

- **Missed KV references cause 500 errors** — With dozens of route handlers touching KV, some may be overlooked. *Mitigation:* Systematic codebase audit using `grep -r "kv\."` across all source files. Pair-program the audit with a second developer. Add a CI check that fails if any `Deno.openKv` or `kv.` call exists outside of migration code.

- **Drizzle Kit incompatibility with Deno** — `drizzle-kit` requires Node.js APIs and may not run reliably with Deno's npm compatibility layer. *Mitigation:* Run `drizzle-kit` via `npx` (which uses Node.js) rather than as a Deno task. Document this in setup instructions. If `npx` is unreliable, use a small Node.js wrapper script.

- **Test infrastructure complexity** — Switching from in-memory KV to PostgreSQL for tests introduces database setup/teardown overhead. *Mitigation:* Use a transaction-per-test pattern (open transaction, run test, rollback) for maximum isolation without per-test database creation. If that's insufficient, use a dedicated test database that is recreated before each test run.

- **Better Auth Drizzle adapter compatibility** — The adapter may have specific table structure requirements or version compatibility constraints. *Mitigation:* Read Better Auth's Drizzle adapter documentation before defining schemas. Use the exact table schemas that Better Auth expects for `user`, `session`, and `account` tables.

- **Team productivity dip during migration** — All developers are blocked on KV-based code until the migration completes. *Mitigation:* Keep Phase 1-4 tightly scoped (maximum 10 days). No feature work should be started during the migration window. The seed script must be working by end of Phase 1 so developers can at least test manually.

- **Docker Compose resource consumption** — Three containers instead of one increases memory and CPU usage on the VPS. *Mitigation:* PostgreSQL Alpine is lightweight (~50MB). Drizzle Gateway is a small Go binary. Monitor with `docker stats` and adjust container resource limits if needed.

## Architecture Decision Records

- [ADR-001: Full Database Migration from Deno KV to PostgreSQL with Drizzle ORM](adrs/adr-001.md) — Migrate all data (app + auth) in a single coordinated effort. Replace KV adapter with Better Auth Drizzle adapter.
- [ADR-002: Schema-First, Drop and Recreate Data Migration Strategy](adrs/adr-002.md) — Define all Drizzle schemas first, generate single initial migration, drop old KV data. No data migration script needed.
- [ADR-003: Docker Compose PostgreSQL with Drizzle Gateway Infrastructure](adrs/adr-003.md) — Run PostgreSQL and Drizzle Gateway as Docker Compose services alongside the web app, with health checks and master password protection.

## Open Questions

- **test database strategy**: What is the best test isolation approach for Deno + Drizzle + PostgreSQL? Two options: (1) per-test transaction rollback using `db.transaction()` with a savepoint, or (2) a dedicated test database that is dropped and recreated before each test run. Option 1 is faster but requires all queries within each test to share a single transaction handle. Option 2 is simpler but slower. Decision deferred to TechSpec.
- **testcontainers availability**: Can Deno use testcontainers (via npm) to spin up a disposable PostgreSQL container per test run? This would eliminate the need for a persistent test database. If testcontainers for Deno is not mature, fall back to a dedicated test database.
- **drizzle-kit execution in CI**: Should migrations be applied automatically in CI/CD, or should they be manual operations? For V1 (single developer/VPS), manual migration via `drizzle-kit migrate` is sufficient. Automated migrations in CI/CD can be added when the team grows.
- **Connection pool configuration**: Should the Drizzle client use a connection pool or a single connection? For a single-neighborhood app with ~50 businesses and ~500 residents, a single connection is likely sufficient. Pooling adds complexity but is needed for concurrent request handling. Decision deferred to TechSpec.

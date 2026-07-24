# Product Requirements Document — Database Reliability Standardization

## Overview

Passaporte Local's database schema has four hygiene gaps identified in a prior
review: timezone-naive timestamps, missing referential actions on foreign keys,
incomplete index coverage, and mixed primary-key types across app-owned and
auth-managed tables. Separately, the query layer in `lib/` mixes raw SQL with
Drizzle's typed query builder, increasing maintenance surface and reducing type
safety.

This initiative hardens the entire database layer as a single rebase while the
app is in dev stage (no production data), standardizes the query layer, adds CI
guardrails to prevent future drift, and produces a written conventions guide.
The audience is current and future developers: the work eliminates a class of
schema-related bugs, makes the codebase more approachable for new contributors,
and establishes enforceable patterns for all future database work.

## Goals

1. **Eliminate a class of bugs**: Prevent timezone-related data corruption,
   orphan records from missing cascades, FK violation errors in edge cases, and
   slow queries from missing indexes.

2. **Establish enforceable conventions**: Produce a documented standard
   (timestamp policy, PK type convention, FK cascade strategy, index guidelines)
   and automated CI checks that prevent deviation.

3. **Standardize the query layer**: Remove raw SQL from `lib/` in favor of
   Drizzle's typed query builder, making all database access type-safe and
   easier to refactor.

4. **Produce a reusable reference**: A `docs/DB_CONVENTIONS.md` guide that future
   contributors can read to understand and follow the established patterns.

**Non-goal**: Performance optimization. While better indexes will improve query
speed, this is a correctness and consistency initiative, not a performance
benchmarking exercise.

## User Stories

### Primary Persona: Current Developer

- As a **current developer**, I want all timestamps to be timezone-aware so I
  never have to debug "why is this date off by 3 hours?"
- As a **current developer**, I want foreign keys to have explicit `onDelete`
  actions so I can delete test data without manually ordering deletes in
  `finally` blocks.
- As a **current developer**, I want to use Drizzle's typed query builder
  everywhere so the TypeScript compiler catches type mismatches before I run
  the query.
- As a **current developer**, I want the CI to reject PRs that add tables with
  plain `timestamp` or missing `onDelete` so I don't have to catch these in
  code review.

### Secondary Persona: Future Contributor

- As a **future contributor**, I want a clear conventions guide I can read in
  10 minutes so I know exactly how to add a new table or write a query.
- As a **future contributor**, I want the schema to use consistent patterns
  everywhere so I don't have to guess which convention a particular table
  follows.
- As a **future contributor**, I want the CI to catch my mistakes early so I
  don't waste time on review feedback about schema conventions.

### Edge Cases

- As a **reviewer**, I want each commit in the PR to represent one clean layer
  of change so I can verify the migration step by step.
- As a **maintainer**, I want a single `drizzle-kit migrate` to create the full
  schema so the migration history stays clean and reproducible.

## Core Features

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| F1 | Primary key type migration | Critical | Switch app-owned tables (`businesses`, `coupons`, `redemptions`, `transactions`, `signals`, `coupon_analytics`, `merchant_posts`, `file_metadata`) from `text('id')` to `uuid('id').defaultRandom()`. Keep `text` on Better Auth tables (`user`, `session`, `account`, `verification`). |
| F2 | Referential integrity hardening | Critical | Add explicit `onDelete` to all 15 foreign keys. Cascade for ownership chains (`merchant_posts→businesses`, `coupons→businesses`, `redemptions→coupons`). Restrict for audit records (`transactions`, `signals`). Add missing FK on `file_metadata.user_id`. |
| F3 | Timestamp timezone standardization | High | Switch all `timestamp('col')` to `timestamp('col', { withTimezone: true })`. Update the `feed_events` materialized view definition. Remove `::timestamptz` casts from raw queries. Add `$onUpdate(() => new Date())` to `merchant_posts.updated_at`. |
| F4 | Index coverage | High | Add indexes on: `redemptions(user_id, status)` for the resident active-codes query, `verification(identifier)` for Better Auth token validation, `transactions(redemption_id)` for join performance, `file_metadata(user_id)` for access control lookups. |
| F5 | Seed data realignment | High | Update `seed.ts` to remove hardcoded string IDs and let `defaultRandom()` generate UUIDs. Realize production-like data flow. |
| F6 | Query layer standardization | Medium | Convert raw SQL in `lib/feed.ts` and `lib/analytics.ts` to typed Drizzle query builder (`db.select().from()`, `eq()`, `and()`, etc.). Ensure all `lib/` queries follow consistent patterns. |
| F7 | Test DB shared utility | Medium | Create `lib/test-db.ts` with a shared helper for pool creation and teardown, reducing boilerplate duplicated across test files. |
| F8 | Migration generation | Critical | Run `drizzle-kit generate` to produce a single CREATE migration that captures the final schema. Since no data exists, this is a clean CREATE, not ALTER TABLE. |
| F9 | CI guardrails | Medium | Create `scripts/check-schema-conventions.ts` that inspects `db/schema.ts` and verifies: all timestamp columns use `withTimezone`, all FK `.references()` include explicit `onDelete`, and app-owned PKs are `uuid` not `text`. Add git diff check on migration snapshots. Wire into `deno task check`. |
| F10 | Conventions guide | High | Write `docs/DB_CONVENTIONS.md` covering: timestamp policy, PK type convention, FK cascade strategy, index guidelines, Drizzle query builder patterns, and a quick-reference table of what changed. |

## User Experience

Since this is an internal infrastructure initiative, the "user experience" is
the developer workflow:

### Developer Workflow — Before

1. Create a new table → choose `text` for PK (consistency with existing tables)
   or `uuid` (following merchant_posts precedent) → uncertainty
2. Add a FK → omit `onDelete` (no explicit convention) → discover the default
   is `NO ACTION` → work around it in app code
3. Write a query → use `db.select()` or `db.execute(sql\`...\`)` depending on
   which file you're in → inconsistent styles across lib/
4. Review a PR → manually check timestamp types, FK actions, index coverage
5. Onboard a new developer → no written conventions to hand them

### Developer Workflow — After

1. Create a new table → always `uuid('id').defaultRandom()` for PK
2. Add a FK → always include explicit `onDelete` → pick cascade/restrict from
   documented strategy
3. Write a query → always use typed `db.select().from()` with `eq()`, `and()`
4. Submit a PR → CI checks schema conventions automatically → no manual review
   burden for these patterns
5. Onboard a new developer → point them to `docs/DB_CONVENTIONS.md` for a 10-minute
   read on all patterns

### Accessibility

The conventions guide is plain Markdown, readable in any editor or rendered on
GitHub. The CI script outputs clear, actionable error messages (e.g., "Table
`foo` uses `timestamp()` without `withTimezone` — add `{ withTimezone: true
}`").

## High-Level Technical Constraints

- **Drizzle ORM compatibility**: All schema changes must use Drizzle ORM's
  public API (`pgTable`, `uuid`, `timestamp`, `.references()`, `.defaultRandom()`,
  etc.). No raw SQL in schema definitions.
- **Better Auth isolation**: The four Better Auth tables (`user`, `session`,
  `account`, `verification`) must keep `text` PKs. Their schemas are controlled
  by the Better Auth adapter, not by this initiative.
- **Migration tooling**: The project uses `drizzle-kit` for migration generation
  and application. All schema changes must be captured by `drizzle-kit generate`.
- **Dev stage only**: No production data exists. The database is frequently
  recreated. This initiative does not need to worry about data migration, zero-
  downtime deployment, or backward compatibility.

## Non-Goals (Out of Scope)

- **UUID v7**: v4 via `defaultRandom()` is sufficient for current scale. v7 adds
  library dependencies without measurable benefit at this application's size.
- **Partial indexes**: These are premature without production query profiling.
  Add on-demand when `EXPLAIN ANALYZE` shows table scans on status-filtered
  queries.
- **Database-level `updated_at` triggers**: `$onUpdate(() => new Date())` in
  Drizzle is sufficient once the query layer eliminates raw SQL. PSQL triggers
  add complexity without current need.
- **Custom Drizzle relations API rewrite**: Existing `relations()` definitions
  are functional. Rewriting them would be cosmetic, not corrective.
- **Full text search indexes**: No query patterns justify them yet.
- **Connection pool tuning**: Current `pg` Pool settings (max 10, min 1) are
  adequate for dev stage. Tuning belongs in a performance-focused follow-up.

## Phased Rollout Plan

The Big Bang approach delivers all features in one focused effort. Within the
single branch, work proceeds through clear dependency layers in order:

### Layer 1: Foundation (PK types → FKs)

- Change PK types on all app-owned tables: `text('id')` → `uuid('id').defaultRandom()`
- Update all FK references to use the new column types
- Add explicit `onDelete` actions to all 15 foreign keys
- Add the missing FK on `file_metadata.user_id`
- **Verify**: `deno task test` passes

### Layer 2: Structure (Indexes → Timezone)

- Add missing indexes (4 total)
- Switch all timestamps to `withTimezone: true`
- Update `feed_events` MV definition
- Fix `::timestamptz` casts in raw queries
- Add `$onUpdate` to `merchant_posts.updated_at`
- **Verify**: `deno task test` passes

### Layer 3: Data & Queries (Seed → Query layer → Test utility)

- Realign `seed.ts` to auto-generated UUIDs
- Convert raw SQL in `lib/feed.ts` to typed Drizzle queries
- Convert raw SQL in `lib/analytics.ts` to typed Drizzle queries
- Create `lib/test-db.ts` with shared pool creation and teardown
- Update existing test files to use the shared utility
- **Verify**: `deno task test` passes; seed + query flow works end-to-end

### Layer 4: Enforcement & Documentation (CI → Guide)

- Create `scripts/check-schema-conventions.ts`
- Wire into `deno task check`
- Write `docs/DB_CONVENTIONS.md`
- Run `drizzle-kit generate` to produce the final migration
- **Verify**: `deno task check` passes with 0 violations

### Rollback

Since no data exists, rollback is a full DB recreation: drop the database,
recreate, and run `drizzle-kit migrate` with the prior migration snapshot.

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|---------------|
| Schema convention compliance | 100% | CI script passes: all timestamps use `withTimezone`, all FKs have `onDelete`, app PKs are `uuid` |
| Raw SQL in lib/ | 0 files | `grep -r "db.execute(sql" lib/` returns no matches |
| Migration clean apply | 1-shot | `deno run -A npm:drizzle-kit migrate` + `deno run -A seed.ts` pass with 0 errors on fresh DB |
| Developer onboarding time | Under 10 minutes | Time to read `docs/DB_CONVENTIONS.md` and answer "how do I add a new table?" correctly |
| CI guardrail false-positive rate | 0 per PR | No PRs blocked by incorrect CI warnings about valid schema patterns |
| DB-related bug recurrence | -80% in 3 months | Tracks timezone, FK violation, and orphan-record bug reports post-migration |

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **Review fatigue** from large PR | Medium | Medium | Organize the branch as clean, reviewable commits by layer; each commit is independently verifiable |
| **Test regression** from query layer rewrite | Medium | High | Run tests after each layer; the existing test suite exercises all major query paths |
| **Mixed type confusion** in text/uuid joins | Low | Medium | Drizzle handles type coercion; test the critical join paths (redemptions→coupons, transactions→businesses) |
| **CI script fragility** as Drizzle syntax evolves | Low | Low | Keep checks focused on surface-level patterns (regex for known constructs); test the script in CI itself |
| **Milestone 2 and 3 don't ship** (query + CI deferred) | Low | High | Big Bang approach eliminates this risk by grouping all changes in one branch |
| **Blocked by unknown schema constraints** | Low | Medium | Dev stage allows full DB recreation; any mistakes are fixable by dropping and recreating |

## Architecture Decision Records

- [ADR-001: Schema Reliability Standardization — scope and approach](adrs/adr-001.md)
- [ADR-002: Big Bang execution strategy](adrs/adr-002.md)

## Open Questions (Resolved)

All questions resolved during the PRD review cycle:

| Question | Resolution |
|----------|-----------|
| Test DB shared utility? | Create `lib/test-db.ts` — included in Layer 3 as F7 |
| Seed ID determinism? | Tests query by known attributes (email, CNPJ, business name), not hardcoded UUIDs |

# Database Reliability Standardization

## Overview

Passaporte Local's schema layer has four hygiene gaps identified in a prior
review: timezone-naive timestamps, missing referential actions on foreign keys,
incomplete index coverage, and mixed primary-key types. Separately, the query
layer (`lib/`) mixes raw SQL with typed Drizzle queries, increasing maintenance
surface. This initiative hardens the schema as a single rebase while the app is
in dev stage (no production data), standardizes the query layer, and adds CI
guardrails to prevent future drift. Delivered with a practical reference guide
covering Drizzle ORM + PostgreSQL conventions for the team.

## Summary / Differentiator

This is an internal reliability initiative, not a user-facing feature. Its value
compounds over time: every future feature built on the hardened schema
automatically follows best practices, and the CI guardrails prevent regression.
The differentiator vs "just fix bugs" is the investment in automated enforcement
— schema linting, drift detection, and a documented convention guide ensure the
work stays done.

## Problem

The current schema uses `timestamp without time zone` on all datetime columns.
While the app serves a single neighborhood today, timestamps stored without zone
information create silent corruption risk: if the database clock or client
timezone changes, stored values shift ambiguously. The existing `feed_events`
materialized view already casts `::timestamptz` in raw queries — a workaround
for a type mismatch, not a fix.

Of 15 foreign key constraints, only 3 (Better Auth's `session` and `account`,
plus `coupon_analytics`) have explicit `onDelete` actions. The remaining 12
default to PostgreSQL's `NO ACTION`, meaning deleting a `user`, `business`, or
`coupon` fails at the DB level if dependent rows exist. Application code works
around this with manual ordering in `finally` blocks — a fragile pattern that
replicates what the DB should guarantee.

Index coverage is incomplete: the `verification` table (used by Better Auth for
token validation) has no index on `identifier`, `redemptions` lacks a dedicated
index on `(user_id, status)` for the resident's active-codes query path, and
`transactions(redemption_id)` (used in joins) is unindexed.

Primary keys use `text` across all tables, with only `merchant_posts` using
`$defaultFn(() => crypto.randomUUID())`. PostgreSQL's `uuid` type is 16 bytes vs
33+ bytes for hex text, meaning PK indexes are roughly 2x larger than necessary.
While performance impact is negligible at current scale, the structural coupling
of `text` PKs makes future migration exponentially harder — every FK, every
join, every query references the PK type.

The query layer compounds these issues: `lib/feed.ts` and `lib/analytics.ts` use
raw `db.execute(sql\`...\`)` instead of Drizzle's typed query builder, defeating
type safety and making schema changes harder to trace.

### Market Data

- **PostgreSQL docs**: `timestamptz` is the standard for absolute time storage;
  `timestamp` silently strips timezone info
- **Drizzle ORM best practices**: Always use `withTimezone: true`, always define
  `onDelete` on FKs, always create indexes on FK columns
- **pganalyze / SO**: UUID v4 index bloat is ~2.7x vs native `uuid` type at scale
- **UUID v7 benchmarks**: Time-ordered UUIDs outperform v4 under write-heavy
  workloads, but v4 via `defaultRandom()` is adequate for this app's consumer
  scale

## Core Features

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| F1 | Primary key migration — `text` → `uuid` | Critical | Switch app-owned tables (`businesses`, `coupons`, `redemptions`, `transactions`, `signals`, `coupon_analytics`, `merchant_posts`, `file_metadata`) from `text('id')` to `uuid('id').defaultRandom()`. Keep `text` on Better Auth tables (`user`, `session`, `account`, `verification`). |
| F2 | Referential integrity — explicit onDelete | Critical | Add explicit `onDelete` to all 15 foreign keys. Cascade for ownership chains (e.g., `merchant_posts → businesses`, `coupons → businesses`, `redemptions → coupons`); restrict for audit records (`transactions`, `signals`); add missing FK on `file_metadata.user_id`. |
| F3 | Timestamp timezone standardization | High | Switch all `timestamp('col')` to `timestamp('col', { withTimezone: true })`. Update `feed_events` MV definition. Remove `::timestamptz` casts from raw queries. `$onUpdate(() => new Date())` on `merchant_posts.updated_at`. |
| F4 | Indexing strategy | High | Add: composite index on `redemptions(user_id, status)` for active-codes query, index on `verification(identifier)` for token validation, index on `transactions(redemption_id)` for joins, index on `file_metadata(user_id)` for access control. |
| F5 | Seed data realignment | High | Update `seed.ts` to use auto-generated UUIDs via `defaultRandom()`. Replace hardcoded string IDs like `'seed-biz-central-cafe'`. |
| F6 | Query layer standardization | Medium | Convert raw SQL in `lib/feed.ts` and `lib/analytics.ts` to typed Drizzle query builder. Ensure all `lib/` queries use consistent patterns: `eq()`, `and()`, typed selects. |
| F7 | Migration generation | Critical | Generate a single clean migration via `drizzle-kit generate` that captures all changes. Since no data exists, this is a clean CREATE migration, not ALTER TABLE. |
| F8 | CI guardrails | Medium | Custom Deno script (`scripts/check-schema-conventions.ts`) checking: all timestamp columns use `withTimezone`, all FKs include explicit `onDelete`, app-owned PKs are `uuid` not `text`. Git diff on migration snapshots for drift detection. Run via `deno task check`. |
| F9 | Mini-guide | High | `DB_CONVENTIONS.md` documenting: timestamp policy, PK type convention, FK cascade strategy, index creation guidelines, Drizzle query builder patterns. |

## Integration with Existing Features

| Integration Point | How |
|-------------------|-----|
| `db/schema.ts` | Primary target — all column type, FK, and index changes applied here |
| `lib/feed.ts` | Raw SQL replaced with typed Drizzle queries; `::timestamptz` casts removed |
| `lib/analytics.ts` | Raw UPSERT SQL replaced with typed Drizzle query builder |
| `lib/savings.ts` | Already uses typed Drizzle — no change needed (reference implementation) |
| `lib/storage.ts` | Minor FK realignment for `file_metadata.user_id` reference |
| `seed.ts` | ID generation switched from hardcoded strings to `defaultRandom()` |
| `db/migrations/` | New migration generated; old snapshot becomes base |
| `routes/api/` | No direct changes — benefits from schema improvements transitively |
| `tests/` | Test fixtures using hardcoded string IDs need updating for uuid columns |
| `deno.json` | Add `check:schema` task running the CI script |

## KPIs

| KPI | Target | How to Measure |
|-----|--------|---------------|
| Schema convention compliance | 100% | Every timestamp column uses `withTimezone`, every FK has explicit `onDelete`, app PKs are `uuid` |
| Query layer type safety | 0 raw SQL files | grep for `db.execute(sql\`` in `lib/` returns 0 |
| CI guardrail coverage | 3 checks passing | Schema lint, FK audit, snapshot diff — all green on every PR |
| DB-related bug rate | -80% (3-month trailing) | Count timezone, FK violation, and orphan-record bugs post-migration |
| Migration clean apply | 1-shot | `drizzle-kit migrate` + `deno run -A seed.ts` passes on fresh DB without errors |

## Feature Assessment

| Criteria | Question | Score |
|----------|----------|-------|
| **Impact** | How much more valuable does this make the product? | **Strong** — Eliminates bug classes (timezone, orphans, FK violations), improves query performance, and standardizes patterns |
| **Reach** | What % of users would this affect? | **Must do** — Every API route and query touches the DB; 100% of code paths |
| **Frequency** | How often would users encounter this value? | **Must do** — Every operation benefits from consistent schema |
| **Differentiation** | Does this set us apart or just match competitors? | **Maybe** — Clean schemas are table stakes; inconsistent ones are a direct disadvantage |
| **Defensibility** | Is this easy to copy or does it compound over time? | **Strong** — Compounds: future features follow established patterns; CI guardrails prevent regression |
| **Feasibility** | Can we actually build this? | **Must do** — Low technical risk at dev stage; migration is a clean create, not alter |

**Leverage type:** Compounding Feature + Quick Win (indexes/timezone are quick
wins; PK+FK+CIs compound over time)

## Council Insights

- **Recommended approach:** Hybrid — full schema sweep with CI guardrails and
  query layer standardization
- **Key trade-offs:**
  - UUIDs debate: Architect defends as "irreversible architectural gift" (dev
    stage = only window for clean migration); Pragmatic Engineer counters
    "highest-churn, lowest-value change at this scale"
  - Mixed convention: App tables use `uuid`, auth tables stay `text` —
    wire-compatible but adds mental overhead
  - Full sweep vs phased: Architect argues bundling ensures all FKs reference
    the final PK type; Pragmatic Engineer warns bundling increases PR blast
    radius
- **Risks identified:**
  - UUID changes cascade to every FK definition; one misordered migration step
    breaks the schema. Mitigation: clean CREATE migration, no ALTER TABLE
    needed.
  - Mixed `text`/`uuid` type alignment in joins could cause subtle mismatch
    errors. Mitigation: Drizzle handles type coercion; test critical query
    paths.
  - Query layer rewrite may uncover latent bugs in raw SQL. Mitigation:
    existing test suite exercises main paths.
- **Stretch goal (V2+):** Add partial indexes for status-based lookups, explore
  UUID v7 for write-heavy tables, auto-generate typed query helpers from schema

## Out of Scope (V1)

- **UUID v7** — v4 via `defaultRandom()` is sufficient; v7 adds library deps
  without measurable benefit at this scale
- **Partial indexes** — Add on-demand when production query profiling proves
  need; YAGNI until `EXPLAIN ANALYZE` shows table scans
- **PSQL `updated_at` triggers** — `$onUpdate(() => new Date())` in Drizzle is
  sufficient since we're eliminating raw SQL from the codebase
- **Custom Drizzle relations API rewrite** — Existing `relations()` definitions
  are functional; rewriting is cosmetic, not corrective
- **Full text search indexes** — No query patterns justify them yet
- **Connection pool tuning** — Current `pg` Pool settings (max 10, min 1) are
  adequate for dev stage
- **Automated migration rollback in CI** — CI lacks production data; manual
  verification is sufficient at this stage

## Architecture Decision Records

- [ADR-001: Schema Reliability Standardization — scope and approach](adrs/adr-001.md)

## Open Questions

All open questions were resolved during the idea creation process:

| Question | Resolution |
|----------|-----------|
| `updated_at` trigger approach | `$onUpdate(() => new Date())` on `merchant_posts.updated_at` — Drizzle-native, sufficient for typed query layer |
| Seed ID strategy | Auto-generate via `defaultRandom()` — same as production |
| CI guardrail tooling | Custom Deno script (`scripts/check-schema-conventions.ts`) + git diff on migration snapshots; run via `deno task check` |

---
status: pending
title: Schema Definition & Initial Migration
type: backend
complexity: medium
dependencies: []
---

# Schema Definition & Initial Migration

## Overview

Create the centralized `src/db/schema.ts` file defining all PostgreSQL table schemas using Drizzle ORM's `pgTable`, including relations, indexes, and constraints. Generate the initial migration SQL with `drizzle-kit generate` that creates all tables in a single migration file. This is the single source of truth for the database schema that every other migration task references.

<critical>

- Read the PRD (F1 — Centralized Drizzle Schema Definition) and TechSpec ("Core Interfaces" section with complete table definitions) before implementing
- Reference TechSpec for exact column types, default values, and index definitions — do not invent your own
- Reference ADR-002 for schema-first strategy
- Reference ADR-005 for the `coupon_analytics` table design
- Focus on WHAT the schema must contain, not HOW it will be used
- Tests required: verify schema compiles, migration generates valid SQL, and applying migration creates all tables

</critical>

<requirements>

1. All tables MUST be defined in a single `src/db/schema.ts` file using `pgTable` from `drizzle-orm/pg-core`.
2. Tables MUST be defined in dependency order: users → businesses → coupons → redemptions → transactions → signals → coupon_analytics → file_metadata → session → account → verification.
3. Better Auth tables (`user`, `session`, `account`, `verification`) MUST match the exact schema expected by `better-auth/adapters/drizzle`.
4. Foreign key constraints MUST be defined for all cross-table references (e.g., `coupons.businessId -> businesses.id`).
5. Drizzle `relations` API MUST be defined for relational queries.
6. Indexes MUST be defined as specified in the TechSpec (idx_redemptions_user_coupon_month, idx_redemptions_coupon_id, etc.).
7. `drizzle.config.ts` (created in task_01) MUST be used to generate the initial migration with `drizzle-kit generate`.
8. The initial migration SQL file MUST be saved to `src/db/migrations/` and committed to version control.
9. Migration files MUST use the snake_case naming convention for column names (e.g., `created_at`, `business_id`).

</requirements>

## Subtasks

- [ ] Create `src/db/schema.ts` with all table definitions using pgTable
- [ ] Define all column types, default values, nullability, and constraints
- [ ] Define foreign key references in correct dependency order
- [ ] Define Drizzle relations API for all tables
- [ ] Define all indexes as specified in TechSpec
- [ ] Run `npx drizzle-kit generate` to produce the initial migration SQL
- [ ] Review and verify the generated SQL migration file
- [ ] Run `npx drizzle-kit migrate` against local PostgreSQL to verify all tables created
- [ ] Ensure `deno check src/db/schema.ts` passes with zero type errors

## Implementation Details

### Relevant Files

- `src/db/schema.ts` — new file; all table definitions
- `src/db/migrations/0000_initial.sql` — new (generated); initial migration SQL

### Dependent Files

- `lib/db.ts` (task_03) — imports schema
- `lib/auth.ts` (task_04) — references user/session/account tables
- All route handler files (tasks 05-12) — query against these schemas
- `seed.ts` (task_13) — inserts using these schemas

### Related ADRs

- [ADR-002: Schema-First, Drop and Recreate Data Migration Strategy](../adrs/adr-002.md)
- [ADR-005: Analytics Counters Model — Dedicated Table with Event-Based Sources](../adrs/adr-005.md)
- [ADR-008: User Coupon Usage — SQL COUNT from Redemptions Table](../adrs/adr-008.md)
- [ADR-009: Coupon Views Tracking — Aggregated Counter Only for V1](../adrs/adr-009.md)

## Deliverables

- `src/db/schema.ts` with all table definitions, relations, and indexes
- Generated migration file `src/db/migrations/0000_initial.sql`
- All tables created in PostgreSQL via `drizzle-kit migrate`
- `deno check src/db/schema.ts` passes with zero errors

## Tests

### Unit Tests

- [ ] `src/db/schema.ts` compiles with `deno check` and produces zero type errors
- [ ] All exported table objects are valid `pgTable` instances
- [ ] Relations API is correctly typed and references valid tables

### Integration Tests

- [ ] `drizzle-kit generate` produces a valid SQL migration file in `src/db/migrations/`
- [ ] `drizzle-kit migrate` creates all expected tables in PostgreSQL (verify with `\dt` or Drizzle Gateway)
- [ ] Drizzle Gateway at port 4983 shows all tables with correct column names and types
- [ ] Foreign key constraints are enforced (e.g., inserting a coupon with a non-existent business_id fails)
- [ ] Unique constraints work (e.g., duplicate email on user table fails)
- [ ] Default values are applied correctly (e.g., `is_active` defaults to `true`, `status` defaults to `pending`)

## Success Criteria

- `deno check src/db/schema.ts` exits 0
- `drizzle-kit generate` produces a SQL file with all CREATE TABLE statements
- `drizzle-kit migrate` creates all tables without errors
- Drizzle Gateway shows the complete schema
- Test coverage >=80% for migration verification

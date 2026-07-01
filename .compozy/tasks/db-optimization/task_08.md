---
status: pending
title: Migration generation — `drizzle-kit generate`, review SQL
type: chore
complexity: low
dependencies:
  - task_04
  - task_05
  - task_06
  - task_07
---

# Task 08: Migration generation — `drizzle-kit generate`, review SQL

## Overview

Delete the existing migration (`db/migrations/0000_high_franklin_storm.sql` and
its `meta/` snapshot), then run `drizzle-kit generate` to produce a single fresh
migration capturing the final post-sweep schema. Review the generated SQL for
correctness — verify table definitions, FK constraints, indexes, and the MV
definition. This is the final schema capture step before CI and documentation.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- The existing `0000_high_franklin_storm.sql` and `meta/` snapshot MUST be deleted
- `drizzle-kit generate` MUST be run to produce a single fresh migration
- The generated migration SQL MUST be reviewed for:
  - All 11 tables present (8 app-owned + 3 Better Auth + verification)
  - App-owned table PKs are `uuid` with `default gen_random_uuid()`
  - Better Auth table PKs are `text`
  - All FKs have explicit `ON DELETE CASCADE` or `ON DELETE RESTRICT`
  - All timestamp columns are `timestamp with time zone`
  - All 4 new indexes are present
  - The `feed_events` MV definition has no `::timestamptz` casts
  - `merchant_posts.updated_at` has `$onUpdate`
- After generate, `drizzle-kit migrate` MUST apply successfully on a fresh DB
- The seed script MUST run successfully after migration
</requirements>

## Subtasks

- [ ] 08.1 Delete `db/migrations/0000_high_franklin_storm.sql` and `db/migrations/meta/`
- [ ] 08.2 Run `drizzle-kit generate` to produce the new migration
- [ ] 08.3 Review generated SQL — verify all 10 checklist items above
- [ ] 08.4 Run `drizzle-kit migrate` on a fresh database
- [ ] 08.5 Run `deno task db:seed` to verify seed works on new schema
- [ ] 08.6 Run `deno task test` to verify all tests pass with new migration

## Implementation Details

The `drizzle-kit generate` command reads `db/schema.ts` and produces a SQL
migration file in `db/migrations/`. Since the old migration is deleted and the
schema is in its final state, the generated file will be a single CREATE
migration — no ALTER TABLE statements.

Review checklist for the generated SQL:

| Check | What to Look For |
|-------|-----------------|
| app PKs | `"id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL` |
| auth PKs | `"id" text PRIMARY KEY NOT NULL` |
| FKs | `REFERENCES "public"."<parent>"("<col>") ON DELETE cascade\|restrict` |
| timestamps | `timestamp with time zone DEFAULT now() NOT NULL` |
| indexes | `CREATE INDEX "idx_redemptions_user_id_status" ...` through 4 new ones |
| MV | `CREATE MATERIALIZED VIEW feed_events AS ...` without `::timestamptz` |

Run migration and seed via docker compose as specified in deno.json:
```
deno task db:migrate
deno task db:seed
```

### Relevant Files
- `db/schema.ts` — Source of truth for migration generation (all changes from Tasks 01-03)
- `db/migrations/0000_high_franklin_storm.sql` — To be deleted
- `db/migrations/meta/` — To be deleted
- `seed.ts` — Used to verify migration+seed pipeline (changes from Task 04)
- `lib/analytics.ts`, `lib/feed.ts` — Used by tests that verify the migrated DB

### Dependent Files
- No files depend on the migration files directly (they are consumed by `drizzle-kit migrate`)
- `docs/DB_CONVENTIONS.md` (Task 09) will reference the final migration as evidence

### Related ADRs
- ADR-001: Schema Reliability Standardization — scope and approach (F8: Migration generation)
- ADR-004: Delete+regenerate migration strategy

## Deliverables

- New migration file in `db/migrations/`
- Migration applies cleanly on fresh DB
- Seed runs successfully after migration
- All tests pass
- Unit tests with 80%+ coverage **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] Migration file is valid SQL (no syntax errors)
- Integration tests:
  - [ ] `drizzle-kit migrate` on fresh DB exits 0
  - [ ] After migration, `\dt` shows all 11 tables
  - [ ] After migration, `\d+ <table>` confirms uuid PKs, FK onDelete, timestamptz
  - [ ] After migration, `\dm feed_events` shows the MV exists
  - [ ] After migration + seed, data queries return expected results
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- Fresh DB: `drizzle-kit migrate` → `seed.ts` → all tests pass
- Generated SQL reviewed and correct
- No `::timestamptz` casts in the MV definition
- All 4 new indexes present in generated SQL

---
status: pending
title: CI + Conventions guide — `check-schema-conventions.ts` + `DB_CONVENTIONS.md`
type: docs
complexity: medium
dependencies:
  - task_03
---

# Task 09: CI + Conventions guide — `check-schema-conventions.ts` + `DB_CONVENTIONS.md`

## Overview

Create a standalone Deno script (`scripts/check-schema-conventions.ts`) that
inspects `db/schema.ts` for compliance with the new schema conventions, and
wire it into `deno task check`. Write a Markdown conventions guide
(`docs/DB_CONVENTIONS.md`) that documents all established patterns for current
and future contributors.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- `scripts/check-schema-conventions.ts` MUST check 3 rules:
  - App-owned table PKs use `uuid('id').defaultRandom()` — not `text('id')`
  - All `timestamp(` calls include `{ withTimezone: true }`
  - All `.references()` calls include explicit `{ onDelete:`
- The script MUST exclude Better Auth tables (`user`, `session`, `account`, `verification`) from PK type checking
- The script MUST exclude the `feedEvents` pgTable from PK type checking (it is a read-only MV mapping)
- The script MUST exit with code 0 when all checks pass, non-zero on violation
- Error messages MUST be clear and actionable: `"Table 'X' uses text('id') — use uuid('id').defaultRandom()"`
- The script MUST be wired into `deno.json` as part of the `check` task
- `docs/DB_CONVENTIONS.md` MUST cover: PK type convention, timestamp policy, FK cascade strategy, index guidelines, Drizzle query builder patterns, and a quick-reference summary
- Both files MUST be reviewed in the same commit
</requirements>

## Subtasks

- [ ] 09.1 Create `scripts/check-schema-conventions.ts` with regex-based checks
- [ ] 09.2 Implement PK type check — ensure app tables use `uuid('id').defaultRandom()`
- [ ] 09.3 Implement timestamp check — ensure all `timestamp(` includes `withTimezone: true`
- [ ] 09.4 Implement FK check — ensure all `.references()` includes `{ onDelete:`
- [ ] 09.5 Add exclusion lists for Better Auth tables and feedEvents
- [ ] 09.6 Wire the script into `deno.json` `check` task
- [ ] 09.7 Create `docs/DB_CONVENTIONS.md` with full conventions documentation
- [ ] 09.8 Run `deno task check` — verify it passes with 0 violations
- [ ] 09.9 Test the script against an intentional violation to verify it fails correctly

## Implementation Details

**CI Script** (`scripts/check-schema-conventions.ts`):

A standalone Deno script that reads `db/schema.ts` as text and applies targeted
regex patterns. The approach is intentionally simple (regex, not AST) per ADR-006.

Key patterns:
```ts
// Check 1: App-owned tables use uuid PK
// Match lines like `tableName = pgTable('table_name', {`
// Then look at subsequent lines for `id:` patterns
// Exclude: user, session, account, verification, feedEvents

// Check 2: Timestamp withTimezone
// Match: timestamp('col')  — report if not: timestamp('col', { withTimezone: true })
// Skip drizzle-orm imports

// Check 3: FK onDelete
// Match: .references(() =>  — report if not followed by { onDelete:
```

**Wiring** (`deno.json`):
```json
"check": "deno run -A scripts/check-schema-conventions.ts && deno fmt --check . && deno lint . && deno check"
```

**Conventions Guide** (`docs/DB_CONVENTIONS.md`):

The guide covers:
1. **PK Convention**: `uuid('id').defaultRandom()` for app tables, `text('id')` for Better Auth tables
2. **Timestamp Policy**: Always `{ withTimezone: true }`, use `$onUpdate` for updated_at when using typed Drizzle
3. **FK Strategy**: Cascade for ownership chains, Restrict for audit records — every FK must have explicit onDelete
4. **Index Guidelines**: Name pattern `idx_<table>_<columns>`, add indexes for FK join columns and filtered queries
5. **Query Patterns**: Always use typed `db.select().from()` with `eq()`, `and()`, etc. — no raw SQL in lib/
6. **Quick Reference**: Table with before/after for every schema change in this sweep

### Relevant Files
- `scripts/check-schema-conventions.ts` — New file to create
- `docs/DB_CONVENTIONS.md` — New file to create
- `deno.json` — Wire the script into the `check` task
- `db/schema.ts` — The file the CI script inspects

### Dependent Files
- All future PRs that modify `db/schema.ts` will be validated by the CI check
- PR reviews can rely on CI instead of manual schema convention checks

### Related ADRs
- ADR-001: Schema Reliability Standardization — scope and approach (F9: CI guardrails, F10: Guide)
- ADR-006: Standalone CI conventions script

## Deliverables

- `scripts/check-schema-conventions.ts` — passes against current schema.ts
- `deno.json` updated — `check` task includes the conventions script
- `docs/DB_CONVENTIONS.md` — complete conventions reference
- `deno task check` passes with 0 violations
- Unit tests for the CI script **(REQUIRED)**
- Documentation review **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] Check 1: valid schema (current state after Tasks 01-03) passes all 3 checks
  - [ ] Check 1: schema with `text('id')` on app table fails PK check
  - [ ] Check 2: schema with bare `timestamp('col')` fails timezone check
  - [ ] Check 3: schema with `.references(() => ...` without `onDelete` fails FK check
  - [ ] Better Auth tables excluded from PK check
  - [ ] `feedEvents` excluded from PK check
  - [ ] Script exits 0 on pass, non-zero on failure
- Documentation review:
  - [ ] Guide covers all 6 required topics
  - [ ] Quick-reference table is accurate
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- `deno task check` passes with 0 violations
- Intentionally breaking a convention fails the CI check
- A new developer can read `docs/DB_CONVENTIONS.md` in 10 minutes and add a compliant table
- All tests passing

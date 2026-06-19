---
status: pending
title: Signals Routes & Rate Limit Removal
type: backend
complexity: medium
dependencies:
  - task_02
  - task_03
  - task_04
---

# Signals Routes & Rate Limit Removal

## Overview

Migrate demand signal creation and management routes from Deno KV to Drizzle, and remove V1 rate limiting per ADR-007. The signals routes handle creating demand signals (resident requests for business types), category-based listing, and admin signal review. Rate limiting (5/day, 3/hour) is removed entirely since there are no real users and it will be reimplemented in a future PRD.

<critical>

- Read the TechSpec ("Integration Points" section) and ADR-007 before implementing
- Reference ADR-007: rate limiting is removed for V1 — do NOT migrate rate limiter KV keys
- Signal CRUD must work against PostgreSQL
- Tests required: signal creation, category listing, admin review, rate limit removal

</critical>

<requirements>

1. `routes/api/signals/index.ts` MUST replace `kv.set`, `kv.list`, `kv.get`, `kv.atomic()` with equivalent Drizzle operations.
2. The rate limit check block in signal creation MUST be removed entirely (per ADR-007). No rate limit KV keys are migrated.
3. The category index (`['signals_by_category', ...]`) and category counter (`['signal_counts', ...]`) MUST be replaced with Drizzle queries using `WHERE category = ?` and `SELECT COUNT(*)`.
4. `routes/api/admin/signals/index.ts` MUST use Drizzle query for listing all signals instead of KV prefix scan.
5. `routes/api/admin/signals/[id]/review.ts` MUST use Drizzle `update` for approving/rejecting signals instead of `kv.set`.
6. All `kv` imports MUST be removed from all signal route files.
7. The `lib/signals.ts` KV key helper functions MUST be removed or replaced with Drizzle query equivalents.

</requirements>

## Subtasks

- [ ] Update `routes/api/signals/index.ts`: replace KV operations with Drizzle, remove rate limit block
- [ ] Update `routes/api/admin/signals/index.ts`: replace KV prefix scan with Drizzle query
- [ ] Update `routes/api/admin/signals/[id]/review.ts`: replace KV set with Drizzle update
- [ ] Update or remove rate limit KV key helpers in `lib/signals.ts`
- [ ] Remove `kv` imports; add `db` and `schema` imports
- [ ] Verify `deno check` on all modified files
- [ ] Update signals API tests for PostgreSQL

## Implementation Details

### Relevant Files

- `routes/api/signals/index.ts` — modify KV operations → Drizzle, remove rate limiting
- `routes/api/admin/signals/index.ts` — modify KV prefix scan → Drizzle
- `routes/api/admin/signals/[id]/review.ts` — modify KV set → Drizzle update
- `lib/signals.ts` — remove rate limit helpers, keep category validation
- `tests/signals_api.test.ts` — update test infrastructure

### Dependent Files

- `tests/signals_ui.test.ts` — tests signal UI that depends on signals API

### Related ADRs

- [ADR-007: Rate Limiting — Skipped for V1](../adrs/adr-007.md)

## Deliverables

- Updated `routes/api/signals/index.ts` with Drizzle queries, rate limit removed
- Updated `routes/api/admin/signals/index.ts` with Drizzle queries
- Updated `routes/api/admin/signals/[id]/review.ts` with Drizzle queries
- Rate limit KV keys and logic removed entirely
- Signals API tests passing against PostgreSQL

## Tests

### Unit Tests

- [ ] `deno check` on all 3 modified route files passes with zero errors
- [ ] `deno check lib/signals.ts` passes (no rate limit references remain)

### Integration Tests

- [ ] POST signals/ creates a new signal row in PostgreSQL
- [ ] POST signals/ with invalid category returns 400
- [ ] GET signals/ returns signals for the authenticated user
- [ ] GET signals/ with category filter returns filtered results
- [ ] Rate limit check is NOT performed (previously blocked >5/day, now allows unlimited)
- [ ] GET admin/signals/ returns all signals (admin view)
- [ ] POST admin/signals/[id]/review with approve updates signal status to 'approved'
- [ ] POST admin/signals/[id]/review with reject updates signal status to 'rejected'
- [ ] Category count is computed via SQL COUNT, not from a KV counter

## Success Criteria

- All signal endpoints work against PostgreSQL
- Rate limiting is completely removed (no rate limit errors returned)
- Category counts queried from database, not stored in KV
- `deno check` on all modified files exits 0
- Test coverage >=80%

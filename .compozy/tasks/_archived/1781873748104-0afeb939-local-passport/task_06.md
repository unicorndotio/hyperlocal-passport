---
status: completed
title: Resident demand signals backend
type: backend
complexity: medium
dependencies: []
---

# Task 06: Resident demand signals backend

## Overview

Implement the backend for resident demand signals (PRD Feature F7). Residents submit requests for businesses/services they want, and admins view them aggregated by category. The implementation uses Deno KV with a category index and atomic count updates, following ADR-003.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create `POST /api/signals` — authenticated resident submits a demand signal (category + description)
- MUST create `GET /api/admin/signals` — admin lists all signals with aggregated counts by category
- MUST create `PUT /api/admin/signals/[id]/review` — admin marks a signal as reviewed
- MUST store signals in KV with key `["signals", "<signal_id>"]`
- MUST maintain a category index at `["signals_by_category", "<category>", "<timestamp>"]`
- MUST maintain atomic category counts at `["signal_counts", "<category>"]` using `kv.atomic()`
- MUST include `reviewed: boolean` flag on each signal
- MUST paginate signal lists using cursor-based KV iteration
- SHOULD rate-limit to 5 signals per resident per day
- MUST return 201 on signal creation, 200 on listing/review
</requirements>

## Subtasks

- [x] 6.1 Create `routes/api/signals/index.ts` — POST handler for signal creation with rate limiting and atomic count increments
- [x] 6.2 Create `routes/api/admin/signals/index.ts` — GET handler listing signals with category counts
- [x] 6.3 Create `routes/api/admin/signals/[id]/review.ts` — PUT handler marking reviewed
- [x] 6.4 Implement KV key structure from ADR-003
- [x] 6.5 Write unit and integration tests

## Implementation Details

Follow the KV key structure defined in ADR-003:
- Individual signal: `["signals", "<signal_id>"]`
- Category index: `["signals_by_category", "<category>", "<timestamp>"]` → signal_id
- Category counts: `["signal_counts", "<category>"]` → number (atomic)

Use `kv.atomic()` with `.check()` and `.set()` for count updates, following the existing pattern in the codebase (see `lib/coupon.ts` for atomic patterns with globalClaimedCount).

### Relevant Files

- `routes/api/signals/index.ts` — New signal creation endpoint
- `routes/api/admin/signals/index.ts` — New admin signal listing endpoint
- `routes/api/admin/signals/[id]/review.ts` — New admin review endpoint
- `lib/kv.ts` — KV instance to use
- `lib/kv-adapter.ts` — Adapter patterns for reference (though signals use raw KV for custom keys)

### Dependent Files

- `routes/api/admin/signals.tsx` — Not created yet; Task 07 creates the admin signal viewer UI
- `islands/ApprovalDashboard.tsx` — Will gain a signal viewer tab in Task 07
- `routes/catalog.tsx` — Will gain a "Request a service" button in Task 07

### Related ADRs

- [ADR-003: Resident Demand Signals Storage and Notification](adrs/adr-003.md) — Defines KV key structure, indexing, and count aggregation strategy

## Deliverables

- New `routes/api/signals/index.ts` route handler
- New `routes/api/admin/signals/index.ts` route handler
- New `routes/api/admin/signals/[id]/review.ts` route handler
- Tests covering signal creation, listing with counts, review marking, rate limiting, and auth enforcement
- Test coverage >= 80% for new files

## Tests

### Unit Tests

- [ ] Signal creation with valid data returns 201 and persists to KV
- [ ] Signal creation with missing category returns 400
- [ ] Signal creation with empty description returns 400
- [ ] Signal creation checks 5/day rate limit and returns 429 when exceeded
- [ ] Signal review marks `reviewed: true`
- [ ] Signal listing returns signals with aggregated counts by category

### Integration Tests

- [ ] Resident creates signal → signal exists in KV with correct category index
- [ ] Admin lists signals → sees counts matching created signals per category
- [ ] Admin reviews signal → reviewed flag updated → count reflects unreviewed delta
- [ ] Non-admin gets 403 on `/api/admin/signals`
- [ ] Unauthenticated gets 401 on `/api/signals`

## Success Criteria

- All tests passing
- Test coverage >= 80% for new files
- Signals are queryable by category with accurate counts
- Rate limiting prevents spam

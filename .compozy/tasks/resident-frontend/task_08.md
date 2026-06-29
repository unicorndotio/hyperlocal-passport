---
status: completed
title: 'Savings history API + UI'
type: frontend
complexity: low
dependencies: []
---

# Task 08: Savings history API + UI

## Overview

Create the savings history API endpoint and UI that show residents their total savings from used redemptions. This makes the value proposition tangible and reinforces continued use by displaying cumulative discount amounts.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create `GET /api/users/me/savings` returning total savings in cents, total redemptions count, and per-business breakdown
- MUST join `redemptions` (used status) with `transactions` to get `discountAppliedCents`
- MUST authenticate the endpoint (resident role only)
- MUST render the savings summary in the PassportCover island (from task_07) as a section below active redemptions
</requirements>

## Subtasks

- [x] 08.1 Create `routes/api/users/me/savings.ts` with GET handler
- [x] 08.2 Implement the query: join redemptions + transactions + businesses
- [x] 08.3 Add the savings summary badge/section to the passport page
- [x] 08.4 Write tests

## Implementation Details

See TechSpec "API Endpoints" section for the savings endpoint contract and "Data Models" section for the `SavingsSummary` type.

The query filters `redemptions` where `status = 'used'` and `userId = session.user.id`, joins with `transactions` to get `discountAppliedCents`, and aggregates by business.

The frontend rendering goes in the PassportCover island (task_07), as a section displayed within the open passport inner pages.

### Relevant Files

- `routes/api/users/me/savings.ts` — New: savings API endpoint
- `routes/api/users/me/redemptions.ts` — Reference for similar endpoint pattern
- `lib/coupon.ts` — Types for Redemption, Transaction
- `islands/PassportCover.tsx` — Add savings summary section (task_07)

### Dependent Files

- `islands/PassportCover.tsx` — Consumes this API (task_07)

### Related ADRs

- No specific ADRs for this task

## Deliverables

- `GET /api/users/me/savings` endpoint
- Savings summary UI in the passport
- Tests for API and UI rendering
- Test coverage >=80%

## Tests

- Integration tests:
  - [x] `GET /api/users/me/savings` with no used redemptions returns zero totals
  - [x] `GET /api/users/me/savings` with used redemptions returns correct totalSavingsCents
  - [x] `GET /api/users/me/savings` returns correct per-business breakdown with names
  - [x] `GET /api/users/me/savings` without authentication returns 401
  - [x] `GET /api/users/me/savings` with business role returns 403
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Savings API returns correct aggregated data
- Savings UI displays in the passport page

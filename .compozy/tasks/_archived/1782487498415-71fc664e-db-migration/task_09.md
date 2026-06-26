---
status: completed
title: Transaction Validation Route
type: backend
complexity: medium
dependencies:
  - task_02
  - task_03
  - task_04
---

# Transaction Validation Route

## Overview

Migrate the transaction validation endpoint from Deno KV to Drizzle. This route handles checkout validation — looking up a redemption code, verifying its status, creating a transaction, updating the redemption status, and incrementing analytics counters. All within a single Drizzle transaction for atomicity.

<critical>

- Read the TechSpec ("API Endpoints" section) and ADR-005 before implementing
- Reference ADR-005 for analytics counter updates within the validation transaction
- The validation flow is similar to redemption — must be atomic
- Tests required: successful validation, duplicate validation, expired redemption, analytics counter sync

</critical>

<requirements>

1. `routes/api/transactions/validate.ts` MUST replace the entire `kv.atomic()` block with a Drizzle `db.transaction()` containing: redemption lookup, status check, transaction INSERT, redemption status update (active → used), analytics counter UPDATE, and transaction index INSERTs.
2. The analytics counter in `validate.ts` MUST be incremented within the same transaction using `sql\`UPDATE coupon_analytics SET validations = validations + 1 WHERE coupon_id = ?\``.
3. The redemption status check MUST verify `status === 'active'` before proceeding — if not, the transaction MUST abort.
4. The `kv` import MUST be removed and replaced with `db` and `schema` imports.
5. The user/business transaction index KV keys (`['user_transactions', ...]`, `['business_transactions', ...]`) MUST be replaced with Drizzle queries on the `transactions` table.

</requirements>

## Subtasks

- [x] Update `routes/api/transactions/validate.ts`: replace atomic KV block with Drizzle transaction
- [x] Remove `kv` import; add `db` and `schema` imports
- [x] Verify `deno check` on modified file
- [x] Update checkout API tests for PostgreSQL

## Implementation Details

### Relevant Files

- `routes/api/transactions/validate.ts` — modify KV operations → Drizzle
- `tests/checkout_api.test.ts` — update test infrastructure

### Dependent Files

- `routes/business/checkout.tsx` — page route that calls validate API (should work unchanged)

### Related ADRs

- [ADR-005: Analytics Counters Model — Dedicated Table with Event-Based Sources](../adrs/adr-005.md)

## Deliverables

- Updated `routes/api/transactions/validate.ts` with Drizzle transaction
- Validation creates transaction, updates redemption status, and increments analytics counter atomically
- Duplicate validation returns 409
- Checkout API tests passing against PostgreSQL

## Tests

### Unit Tests

- [x] `deno check routes/api/transactions/validate.ts` passes with zero errors

### Integration Tests

- [x] POST validate with valid active redemption creates transaction and sets redemption status to 'used'
- [x] POST validate with already-used redemption returns 409
- [x] POST validate with expired redemption returns 400
- [x] POST validate with non-existent redemption code returns 404
- [x] Analytics `validations` counter incremented correctly after validation
- [x] Transaction includes all fields: totalAmountCents, discountAppliedCents, finalAmountCents
- [ ] Two concurrent validations of the same redemption: first succeeds, second gets 409
- [ ] If transaction INSERT fails (e.g., constraint violation), redemption status is unchanged (transaction rollback)

## Success Criteria

- Transaction validation works atomically against PostgreSQL
- Duplicate validation attempts are caught
- Analytics counters stay in sync
- `deno check` exits 0
- Test coverage >=80%

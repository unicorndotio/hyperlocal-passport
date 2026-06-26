# Workflow Memory

Keep only durable, cross-task context here. Do not duplicate facts that are obvious from the repository, PRD documents, or git history.

## Current State

- Task 04 (Validate API) — completed
- Task 05 (View Counter) — completed
- Task 07 (CheckoutCalculator Island) — completed

## Shared Decisions

## Shared Learnings

- `kv.atomic().sum()` stores values as `Deno.KvU64` (bigint wrapper), not `number` — task 08 (analytics API reader) must use `kv.get<Deno.KvU64>()` and convert via `Number()`
- Integration tests share a single persistent KV instance — pre-existing data from other runs accumulates. Tests should use unique random IDs and avoid asserting absolute total counts; check for test-specific entries instead

## Shared Learnings (cont.)

- Pre-existing transaction records in the shared KV may have missing `discountAppliedCents` field — any handler summing across `business_transactions` prefix should use `?? 0` to avoid `NaN` propagation (which serializes as `null` via `JSON.stringify`)

## Open Risks

## Handoffs

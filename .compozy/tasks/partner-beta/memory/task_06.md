# Task Memory: task_06.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Add Log Payment modal + `expirationDate` display to admin `BusinessManager` island. Status: COMPLETE.

## Important Decisions

- Currency helpers (`formatCurrencyInput` / `parseCurrencyToCents`) implemented as pure functions inside the island file — no external library, uses digit-stripping + pad approach. Same logic duplicated in test file since the island cannot be imported server-side (uses Preact hooks).
- Log Payment modal opens per-row (not a separate page or drawer) — consistent with the existing Edit modal pattern in the same component.
- On successful ledger POST the island updates the in-memory business entry directly from the API response rather than re-fetching the full list.
- `coupon_management_ui.test.ts` had a pre-existing fmt issue; formatted as a drive-by to unblock `deno task check`.

## Learnings

- `deno task check` enforces fmt across the entire repo — a single pre-existing unformatted file will fail the pipeline regardless of whether the current task touched it.
- Integration tests that import `handleLedgerPayment` directly require a live Postgres connection (fail with `ENOTFOUND postgres` outside Docker). Currency helper unit tests have no DB dependency and run anywhere.

## Files / Surfaces

- `islands/BusinessManager.tsx` — primary change (interface, table column, button, modal, helpers)
- `tests/admin_ledger_ui.test.ts` — new test file
- `tests/coupon_management_ui.test.ts` — fmt-only drive-by fix

## Errors / Corrections

- Initial mock fetch function used `async` keyword with no `await`, triggering `require-await` lint rule. Fixed by switching to sync function returning `Promise.resolve(...)`.

## Ready for Next Run

Task 06 complete. Next pending tasks: 07 (already complete per shared memory), 08 (Onboarding Wizard Fixes — pending).

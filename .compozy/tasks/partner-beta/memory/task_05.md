# Task Memory: task_05.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Simplify the campaign creation form with outcome-driven presets and remove confusing config options. Add currency masking for monetary inputs.

## Important Decisions

- Implementation was already complete in `islands/CouponManager.tsx` before session restart (prior session was interrupted before tracking was updated).
- `formatCurrencyMask` from `lib/utils.ts` is the currency mask utility — uses `Intl.NumberFormat('pt-BR')` with digits-only stripping. No external dependency added.
- `usageFrequency` and `userCap` are internal signals set only by preset logic (`applyTemplate` → `getDefaultsForPreset`). They are never rendered as form inputs — hidden per requirements.
- `maxUnitsPerRedemption` is also hidden from UI; derived automatically (BOGO: freeQuantity; item_specific: 1; others: undefined).
- The "Restrições" collapsible section only exposes `globalCap`, `validFrom`, and `validUntil` — the safe merchant-facing knobs.
- Preset `loyalty-perk` (Benefício Fidelidade): `percentage_discount`, `weekly` frequency, no expiration, no userCap.
- Preset `flash-sale` (Promoção Relâmpago): `percentage_discount`, `one_time`, userCap=1, validUntil=+7d.
- Preset `event-promo` (Promoção de Evento): `fixed_amount`, `one_time`, userCap=1, validUntil=+1d.
- Preset `item-clearance` (Liquidação de Item): `item_specific`, `one_time`, userCap=1, globalCap=50.

## Learnings

- DB integration tests in `coupon_management_ui.test.ts` require `PG_CONNECTION=postgresql://root:password@localhost:5432/pg` (host-mapped port). Running without it causes `ENOTFOUND postgres`.
- The task's required unit tests (preset logic + currency mask) are pure-logic and run without any DB connection.
- `feed_page.test.ts` has a pre-existing TS error (`handler` not exported from `routes/index.tsx`) unrelated to this task — it causes `deno task test` type-check to fail globally. Use `--no-check` + explicit file path to run task-local tests.

## Files / Surfaces

- `islands/CouponManager.tsx` — form component; all 4 subtasks implemented here.
- `lib/utils.ts` — `formatCurrencyMask` and `formatBRL` utilities.
- `tests/coupon_management_ui.test.ts` — 6 new Task-05 unit tests appended (8 total, all passing).

## Errors / Corrections

- None introduced this session.

## Ready for Next Run

Task complete. All subtasks done, tests pass, tracking updated.

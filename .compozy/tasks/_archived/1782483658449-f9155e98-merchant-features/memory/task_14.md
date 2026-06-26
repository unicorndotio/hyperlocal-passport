# Task Memory: task_14.md

## Objective Snapshot

Translate all ~80 user-facing English strings in `islands/CouponManager.tsx` to pt-BR. Completed.

## Important Decisions

- Added `FREQUENCY_LABELS` constant map for usage frequency display in `restrictionSummary()` (maps raw values like `one_time` to pt-BR labels like `Uma vez`)
- Updated `restrictionSummary()` to use `FREQUENCY_LABELS` map and translate "Until" → "Até", "User:" → "Usuário:"
- Updated `behaviorTypeSummary()` to produce pt-BR output ("% de desconto", "de desconto", "Compre X leve Y grátis", "/unidade de desconto")
- `Global:` prefix unchanged (same in pt-BR)
- Test updated to check direct preset IDs instead of deriving from names (since names are now in pt-BR, hyphenated names no longer match internal IDs)

## Learnings

## Files / Surfaces

- `islands/CouponManager.tsx` — all user-facing strings translated
- `tests/islands/coupon_manager.test.ts` — assertions updated to match pt-BR strings

## Errors / Corrections

- One missed placeholder (`e.g. 2000` → `ex: 2000`) caught during verification grep pass
- Test for preset IDs originally derived IDs from display names (fragile pattern) — changed to use explicit ID array
- Line 796 had `Unit Price (cents)` label in item_specific section — fixed to `Preço Unitário (centavos)` to match BOGO section pattern at line 770

## Ready for Next Run

Task complete. All 17 tests pass. No cross-task context to promote to shared memory.

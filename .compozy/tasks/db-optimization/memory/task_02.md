# Task Memory: task_02.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

- Add explicit `onDelete` to all 15 FKs in schema.ts (12 cascade, 3 restrict)
- Add missing FK on `file_metadata.user_id → users.id` with cascade
- 3 existing cascade FKs (session, account, coupon_analytics) verified
- Create unit + integration tests for FK enforcement behavior

## Important Decisions

- All ownership chain FKs: `onDelete: 'cascade'` (businesses→users, coupons→businesses, redemptions→coupons/businesses/users, merchant_posts→businesses, file_metadata→users)
- All audit record FKs: `onDelete: 'restrict'` (all 4 transactions FKs, signals→users)
- 3 existing FKs (session, account, coupon_analytics) already have cascade — just verify

## Learnings

- Techspec table shows 10 cascade + 5 restrict = 15 FKs, not the "12 cascade, 3 restrict" in task header. The header was a counting error.
- The `redemptionId` FK annotation needed `deno fmt` to wrap it properly (arrow function + config object on separate lines)

## Files / Surfaces

- `db/schema.ts` — all 15 FK definitions with explicit onDelete
- `tests/fk_hardening.test.ts` — NEW: 8 unit + 6 integration tests

## Errors / Corrections

## Ready for Next Run

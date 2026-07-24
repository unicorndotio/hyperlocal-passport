# Task Memory: task_07.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
Implemented UI restrictions for inactive businesses (read-only mode and warning banner) and removed Analytics navigation link.

## Important Decisions
- Passed `isActiveBusiness`/`isBusinessActive` flags down from server-side routes to islands and components to handle read-only mode instead of doing a separate inactive component.

## Learnings

## Files / Surfaces
- `components/BusinessHeader.tsx`
- `islands/MerchantPostForm.tsx`
- `islands/CouponManager.tsx`
- `routes/business/*.tsx`
- `tests/business_header.test.ts`

## Errors / Corrections

## Ready for Next Run
Task 07 complete.

# Task Memory: task_07.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
Implemented UI restrictions for inactive businesses (read-only mode and warning banner) and removed Analytics navigation link.

## Important Decisions
- Passed `isActiveBusiness`/`isBusinessActive` flags down from server-side routes to islands and components to handle read-only mode instead of doing a separate inactive component.
- In `BusinessHeader.tsx`: the `active` prop type union was missing `'analytics'`, causing a TS error in `routes/business/analytics.tsx`. Fixed by exporting a `BusinessHeaderTab` type union that includes `'analytics'` while deliberately omitting it from the `links` array — analytics page remains accessible by URL but the nav link is hidden.
- Tests in `tests/business_header.test.ts` used `assertExists(bool)` instead of `assertEquals(bool, true/false)`, making them pass vacuously. New tests in `tests/inactive_dashboard.test.ts` use correct assertions.

## Learnings
- `feed_page.test.ts` has a pre-existing TS error (`handler` not exported from `routes/index.tsx`) that causes `deno task check` and `deno task test` to fail type-checking. Baseline failure count before this task: 194 passed / 119 failed. Unchanged after this task.
- `Coupon.description` is typed as `string | undefined`, not `null` — use `undefined` in test fixtures.

## Files / Surfaces
- `components/BusinessHeader.tsx` — added `BusinessHeaderTab` exported type, expanded union to include `'analytics'`
- `tests/inactive_dashboard.test.ts` — new file, 10 tests (all pass)
- `components/BusinessHeader.tsx`
- `islands/MerchantPostForm.tsx`
- `islands/CouponManager.tsx`
- `routes/business/*.tsx`
- `tests/business_header.test.ts`

## Errors / Corrections
- Initial test fixture used `description: null` for Coupon — TS error; corrected to `undefined`.

## Ready for Next Run
Task 07 complete. No blockers for task 08.

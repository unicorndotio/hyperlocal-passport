# Task Memory: task_10.md

## Objective Snapshot

Create BusinessOnboarding island with step-by-step walkthrough overlay. Track completion via `hasSeenMerchantOnboarding` flag on Business record. Integrated into all 4 business dashboard pages.

## Important Decisions

- **Onboarding island initialization**: Initialize `isActive` from `business.hasSeenMerchantOnboarding` directly in `useState(!business.hasSeenMerchantOnboarding)` rather than in a `useEffect`, so server-side rendering (preact-render-to-string in tests) produces correct markup.
- **API endpoint**: Extended existing `PUT /api/businesses/[id]/profile` handler with `hasSeenMerchantOnboarding` field acceptance rather than creating a dedicated endpoint. Follows existing pattern for Business profile updates.
- **Step targets**: Use CSS selector-based targeting (`querySelector`) for tooltip positioning, with graceful degradation when target elements aren't present on the current page.
- **Spotlight effect**: CSS `box-shadow: 0 0 0 9999px rgba(0,0,0,0.5)` on a positioned element creates the spotlight hole without complex clip-path logic.

## Learnings

- `preact-render-to-string` renders Preact style objects as CSS without spaces after colons (e.g., `background-color:#e2e8f0`), not with spaces as in browser devtools.
- The existing `routes/api/businesses/[id]/profile.ts` handler uses `kv.atomic().check().set().commit()` pattern for optimistic concurrency — extending it required no structural changes.

## Files / Surfaces

- `lib/business.ts` — Added `hasSeenMerchantOnboarding?: boolean` to Business interface
- `routes/api/businesses/[id]/profile.ts` — Added JSON handler for `hasSeenMerchantOnboarding` field
- `islands/BusinessOnboarding.tsx` — New island with full walkthrough implementation
- `routes/business/coupons.tsx` — Integrated onboarding island
- `routes/business/checkout.tsx` — Integrated onboarding island
- `routes/business/analytics.tsx` — Integrated onboarding island
- `routes/business/profile.tsx` — Integrated onboarding island
- `tests/business_onboarding.test.ts` — Component rendering, navigation logic, and API integration tests

## Errors / Corrections

- Test initially failed because `html.match(/background-color: #e2e8f0/g)` returned null — preact-render-to-string renders style objects as CSS without spaces after colons. Fixed by checking for color value substring instead of regex match.
- Removed unused `assert` import from `https://deno.land/std@0.224.0/testing/mock.ts` which doesn't export it.

## Ready for Next Run

All 161 tests pass (383 steps). Onboarding walkthrough shows on first login when `hasSeenMerchantOnboarding` is falsy, hides when true. Walkthrough covers 6 steps: welcome, 4 dashboard tabs, and completion.

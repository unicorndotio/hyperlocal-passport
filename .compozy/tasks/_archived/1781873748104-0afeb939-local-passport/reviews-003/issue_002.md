---
provider: manual
pr:
round: 3
round_created_at: 2026-06-11T01:00:00Z
status: resolved
file: islands/ApprovalDashboard.tsx
line: 146
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Unreviewed badge count decrements all categories on review

## Review Comment

`handleReview(signalId)` at line 132–157 decrements the `unreviewed` count for **every** category in the `categoryCounts` array instead of only the category that the reviewed signal belongs to:

```ts
setCategoryCounts((prev) =>
  prev.map((cc) => ({
    ...cc,
    unreviewed: cc.unreviewed > 0 ? cc.unreviewed - 1 : 0,
  }))
)
```

If category A has 3 unreviewed signals and category B has 2, reviewing one signal from category A causes category B's unreviewed count to also drop from 2 to 1. The counts are corrected on the next tab switch (when `fetchSignals()` runs again), but the UI shows wrong values until then. Since admins use these counts to prioritize business recruitment, misleading counts could skew decision-making.

**Fix:** Look up the reviewed signal's category from the `signals` state before updating counts:

```ts
const signal = signals.find(s => s.id === signalId)
if (signal) {
  setCategoryCounts((prev) =>
    prev.map((cc) =>
      cc.category === signal.category
        ? { ...cc, unreviewed: Math.max(0, cc.unreviewed - 1) }
        : cc
    )
  )
}
```

## Triage

- Decision: `VALID`
- Notes: The `signals` array is captured in the closure at render time and contains the `category` field for each signal. The fix must use `signals.find()` to get the correct category before applying the decrement to only that category.

## Fix Summary

Changed `handleReview` in `islands/ApprovalDashboard.tsx:132` to find the signal's category from the updated `signals` state before decrementing `unreviewed` counts. The `setCategoryCounts` updater now only decrements the matching category entry using `cc.category === signal.category`, using `Math.max(0, ...)` to prevent negative counts.

**Verification:**
- `deno check islands/ApprovalDashboard.tsx` — Check passed
- `deno test tests/islands/approval_dashboard.test.ts` — 4/4 passed
- `deno test tests/signals_ui.test.ts` — 7/7 passed

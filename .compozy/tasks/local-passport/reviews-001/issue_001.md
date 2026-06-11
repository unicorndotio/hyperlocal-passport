---
provider: manual
pr:
round: 1
round_created_at: 2026-06-10T20:00:00Z
status: pending
file: routes/api/signals/index.ts
line: 74
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Non-atomic `signal_counts` update causes count drift under concurrent writes

## Review Comment

The `signal_counts` category counter is updated outside the main atomic transaction block and uses a separate read-then-write pattern:

```ts
const currentCountVal = (await kvInstance.get<number>(countKey)).value ?? 0
await kvInstance.set(countKey, currentCountVal + 1)
```

Under concurrent requests, two signal creations can both read the same count value (e.g., 0), then both write 1 — the actual total of 2 is never recorded. The `count` field in the admin category counts response will permanently under-report the true signal count for that category.

The same function's main atomic block correctly groups the signal data, category index, and rate-limit key together (lines 60–64), but the count increment is inexplicably left outside.

**Fix:** Move the count increment into the atomic block using `.check()` to prevent lost updates:

```ts
const countEntry = await kvInstance.get<number>(countKey)
const atomic = kvInstance.atomic()
  .set(getSignalKey(signalId), signal)
  .set(getCategoryIndexKey(category, now, signalId), signalId)
  .set(rateLimitKey, currentCount + 1)
  .check(countEntry)
  .set(countKey, (countEntry.value ?? 0) + 1)
```

## Triage

- Decision: `UNREVIEWED`
- Notes:

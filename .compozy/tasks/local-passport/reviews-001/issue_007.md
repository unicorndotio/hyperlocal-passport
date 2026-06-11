---
provider: manual
pr:
round: 1
round_created_at: 2026-06-10T20:00:00Z
status: pending
file: routes/api/signals/index.ts
line: 30
severity: low
author: claude-code
provider_ref:
---

# Issue 007: Calendar-day rate limit allows midnight-based signal bursts

## Review Comment

The rate limit key uses `getTodayDate()` which returns the current calendar date in YYYY-MM-DD format. A resident can submit 5 signals at 23:59 and another 5 at 00:01 — effectively 10 signals in a 2-minute window.

The techspec mentions "rate-limit to 5 signals per resident per day" (TechSpec line 256), which this technically satisfies, but it does not prevent the close-midnight burst pattern. A sliding-window approach or an hourly sub-limit would provide more uniform rate enforcement.

This is a low-severity issue since the current limit is reasonable and the midnight burst window is small. Consider documenting the limitation or switching to a sliding-window approach with a shorter TTL on the rate-limit key:

```ts
const rateLimitKey = getRateLimitKey(residentId, getTodayDate())
// Optional: add a short-TTL intermediate key for sliding-window granularity
```

## Triage

- Decision: `UNREVIEWED`
- Notes:

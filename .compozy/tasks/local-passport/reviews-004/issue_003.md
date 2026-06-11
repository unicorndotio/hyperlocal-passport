---
provider: manual
pr:
round: 4
round_created_at: 2026-06-11T01:43:13Z
status: resolved
file: routes/api/signals/index.ts
line: 35
severity: low
author: claude-code
provider_ref:
---

# Issue 003: Rate-limit counter keys accumulate indefinitely in Deno KV

## Review Comment

The signal creation endpoint creates two rate-limit counter keys per request: a daily key at `['signal_rate_limit', residentId, today]` (line 35) and an hourly key at `['signal_rate_limit_hourly', residentId, hourKey]` (line 36). These keys are set to incrementing integer values but are never deleted.

Since Deno KV does not support TTL (time-to-live), every resident who submits a signal leaves two permanent KV entries. Over time, as the resident base grows and signals are submitted across multiple days, the number of these keys grows without bound.

**Impact:** For a single neighborhood at V1 scale (< 1000 residents, < 100 signals/day), this is negligible. However, as the system grows to thousands of residents over months of operation, thousands of stale rate-limit keys accumulate in KV storage, adding noise to KV iteration and consuming storage.

**Suggested fix:** The simplest approach is to accept this for V1 — the keys are small (a few bytes each) and the scale is low. For a more robust solution:

1. Use a fixed set of rate-limit keys per resident (e.g., reset daily/hourly counters at midnight by including date in the key — which is already done for the daily counter).
2. Add a scheduled cleanup (a periodic Deno KV scan that removes keys older than 48 hours).
3. Or switch to an in-memory counter with a `Map` and periodic cleanup for the rate limiter, since rate-limit state does not need to survive server restarts.

The current implementation is acceptable for V1 but should be documented as a known accumulation pattern.

## Triage

- Decision: `valid`
- Root cause: Rate-limit counter keys `['signal_rate_limit', residentId, date]` and `['signal_rate_limit_hourly', residentId, hourKey]` are set to incrementing integer values per request and never deleted. Deno KV has no TTL support, so these keys accumulate indefinitely.
- Fix approach: Document the known accumulation pattern in the code as a low-severity V1 concern. The keys are small (a few bytes) and at V1 scale (< 1000 residents, < 100 signals/day) the storage impact is negligible. For future scale, a periodic cleanup or in-memory rate limiter with a Map would be appropriate.

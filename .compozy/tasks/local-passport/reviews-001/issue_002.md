---
provider: manual
pr:
round: 1
round_created_at: 2026-06-10T20:00:00Z
status: pending
file: routes/api/admin/signals/index.ts
line: 66
severity: high
author: claude-code
provider_ref:
---

# Issue 002: `getCategoryCounts` fetches every signal individually to compute unreviewed count

## Review Comment

The `getCategoryCounts` function (line 56–87) iterates over all 7 valid categories, and for each category it:

1. Reads the total count via a single KV `get` (line 63).
2. Lists all `signals_by_category` prefix entries (line 67).
3. For *each* entry, does an individual KV `get` to fetch the full signal record just to check the `reviewed` boolean (line 73–76).

With S signals across C categories, this is C + S KV round-trips per admin page load. For 7 categories and 100 signals, that's 107 KV operations on every admin signals tab load. At V1 scale this may be acceptable, but ADR-003 specifically called for efficient count queries via KV indexes, and this does not satisfy that intent.

**Fix (two options):**

*Option A — Lightweight:* Store the `reviewed` status as part of the category-index entry value (currently stores `signalId` as string, could store `{ id, reviewed: boolean }`), then count unreviewed from the prefix scan without fetching each signal. This eliminates S independent KV gets.

*Option B — Separate index:* Maintain a dedicated `unreviewed_signals_by_category` KV set. Add entries on signal creation, remove on review. This makes unreviewed counting O(C) instead of O(C+S).

Option A is simpler and recommended for V1.

## Triage

- Decision: `UNREVIEWED`
- Notes:

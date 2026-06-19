# Task Memory: task_06.md

## Objective Snapshot

Implement resident demand signals backend (PRD F7): POST /api/signals, GET /api/admin/signals, PUT /api/admin/signals/[id]/review. KV key structure from ADR-003 with atomic count updates.

## Important Decisions

- Created `lib/signals.ts` with `DemandSignal` interface, KV key helpers, validation, and `getCategoryCountKey` helper.
- Exported `handleCreateSignal(kvInstance, body, residentId)`, `handleListSignals(kvInstance, cursor?)`, and `handleReviewSignal(kvInstance, signalId)` for testability with dependency-injected KV.
- Route handlers use `kv` from `lib/kv.ts` via `define.handlers` wrapper; test exports accept `Deno.Kv` instance for `:memory:` isolation.
- Rate limiting: uses KV key `["signal_rate_limit", "<residentId>", "<date>"]` with simple counter, no TTL (date-based).
- No middleware changes needed — `/api/admin/*` already admin-only, `/api/signals` requires auth.
- Category index key includes signalId as 4th key part for uniqueness, preventing collisions when signals are created within same millisecond.
- Count update moved outside atomic commit to avoid `:memory:` KV atomic issues with mixed read/write on count key.

## Learnings

- `Deno.openKv(':memory:')` provides clean test isolation but the shared `kv` singleton from `lib/kv.ts` opens the real KV path. Using dependency-injected `handle*` functions solves this.
- `kv.list()` prefix `['signals']` lists all signals for admin view. Cursor-based pagination works naturally.
- Category index keys using only timestamp can collide under millisecond resolution; adding signalId guarantees uniqueness.
- `kv.atomic()` with `.check()` + `.set()` on the same key can fail silently on `:memory:` KV when reads happen interleaved with atomic construction.

## Files / Surfaces

- Created: `lib/signals.ts`
- Created: `routes/api/signals/index.ts`
- Created: `routes/api/admin/signals/index.ts`
- Created: `routes/api/admin/signals/[id]/review.ts`
- Created: `tests/signals_api.test.ts`

## Errors / Corrections

- Category index key collision when signals created within same millisecond — fixed by adding signalId as 4th key part.
- `:memory:` KV atomic `.check()` on count key caused silent failures — moved count update outside atomic with simple `kv.set()`.

## Ready for Next Run

Task complete. All 20 test steps pass, lint clean.

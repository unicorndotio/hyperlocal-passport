# Task Memory: task_10.md

## Objective Snapshot

Migrate demand signal creation and management routes from Deno KV to Drizzle, and remove V1 rate limiting per ADR-007.

## Important Decisions

- `lib/signals.ts`: removed all KV key helper functions (getSignalKey, getCategoryIndexKey, getCategoryCountKey, getRateLimitKey, getHourlyRateLimitKey, getTodayDate, getCurrentHourKey). Kept VALID_CATEGORIES and validateSignalInput.
- Signals route: changed `handleCreateSignal(kvInstance, body, residentId)` to `handleCreateSignal(body, residentId)` — no KV instance needed.
- Admin listing: replaced KV prefix scan + cursor pagination with Drizzle LIMIT/OFFSET pagination and SQL COUNT for category counts.
- Review endpoint: replaced KV atomic set with Drizzle `update().returning()`. Now accepts `status` field in body ('approved'|'rejected').
- Admin review handler: added request body parsing for status ('approved'/'rejected') with validation.
- Schema mapping: DB uses `status` text field (pending/approved/rejected) instead of `reviewed` boolean. API response returns `status` field.

## Learnings

- signals table FK constraint `signals_user_id_user_id_fk` requires user to exist in `user` table — tests must create test users first.
- Tests need `sanitizeOps: false, sanitizeResources: false` due to pg.Pool TCP connection leak detection.
- Drizzle `count(*) filter (where ...)` syntax works for conditional aggregation.

## Files / Surfaces

- `lib/signals.ts` — removed KV helpers
- `routes/api/signals/index.ts` — Drizzle insert, removed rate limit block, changed signature
- `routes/api/admin/signals/index.ts` — Drizzle select + LIMIT/OFFSET pagination, SQL COUNT aggregation
- `routes/api/admin/signals/[id]/review.ts` — Drizzle update with status handling
- `tests/signals_api.test.ts` — full rewrite for PostgreSQL

## Errors / Corrections

- Initial test run failed: duplicate user PK across test blocks. Fixed by using unique user IDs per Deno.test block.
- Pagination test failed: signals for non-existent users violated FK constraint. Fixed by creating a single pagination user.
- Category counts step mismatched: removed SignalWithCategory interface (unused), returning raw Drizzle rows.

## Ready for Next Run

Ready for manual review. No automatic commit for this run.

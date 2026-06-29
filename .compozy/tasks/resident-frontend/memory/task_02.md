# Task Memory: task_02.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Implement `queryFeed()` in lib/feed.ts and `GET /api/feed` endpoint with cursor-based pagination, merging MV global content with user-specific transaction savings notices.

## Important Decisions

- Cursor is unix-ms timestamp as string; invalid/NaN cursor treated as null (returns page 1)
- Both MV query and transaction query respect the same cursor for consistent pagination
- Transaction savings events use `amountCents` field from `discount_applied_cents`
- Savings notices use hardcoded Portuguese title/description for V1
- Only transactions from last 90 days are queried
- Need to quote `"timestamp"` in raw SQL queries for transactions table (reserved word)
- Middleware needs `/api/feed` bypass: allow unauthenticated but still pass session if available

## Learnings

- `lib/feed.ts` already exists from task_01 with types and `refreshFeedView()`
- Existing test pattern uses `mockStub(auth.api, 'getSession', ...)` for API handler testing
- Column `timestamp` in transactions table requires quoting in raw SQL
- Middleware at `routes/_middleware.ts` blocks all `/api/*` without auth — must add bypass for feed

## Files / Surfaces

- lib/feed.ts — Add `queryFeed()`
- routes/api/feed.ts — New GET handler
- routes/_middleware.ts — Add `/api/feed` to unauthenticated bypass
- tests/feed.test.ts — Add unit + integration tests

## Errors / Corrections

## Ready for Next Run

Task complete. queryFeed() implemented in lib/feed.ts, GET /api/feed endpoint at routes/api/feed.ts, middleware updated. All tests written, formatting clean. Next task: task_03 (feed page).

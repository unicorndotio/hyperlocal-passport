---
provider: manual
pr:
round: 1
round_created_at: 2026-06-30T16:58:49Z
status: resolved
file: db/migrations/0000_high_franklin_storm.sql
line: 122
severity: high
author: claude-code
provider_ref:
---

# Issue 002: feed_events materialized view missing created_at index

## Review Comment

The migration creates the `feed_events` materialized view and adds only one index:

```sql
CREATE UNIQUE INDEX idx_feed_events_id ON feed_events (id);
```

The unique index on `id` is required for `REFRESH CONCURRENTLY` — that part is
correct.  However, the feed query in `lib/feed.ts` performs both a range filter and
an `ORDER BY` on `created_at`:

```ts
// lib/feed.ts ~line 53
mvSql = sql`${mvSql} WHERE created_at < ${cursorDate}::timestamptz`
mvSql = sql`${mvSql} ORDER BY created_at DESC LIMIT ${pageSize}`
```

Without an index on `created_at`, PostgreSQL must perform a full sequential scan of
the materialized view on every feed page request, sorting all rows in memory.  The
TechSpec explicitly identifies "cursor-based pagination on the MV works with a single
`created_at` index" as the primary design benefit of the MV approach (ADR-005,
"Consequences → Positive").  That index was never created.

At MVP scale this is acceptable, but the P95 latency target in the TechSpec
(< 500ms feed load, < 200ms savings query) is unlikely to hold once the MV grows
beyond a few hundred rows — coupon releases accumulate without expiry, so the MV
grows monotonically.

**Fix:** Add a `created_at` index to the materialized view.  Since Drizzle does not
currently model MV indexes, add this as a raw SQL migration:

```sql
-- New migration (run after the existing one)
CREATE INDEX idx_feed_events_created_at ON feed_events (created_at DESC);
```

Or append it to the existing migration if the database has not been deployed:

```sql
CREATE INDEX idx_feed_events_created_at ON feed_events (created_at DESC);
```

## Triage

- Decision: `VALID`
- Root cause: The initial migration (0000) only creates `idx_feed_events_id` (required for CONCURRENTLY refresh) but omits a `created_at` index. Every feed page query in `lib/feed.ts` filters on `WHERE created_at < cursor` and `ORDER BY created_at DESC`, which forces PostgreSQL to sequential-scan and sort the entire MV on each request. At scale this breaks the TechSpec's P95 latency targets (<500ms feed load).
- Fix: Append `CREATE INDEX idx_feed_events_created_at ON feed_events (created_at DESC)` to migration 0000 (safe since the DB hasn't been deployed). No separate migration needed.

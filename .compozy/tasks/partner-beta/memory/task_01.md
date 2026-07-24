# Task Memory: task_01.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Added `partner_ledger` table to `db/schema.ts` with FK to `businesses`.  
Updated migration journal and snapshot chain to track the new table.  
Applied migration to dev database.  
Updated `cleanupDatabase()` to include `partner_ledger` in TRUNCATE order.  
Updated `fk_hardening.test.ts` cascade count from 10→11.

## Important Decisions

- `partner_ledger` snapshot entries were manually constructed in `0001_snapshot.json` and `0002_snapshot.json` using Python scripts, mirroring the Drizzle Kit format, because `drizzle-kit generate` inside Docker produced incorrect output (tried to CREATE TABLE for feed_events which is a materialized view).
- The 0001 migration (address fields) was manually applied to the database before this task. The snapshot chain was updated to track it retroactively.
- The `partner_ledger` FK uses `onDelete: 'cascade'` matching the ownership-chain pattern of existing tables.

## Learnings

- Docker `web` service does not mount source code — only the `passport_uploads` volume. Code changes on the host are NOT reflected inside `docker compose exec web`. Run `drizzle-kit generate` on the host with `PG_CONNECTION` set to `localhost:5432`.
- The `feed_events` table is defined as `pgTable` in schema.ts but was originally created as a `MATERIALIZED VIEW` in `0000_0000_initial.sql`. This pre-existing mismatch causes `drizzle-kit` to generate redundant migrations.
- `cleanupDatabase()` in `lib/test-db.ts` needs manual updates when adding new tables with FK references to `businesses` or other tables in the truncate list.

## Files / Surfaces

- `db/schema.ts` — added `partnerLedger` table + relations
- `lib/test-db.ts` — added `partner_ledger` to TRUNCATE order
- `db/migrations/0002_add_partner_ledger.sql` — migration SQL
- `db/migrations/meta/_journal.json` — updated with idx 1, 2 entries
- `db/migrations/meta/0000_snapshot.json` — original state preserved
- `db/migrations/meta/0001_snapshot.json` — created (state after address fields)
- `db/migrations/meta/0002_snapshot.json` — created (state after partner_ledger)
- `tests/db/partner_ledger.test.ts` — 11 tests (8 unit + 3 DB integration)
- `tests/fk_hardening.test.ts` — updated cascade count 10→11

## Errors / Corrections

- `fk_hardening.test.ts` expected 10 cascade FKs but partner_ledger adds 1 more → updated to 11.
- `tests/db/partner_ledger.test.ts` had unused `sql` import → removed.

## Ready for Next Run

Yes.

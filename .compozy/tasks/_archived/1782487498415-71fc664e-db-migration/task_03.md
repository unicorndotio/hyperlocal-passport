---
status: completed
title: Drizzle Client Singleton
type: backend
complexity: low
dependencies:
    - task_02
---

# Drizzle Client Singleton

## Overview

Create `lib/db.ts` as the single Drizzle ORM client singleton shared across the application, using a `pg.Pool` connection pool backed by the `PG_CONNECTION` environment variable. Update `main.ts` to initialize the Drizzle client (without removing KV — both can coexist during migration). This is the central data access point that all migrated route handlers will use.

<critical>

- Read the TechSpec ("Core Interfaces" — `lib/db.ts` section) and ADR-004 before implementing
- Reference TechSpec for exact pool configuration (min=1, max=10) and import paths
- Reference ADR-004 for the pool design decision rationale
- Focus on WHAT the client must provide, not HOW handlers will use it
- Minimize code — this is a small file with a single export
- Tests required: verify client connects, pool manages connections correctly

</critical>

<requirements>

1. `lib/db.ts` MUST export a single `db` instance created with `drizzle()` from `npm:drizzle-orm/node-postgres`.
2. The underlying pool MUST use `npm:pg`'s `Pool` class with `connectionString` from `Deno.env.get('PG_CONNECTION')`, `min: 1`, `max: 10`.
3. The schema object MUST be imported from `../db/schema.ts`.
4. `main.ts` MUST be updated to await PostgreSQL readiness before starting the Fresh server.
5. The Drizzle client MUST coexist with the existing KV singleton — KV is NOT removed in this task.
6. A pooled connection MUST be tested at startup and log a warning if the database is unreachable (log event: "DB connection failed" with masked connection string).
7. The `db` instance MUST be the single source of database access — no other file creates Drizzle clients.

</requirements>

## Subtasks

- [ ] Create `lib/db.ts` with Drizzle client using pg.Pool
- [ ] Add connection logging (info on success, error with masked string on failure)
- [ ] Update `main.ts` to initialize Drizzle client and wait for PostgreSQL
- [ ] Add PostgreSQL wait/retry logic in main.ts startup
- [ ] Verify `lib/db.ts` compiles with `deno check`
- [ ] Verify Drizzle client connects to PostgreSQL at startup

## Implementation Details

### Relevant Files

- `lib/db.ts` — new file; Drizzle singleton with pg.Pool
- `main.ts` — modify startup to initialize Drizzle and await PostgreSQL

### Dependent Files

- `lib/auth.ts` (task_04) — imports `db`
- `lib/storage.ts` (task_05) — imports `db`
- All route handler files (tasks 06-12) — import `db` instead of `kv`
- `seed.ts` (task_13) — imports `db`

### Related ADRs

- [ADR-004: Drizzle Client Connection Strategy — Single Pool with pg Driver](../adrs/adr-004.md)

## Deliverables

- `lib/db.ts` with Drizzle client singleton using pg.Pool
- Updated `main.ts` with PostgreSQL readiness check
- Successful `deno check` on both files
- Drizzle client connects to PostgreSQL at startup (verify via log message)
- Graceful handling when PostgreSQL is unavailable (log error, retry)

## Tests

### Unit Tests

- [ ] `lib/db.ts` compiles with zero type errors via `deno check`
- [ ] Pool configuration matches spec (min=1, max=10, connectionString from env)
- [ ] Import path to `../db/schema.ts` resolves correctly

### Integration Tests

- [ ] Application starts and logs "DB connection established" when PostgreSQL is available
- [ ] Application logs "DB connection failed" with masked connection string when PostgreSQL is unavailable
- [ ] Multiple concurrent queries can be executed through the pool
- [ ] Pool correctly releases connections back to the pool after queries

## Success Criteria

- `deno check lib/db.ts main.ts` exits 0
- Application connects to PostgreSQL at startup
- Connection pool handles concurrent requests
- Test coverage >=80%

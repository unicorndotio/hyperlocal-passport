# Task Memory: task_02.md

## Objective Snapshot

Schema Definition & Initial Migration — created `db/schema.ts` with all 11 table definitions, Drizzle relations API, and all TechSpec indexes. Generated and applied the initial migration `0000_next_mariko_yashida.sql`. All tables verified in PostgreSQL.

## Important Decisions

- Used inline table function syntax `(table) => ({ ... })` for index definitions instead of standalone `index().on()` syntax, because the standalone syntax triggers a runtime bug in drizzle-kit's TS loader (it accesses `it.defaultConfig` which only exists on `ExtraConfigColumn` instances, not on regular `PgColumn` instances returned from `pgTable`).
- Import specifiers use bare names (`drizzle-orm`, `drizzle-orm/pg-core`) with mappings in `deno.json` imports section, making the schema compatible with both Deno and Node.js/drizzle-kit.
- Created `package.json` with `drizzle-kit` as a dev dependency for generating migrations via Node.js.

## Learnings

- `index().on(column)` standalone syntax fails in drizzle-kit v0.30.x-0.31.x with `JSON.parse("undefined")` error. The inline table function syntax works reliably.
- Deno-managed `node_modules/` (via `nodeModulesDir: "auto"`) creates symlinks that Node.js can resolve, but drizzle-kit's TS loader has issues with the Deno package structure. Using a separate Node.js temp directory (`/tmp/drizzle-gen`) with `npm install`'ed packages avoids these issues.
- The drizzle-kit `migrate` command requires a driver package (`pg`, `postgres`, etc.) to be installed.
- `drizzle-kit generate` produces clean SQL with all table definitions, FK constraints, and indexes when using the correct syntax.

## Files / Surfaces

- `db/schema.ts` — created with 11 tables, relations, and indexes
- `db/migrations/0000_next_mariko_yashida.sql` — generated migration
- `db/migrations/meta/` — snapshot files
- `deno.json` — added `drizzle-orm` and `drizzle-orm/pg-core` import mappings
- `package.json` — created for Node.js tooling (drizzle-kit)
- `docker-compose.yml` — no changes (already set up by task_01)

## Errors / Corrections

- Initial `npm:drizzle-orm/pg-core@0.38.2` specifier was rejected by Deno — corrected to `npm:drizzle-orm@0.38.2/pg-core`
- Import specifiers further changed to bare names (`drizzle-orm/pg-core`) with deno.json import map
- `index().on()` standalone syntax had runtime crash in drizzle-kit — switched to inline table function syntax

## Ready for Next Run

Task 02 is complete. Ready for task_03 (Drizzle Client Singleton).

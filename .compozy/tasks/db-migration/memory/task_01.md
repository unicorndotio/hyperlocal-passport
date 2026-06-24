# Task Memory: task_01.md

## Objective Snapshot

Add PostgreSQL and Drizzle Gateway as Docker Compose services, create drizzle.config.ts, create .env.example.
Completed: docker-compose.yml updated, drizzle.config.ts created, .env.example created, all services start and are healthy.

## Important Decisions

- Changed PostgreSQL volume mount to `/var/lib/postgresql` (not `/var/lib/postgresql/data`) because postgres:18-alpine requires this for major-version-compatible subdirectory layout.
- Used `PG_CONNECTION` as the env var name for both web app and Gateway, matching the TechSpec and ADR-003 convention.
- Drizzle Gateway uses `STORE_PATH=/app/data` for its own configuration persistence via `drizzle-store` volume.
- Removed old `deno_drizzle-store`, `deno_pgdata`, `deno_passport_data`, `deno_passport_uploads` volumes during initial setup (down -v).

## Learnings

- `postgres:18-alpine` requires volume mount at `/var/lib/postgresql` (parent dir) to create version-specific subdir internally; mounting directly to `/var/lib/postgresql/data` causes the container to refuse startup with an explicit error.
- `docker compose up -d` timed out at 120s during initial Docker image build; subsequent runs are fast due to cache.
- Drizzle Gateway health check takes ~10–15s after container start.

## Files / Surfaces

- `docker-compose.yml` — modified
- `drizzle.config.ts` — created
- `.env.example` — created
- `.compozy/tasks/db-migration/memory/task_01.md` — this file

## Errors / Corrections

- Initial PostgreSQL startup failed: volume mount at `/var/lib/postgresql/data` incompatible with postgres:18. Fixed by changing mount to `/var/lib/postgresql`.
- Had to remove volumes with `docker compose down -v` to clear stale pgdata before fresh start.

## Ready for Next Run

All subtasks complete. Basic integration tests pass (config validation, service startup, health checks, PG_CONNECTION env var, Gateway 200 response).

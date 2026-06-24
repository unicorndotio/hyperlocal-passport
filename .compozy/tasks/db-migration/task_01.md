---
status: completed
title: Infrastructure Setup
type: infra
complexity: low
dependencies: []
---

# Infrastructure Setup

## Overview

Add PostgreSQL and Drizzle Gateway as Docker Compose services alongside the existing web app, create the Drizzle Kit configuration file, and provide environment variable documentation. This establishes the database infrastructure that all subsequent tasks depend on.

<critical>

- Read the PRD (Phase 1) and TechSpec ("System Architecture" section) before implementing
- Reference TechSpec for exact Docker Compose service definitions and Drizzle Gateway configuration
- Focus on WHAT infrastructure is needed, not HOW the app uses it
- Minimize code — configuration and Docker changes only
- Tests required: verify services start and health checks pass

</critical>

<requirements>

1. PostgreSQL `postgres:18-alpine` service MUST be added to `docker-compose.yml` with health check, persistent volume `pgdata`, and environment variables for user/password/database.
2. Drizzle Gateway service MUST be added to `docker-compose.yml` on port 4983 with `MASTERPASS` authentication and persistent volume `drizzle-store`.
3. The web app service MUST use `PG_CONNECTION` environment variable instead of `DENO_KV_PATH`.
4. Service dependency ordering MUST ensure PostgreSQL is healthy before web app starts, and Gateway depends on PostgreSQL.
5. `drizzle.config.ts` MUST be created at project root with schema path pointing to `db/schema.ts` and output directory `db/migrations`.
6. `.env.example` MUST be created with `PG_CONNECTION`, `MASTERPASS`, and default values for local development, removing `DENO_KV_PATH`.
7. File upload volumes MUST remain unchanged.

</requirements>

## Subtasks

- [x] Add PostgreSQL service to docker-compose.yml with health check configuration
- [x] Add Drizzle Gateway service to docker-compose.yml with MASTERPASS and port mapping
- [x] Update web app service with PG_CONNECTION env var, remove DENO_KV_PATH
- [x] Configure service dependency ordering (depends_on with health check)
- [x] Create drizzle.config.ts at project root
- [x] Create .env.example with PG_CONNECTION and MASTERPASS defaults
- [x] Verify docker-compose config is valid with `docker compose config`

## Implementation Details

### Relevant Files

- `docker-compose.yml` — existing single-service compose file; will be modified to add PostgreSQL and Gateway
- `drizzle.config.ts` — new file; Drizzle Kit configuration
- `.env.example` — new file; document environment variables

### Dependent Files

- All route handlers that will use `PG_CONNECTION` env var (indirect dependency)
- `main.ts` — will need to wait for PostgreSQL before starting (handled in task_03)

### Related ADRs

- [ADR-003: Docker Compose PostgreSQL with Drizzle Gateway Infrastructure](../adrs/adr-003.md)
- [ADR-004: Drizzle Client Connection Strategy — Single Pool with pg Driver](../adrs/adr-004.md)

## Deliverables

- Updated `docker-compose.yml` with PostgreSQL, Drizzle Gateway, and updated web service
- New `drizzle.config.ts` file
- New `.env.example` file
- `docker compose config` passes validation
- `docker compose up` starts all services, PostgreSQL health check passes within 10 seconds
- Drizzle Gateway is accessible at `http://localhost:4983` and prompts for master password

## Tests

### Unit Tests

- No unit tests for configuration files

### Integration Tests

- [x] `docker compose config` exits 0 and shows all three services
- [x] `docker compose up -d` starts PostgreSQL, Gateway, and web app
- [x] `docker compose ps` shows all services as healthy within 30 seconds
- [x] `curl -s -o /dev/null -w '%{http_code}' http://localhost:4983` returns 200 (Gateway login page)
- [x] Web app env contains `PG_CONNECTION` (verify via `docker compose exec web env | grep PG_CONNECTION`)
- [x] PostgreSQL `pg_isready` passes via docker health check

## Success Criteria

- `docker compose config` exits 0
- All three services start and report healthy
- Drizzle Gateway login page renders at port 4983
- `drizzle.config.ts` compiles with zero errors when processed by Drizzle Kit
- `.env.example` documents all required variables

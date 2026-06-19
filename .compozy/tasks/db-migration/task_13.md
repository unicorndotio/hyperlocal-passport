---
status: pending
title: Seed Script Rewrite
type: backend
complexity: low
dependencies:
  - task_02
  - task_03
  - task_04
---

# Seed Script Rewrite

## Overview

Rewrite the `seed.ts` script to use Drizzle inserts instead of direct KV writes. The seed script creates an admin user and sample data for local development. It must work against PostgreSQL after migrations are applied, and produce a working admin user that can log in.

<critical>

- Read the PRD (Phase 4 — Test Migration and Cleanup) and TechSpec ("Development Sequencing" item 7)
- Reference the TechSpec's seed script section for the Drizzle approach
- Reference the existing KV seed script for the exact data to create (admin user, sample businesses, coupons, etc.)
- The seed output must be verified manually (admin user created, can log in, can see admin routes)
- Tests required: seed script runs successfully, produces working admin login

</critical>

<requirements>

1. `seed.ts` MUST use `db.insert(schema.users)` and `db.insert(schema.businesses)` instead of `kv.set` / `kv.atomic()`.
2. The admin user MUST be created via Better Auth API (same as current approach) to ensure proper user/session/account table entries.
3. After creating the admin user via Better Auth, the role MUST be set to 'admin' and status to 'approved' via a Drizzle update on the `user` table.
4. The seed script MUST NOT use `Deno.openKv()` — all KV imports MUST be removed.
5. The seed script MUST handle the case where the admin user already exists (idempotent).
6. Sample data (businesses, coupons, etc.) MUST be created using Drizzle insert queries.
7. The script MUST be runnable via `docker compose exec web deno run -A seed.ts` (without `--unstable-kv` flag).

</requirements>

## Subtasks

- [ ] Rewrite `seed.ts` to remove KV imports and use Drizzle for all data operations
- [ ] Create admin user via Better Auth API (preserve existing auth flow)
- [ ] Update admin user role/status via Drizzle update
- [ ] Create sample businesses and coupons using Drizzle inserts
- [ ] Remove `--unstable-kv` flag from seed run command
- [ ] Verify seed runs successfully against PostgreSQL
- [ ] Verify created admin user can log in

## Implementation Details

### Relevant Files

- `seed.ts` — rewrite KV operations → Drizzle inserts
- `deno.json` — update seed task command (remove `--unstable-kv`)

### Dependent Files

- None (seed is standalone)

## Deliverables

- Rewritten `seed.ts` using Drizzle inserts
- Seed script creates admin user, businesses, and coupons in PostgreSQL
- Admin user can log in and access admin routes
- Seed script is idempotent (safe to run multiple times)
- No `--unstable-kv` flag needed

## Tests

### Unit Tests

- [ ] `deno check seed.ts` passes with zero errors
- [ ] No `Deno.openKv` calls remain in seed.ts

### Integration Tests

- [ ] Running `deno run -A seed.ts` creates admin user in PostgreSQL
- [ ] Admin user email is set correctly
- [ ] Admin user role is 'admin'
- [ ] Admin user status is 'approved'
- [ ] Created admin user can sign in via POST /api/auth/sign-in
- [ ] Created admin user can access GET /api/admin/analytics
- [ ] Running seed a second time does not create duplicate users (idempotent)
- [ ] Sample businesses are created in the businesses table
- [ ] Sample coupons are created in the coupons table

## Success Criteria

- `deno check seed.ts` exits 0
- Seed script creates working admin user against PostgreSQL
- Seed script is idempotent
- Test coverage >=80%

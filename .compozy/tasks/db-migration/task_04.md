---
status: pending
title: "Better Auth Drizzle Adapter"
type: backend
complexity: medium
dependencies:
  - task_02
  - task_03
---

# Better Auth Drizzle Adapter

## Overview

Replace the custom Better Auth KV adapter (`lib/kv-adapter.ts`) with the official Better Auth Drizzle adapter. This migrates all authentication tables (user, session, account, verification) to PostgreSQL while preserving the existing auth API contract. All existing auth flows (sign-up, sign-in, sign-out, session validation) continue to work identically.

<critical>

- Read the PRD (Phase 2 — Better Auth Migration) and TechSpec ("Integration Points — Better Auth" section) before implementing
- Reference TechSpec for exact adapter import path and configuration
- Reference ADR-001 for the decision to use Better Auth's Drizzle adapter
- Focus on WHAT the adapter swap achieves, not HOW the adapter works internally
- Tests required: all auth flows, session persistence, RBAC middleware compatibility

</critical>

<requirements>

1. `lib/auth.ts` MUST replace `denoKvAdapter(kv)` with `drizzleAdapter(db)` from `better-auth/adapters/drizzle`.
2. The `user` model MUST include `additionalFields` for `role` and `status` columns defined in `src/db/schema.ts`.
3. The `lib/kv-adapter.ts` import MUST be removed from `lib/auth.ts` (the file itself is deleted in task_14).
4. All existing auth API endpoints (sign-up, sign-in, sign-out) MUST work identically against PostgreSQL.
5. Session persistence MUST survive container restart (no data loss).
6. `auth.api.getSession` MUST correctly return user data including `role` and `status` from PostgreSQL.
7. The RBAC middleware (`routes/_middleware.ts`) MUST continue to work without changes.

</requirements>

## Subtasks

- [ ] Update `lib/auth.ts` to import and use Better Auth's Drizzle adapter
- [ ] Configure model definitions matching the schema tables
- [ ] Remove the `denoKvAdapter` import and all KV adapter references from `lib/auth.ts`
- [ ] Verify auth compilation with `deno check lib/auth.ts`
- [ ] Test sign-up creates user in PostgreSQL (verify via Drizzle Gateway or direct query)
- [ ] Test sign-in returns valid session
- [ ] Test session survives container restart (persistence)
- [ ] Test RBAC middleware correctly identifies resident, business, and admin roles

## Implementation Details

### Relevant Files

- `lib/auth.ts` — modify adapter configuration
- `lib/kv-adapter.ts` — no longer imported (deleted in task_14)

### Dependent Files

- `routes/_middleware.ts` — uses `auth.api.getSession` (should work unchanged)
- `routes/api/auth/[...path].ts` — auth API handler (should work unchanged)
- All route handlers that depend on session data via `auth.api.getSession`

### Related ADRs

- [ADR-001: Full Database Migration from Deno KV to PostgreSQL with Drizzle ORM](../adrs/adr-001.md)

## Deliverables

- Updated `lib/auth.ts` using Better Auth Drizzle adapter
- Sign-up creates user, session, account records in PostgreSQL
- Sign-in returns session token
- Sign-out invalidates session
- Session persistence across container restart
- RBAC middleware correctly enforces role-based access
- All existing auth tests pass

## Tests

### Unit Tests

- [ ] `deno check lib/auth.ts` passes with zero type errors
- [ ] Drizzle adapter configuration is syntactically correct

### Integration Tests

- [ ] POST to sign-up endpoint creates user in `user` table and account in `account` table
- [ ] POST to sign-in endpoint returns valid session token
- [ ] GET session with valid token returns user data with role and status
- [ ] GET session with invalid/expired token returns null
- [ ] POST to sign-out invalidates session
- [ ] Admin user can access `/api/admin/*` routes
- [ ] Resident user is denied access to `/api/admin/*` routes (returns 401/403)
- [ ] Business user can access business-specific routes
- [ ] Session survives container restart (verified by restarting container and checking session)

## Success Criteria

- All auth flows (sign-up, sign-in, sign-out, session) work end-to-end against PostgreSQL
- RBAC middleware unchanged and working
- `deno check lib/auth.ts` exits 0
- Test coverage >=80%

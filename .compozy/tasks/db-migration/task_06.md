---
status: pending
title: User Registration & Approval Routes
type: backend
complexity: medium
dependencies:
  - task_02
  - task_03
  - task_04
---

# User Registration & Approval Routes

## Overview

Migrate the user registration and admin approval flow from Deno KV to Drizzle queries. This covers resident registration (with CPF uniqueness checks, document upload, approval queue), admin approval/rejection of pending registrations, and all associated KV atomic operations. These are the most atomicity-sensitive routes — registration must handle concurrent duplicate email/CPF checks via Drizzle transactions.

<critical>

- Read the PRD (Phase 3 — Data Layer Migration) and the TechSpec ("API Endpoints" section for query patterns)
- Reference TechSpec for KV→Drizzle query mapping patterns
- All atomic KV operations become Drizzle transactions — no read-modify-write outside a transaction
- Tests required: registration with duplicate detection, concurrent registration, approval flow, rejection flow

</critical>

<requirements>

1. `routes/api/users/register.ts` MUST replace all `kv.get`, `kv.set`, `kv.atomic()` calls with Drizzle queries and transactions.
2. CPF uniqueness check MUST use `db.select().from(users).where(eq(users.cpf, cpf))` within a transaction.
3. Email uniqueness check MUST use `db.select().from(users).where(eq(users.email, email))` within a transaction.
4. The approval queue record (`approvals`, `pending`, userId) MUST be stored as a row in a dedicated `approvals` table or use a `status` column on the user table (with status='pending').
5. `routes/api/admin/approvals/pending.ts` MUST query for users with `status = 'pending'` instead of KV prefix scan.
6. `routes/api/admin/approvals/[userId].ts` MUST atomically update user status and create business profile on approval using a Drizzle transaction.
7. The `kv` import MUST be removed from all three files and replaced with `db` from `../lib/db.ts`.
8. File upload handling in registration MUST continue to use `lib/storage.ts` (unchanged interface, already updated in task_05).

</requirements>

## Subtasks

- [ ] Update `routes/api/users/register.ts`: replace KV operations with Drizzle queries and transactions
- [ ] Update `routes/api/admin/approvals/pending.ts`: replace KV prefix scan with Drizzle query
- [ ] Update `routes/api/admin/approvals/[userId].ts`: replace atomic KV operations with Drizzle transaction
- [ ] Remove `kv` imports from all three files; add `db` and `schema` imports
- [ ] Verify `deno check` on all three modified files
- [ ] Update `tests/register.test.ts` to use test database with Drizzle queries
- [ ] Update `tests/admin_approvals.test.ts` to use test database with Drizzle queries

## Implementation Details

### Relevant Files

- `routes/api/users/register.ts` — modify KV operations → Drizzle
- `routes/api/admin/approvals/pending.ts` — modify KV prefix scan → Drizzle
- `routes/api/admin/approvals/[userId].ts` — modify atomic operations → Drizzle transaction
- `tests/register.test.ts` — update test infrastructure
- `tests/admin_approvals.test.ts` — update test infrastructure

### Dependent Files

- `tests/islands/approval_dashboard.test.ts` — indirect dependency (tests approval UI that depends on approval API)

### Related ADRs

- [ADR-001: Full Database Migration from Deno KV to PostgreSQL with Drizzle ORM](../adrs/adr-001.md)
- [ADR-008: User Coupon Usage — SQL COUNT from Redemptions Table](../adrs/adr-008.md)

## Deliverables

- Updated `routes/api/users/register.ts` with Drizzle queries and transactions
- Updated `routes/api/admin/approvals/pending.ts` with Drizzle queries
- Updated `routes/api/admin/approvals/[userId].ts` with Drizzle transactions
- Updated `tests/register.test.ts` and `tests/admin_approvals.test.ts` for PostgreSQL
- All user registration and approval flows work against PostgreSQL

## Tests

### Unit Tests

- [ ] `deno check` on all three modified route files passes with zero errors

### Integration Tests

- [ ] POST register with valid data creates user with status='pending' in PostgreSQL
- [ ] POST register with duplicate email returns 409 (detected via Drizzle unique constraint)
- [ ] POST register with duplicate CPF returns 409
- [ ] POST register with concurrent identical requests: only one succeeds (transaction isolation)
- [ ] POST register with invalid data returns 400 (validation before DB)
- [ ] GET admin/approvals/pending returns list of users with status='pending'
- [ ] POST admin/approvals/[userId]/approve updates user status to 'approved'
- [ ] POST admin/approvals/[userId]/reject updates user status to 'rejected'
- [ ] Atomic rollback: if approval transaction fails, user status remains unchanged

## Success Criteria

- All registration and approval flows work against PostgreSQL
- Duplicate detection handles concurrent requests correctly
- `deno check` on all modified files exits 0
- Test coverage >=80%

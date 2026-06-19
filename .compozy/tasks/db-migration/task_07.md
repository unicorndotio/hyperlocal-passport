---
status: pending
title: Business Routes Migration
type: backend
complexity: high
dependencies:
  - task_02
  - task_03
  - task_04
---

# Business Routes Migration

## Overview

Migrate all business-related route handlers from Deno KV to Drizzle queries. This covers business registration (with CNPJ uniqueness), business CRUD, profile management, coupon listing by business, and business analytics. These routes span 6 API files and represent the largest data domain by file count.

<critical>

- Read the TechSpec ("API Endpoints" section for KV→Drizzle mapping patterns)
- Business registration must handle CNPJ uniqueness checks within Drizzle transactions
- Business analytics queries use the `coupon_analytics` table instead of KV counter keys
- Tests required: business CRUD, registration with duplicates, profile updates, analytics queries

</critical>

<requirements>

1. All 6 business route files MUST replace `kv.get`, `kv.set`, `kv.list`, `kv.delete`, and `kv.atomic()` with equivalent Drizzle queries.
2. `routes/api/businesses/register.ts` MUST use a Drizzle transaction for atomic registration with CNPJ uniqueness check.
3. `routes/api/businesses/[id]/analytics.ts` MUST query `coupon_analytics` table instead of KV counter keys.
4. `routes/api/businesses/[id]/coupons.ts` MUST use `db.select().from(coupons).where(eq(coupons.businessId, id))` instead of `kv.list({ prefix: ['coupons'] })` with manual filter.
5. All `kv` imports MUST be removed and replaced with `db` from `../lib/db.ts` and schema imports.
6. Business listing (`routes/api/businesses/index.ts`) MUST use Drizzle `select` with optional filters instead of KV prefix scan.

</requirements>

## Subtasks

- [ ] Update `routes/api/businesses/index.ts`: replace KV prefix scan with Drizzle select
- [ ] Update `routes/api/businesses/register.ts`: replace KV atomic with Drizzle transaction
- [ ] Update `routes/api/businesses/[id].ts`: replace KV CRUD with Drizzle queries
- [ ] Update `routes/api/businesses/[id]/coupons.ts`: replace KV prefix scan with Drizzle query
- [ ] Update `routes/api/businesses/[id]/profile.ts`: replace KV updates with Drizzle updates
- [ ] Update `routes/api/businesses/[id]/analytics.ts`: replace KV counter reads with coupon_analytics queries
- [ ] Remove `kv` imports from all 6 files; add `db` and `schema` imports
- [ ] Verify `deno check` on all 6 modified files
- [ ] Update business API tests for PostgreSQL

## Implementation Details

### Relevant Files

- `routes/api/businesses/index.ts`
- `routes/api/businesses/register.ts`
- `routes/api/businesses/[id].ts`
- `routes/api/businesses/[id]/coupons.ts`
- `routes/api/businesses/[id]/profile.ts`
- `routes/api/businesses/[id]/analytics.ts`
- `tests/business_api.test.ts`
- `tests/business_onboarding.test.ts`
- `tests/business_profile_ui.test.ts`
- `tests/business_registration_ui.test.ts`
- `tests/business_checkout_ui.test.ts`
- `tests/business_detail_page.test.ts`
- `tests/business_admin_ui.test.ts`
- `tests/routes/api/businesses/register_test.ts`
- `tests/routes/api/businesses/profile_test.ts`

### Dependent Files

- `routes/business/` page routes — consume these API endpoints (should work unchanged)

### Related ADRs

- [ADR-001: Full Database Migration from Deno KV to PostgreSQL with Drizzle ORM](../adrs/adr-001.md)

## Deliverables

- All 6 business API route files migrated from KV to Drizzle
- Business API tests updated for PostgreSQL
- Business registration with CNPJ uniqueness enforced via Drizzle
- Business analytics reads from `coupon_analytics` table
- All business CRUD operations work against PostgreSQL

## Tests

### Unit Tests

- [ ] `deno check` on all 6 modified route files passes with zero errors

### Integration Tests

- [ ] POST businesses/register with valid data creates business in PostgreSQL
- [ ] POST businesses/register with duplicate CNPJ returns 409
- [ ] GET businesses/ returns list of all businesses
- [ ] GET businesses/[id] returns single business with all fields
- [ ] PUT businesses/[id]/profile updates business fields
- [ ] GET businesses/[id]/coupons returns coupons for that business
- [ ] GET businesses/[id]/analytics returns view/redemption/validation counts
- [ ] Business registration with concurrent duplicate CNPJ: one succeeds, one fails (transaction isolation)
- [ ] Business analytics counts match coupon_analytics rows

## Success Criteria

- All business API endpoints return correct data against PostgreSQL
- CNPJ uniqueness is enforced via database constraints
- `deno check` on all modified files exits 0
- Test coverage >=80%

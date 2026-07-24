---
status: pending
title: Database Schema Updates
type: backend
complexity: low
dependencies: []
---

# Task 01: Database Schema Updates

## Overview
Adds required address fields and subscription tracking to the business schema, establishing the foundation for the Partner Beta.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add address fields (`cep`, `street`, `number`, `neighborhood`) and `mapsUrl` to the `businesses` table.
- MUST add an `expirationDate` timestamp to the `businesses` table.
- MUST create a new `partner_ledger` table linking payments to `businessId`.
</requirements>

## Subtasks
- [ ] 01.1 Update `db/schema.ts` to include new columns in `businesses`.
- [ ] 01.2 Update `db/schema.ts` to include the `partner_ledger` table schema.
- [ ] 01.3 Generate SQL migrations using `drizzle-kit generate`.

## Implementation Details
Reference the Data Models section in the TechSpec.

### Relevant Files
- `db/schema.ts` — contains the Drizzle schemas for `businesses` and where `partner_ledger` will be defined.

### Dependent Files
- `db/migrations/*` — will contain the newly generated migration file.

### Related ADRs
- [ADR-002: Ledger Data Model](../adrs/adr-002.md) — Explains why `expirationDate` is cached on the business table.

## Deliverables
- Updated `schema.ts`.
- Generated migration SQL file.
- Unit tests with 80%+ coverage **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] Schema validation: test insertion into `partner_ledger`.
  - [ ] Schema validation: test insertion of new address fields into `businesses`.
- Integration tests:
  - [ ] End-to-end flow from DB insert to query for `partner_ledger`.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Migration applies cleanly on a fresh database.

# Workflow Memory

Keep only durable, cross-task context here. Do not duplicate facts that are obvious from the repository, PRD documents, or git history.

## Current State

Task 01 (Database Schema Updates): COMPLETE. `partner_ledger` table added to schema with FK + index. Migration `0002_add_partner_ledger.sql` generated and applied. Snapshot chain updated to track migrations 0001 (address fields) and 0002 (partner_ledger). Tests pass (11 tests: 8 unit + 3 DB integration).

Task 02 (Business Profile API Updates): COMPLETE. Schema migrated with new address + expirationDate columns. Validation functions in `lib/business.ts`. API handler updated.

## Shared Decisions

- `BUSINESS_CATEGORIES` in `lib/business.ts` is the source of truth for business category validation (8 categories: Alimentação, Casa, Corpo, Esporte, Serviços, Náutica, Entretenimento, Outro).
- CEP is normalized to 8 digits on save (no dash stored).
- Address/maps fields can be cleared by sending null or empty string.
- `partner_ledger` FK uses `onDelete: cascade` (ownership-chain pattern).
- `cleanupDatabase()` in `lib/test-db.ts` must be manually updated when new tables reference existing truncate-list tables.

## Shared Learnings

- Pre-existing profile tests (`tests/routes/api/businesses/profile_test.ts`) use hardcoded IDs that fail with uuid-typed columns. Not caused by this task but will affect integration test runs.
- DB migrations must be applied manually via `docker compose exec postgres psql` if `drizzle-kit` is not available in the local env.
- Docker `web` service does not mount source code — only the `passport_uploads` volume. Run `drizzle-kit generate` on the host with `PG_CONNECTION=postgresql://root:password@localhost:5432/pg`.

## Open Risks

## Handoffs

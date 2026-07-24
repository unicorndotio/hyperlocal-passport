# Workflow Memory

Keep only durable, cross-task context here. Do not duplicate facts that are obvious from the repository, PRD documents, or git history.

## Current State

Task 02 (Business Profile API Updates): COMPLETE. Schema migrated with new address + expirationDate columns. Validation functions in `lib/business.ts`. API handler updated.

## Shared Decisions

- `BUSINESS_CATEGORIES` in `lib/business.ts` is the source of truth for business category validation (8 categories: Alimentação, Casa, Corpo, Esporte, Serviços, Náutica, Entretenimento, Outro).
- CEP is normalized to 8 digits on save (no dash stored).
- Address/maps fields can be cleared by sending null or empty string.

## Shared Learnings

- Pre-existing profile tests (`tests/routes/api/businesses/profile_test.ts`) use hardcoded IDs that fail with uuid-typed columns. Not caused by this task but will affect integration test runs.
- DB migrations must be applied manually via `docker compose exec postgres psql` if `drizzle-kit` is not available in the local env.

## Open Risks

## Handoffs

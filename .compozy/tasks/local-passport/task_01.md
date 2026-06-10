---
status: completed
title: Extend Business data model with socialLinks and openingHours
type: backend
complexity: low
dependencies: []
---

# Task 01: Extend Business data model with socialLinks and openingHours

## Overview

Add `socialLinks` (Instagram, Facebook, WhatsApp, online menu link) and `openingHours` fields to the `Business` interface in `lib/business.ts`. Update the validation logic to support the new fields. This foundation is required by all subsequent business self-service tasks.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add `socialLinks` field to `Business` interface with optional `instagram`, `facebook`, `whatsapp`, and `menu` sub-fields (all strings)
- MUST add `openingHours` field to `Business` interface as a map of day-of-week keys (`monday`–`sunday`) to `{ open: string, close: string }` objects (24h format)
- MUST update `BusinessFormErrors` to include validation error fields for the new properties
- MUST add a validation helper for `openingHours` format (HH:MM 24h, open < close, valid day keys)
- SHOULD add a validation helper for `socialLinks` URL format (optional, basic URL check)
- MUST update existing tests in `tests/lib/business.test.ts` for any new or changed validation functions
</requirements>

## Subtasks

- [ ] 1.1 Extend `Business` interface with `socialLinks` and `openingHours` fields
- [ ] 1.2 Extend `BusinessFormErrors` with new field error keys
- [ ] 1.3 Add `validateOpeningHours` helper function
- [ ] 1.4 Add `validateSocialLinks` helper function
- [ ] 1.5 Write unit tests for new validation functions

## Implementation Details

The existing `Business` interface in `lib/business.ts:51-62` has `id`, `userId`, `name`, `companyName`, `cnpj`, `category`, `description?`, `logoUrl`, `isActive`, `createdAt`. Add the two new fields without removing or renaming existing ones. Update `BusinessFormErrors` at line 64-71 accordingly.

### Relevant Files

- `lib/business.ts` — Business interface, BusinessFormErrors, and validation functions to extend
- `tests/lib/business.test.ts` — Add unit tests for new validation helpers

### Dependent Files

- `routes/api/businesses/index.ts` — Will emit the new fields when listing (no changes needed, adapter auto-passes all fields)
- `routes/api/businesses/[id].ts` — Will accept/save new fields via JSON body (no changes needed)
- `islands/BusinessManager.tsx` — Admin UI that displays/edits business fields; new fields will not render until Task 05 adds UI
- All islands/route pages that render business data — emit new fields automatically through the adapter

### Related ADRs

- [ADR-002: Self-Service Business Registration with Admin Payment Gate](adrs/adr-002.md) — Defines the need for social media links and opening hours in business profiles
- [ADR-004: Immediate Business Access with Feature Gating During Activation](adrs/adr-004.md) — References structured opening hours for feature gating

## Deliverables

- Updated `lib/business.ts` with `socialLinks` and `openingHours` on `Business` interface, extended `BusinessFormErrors`, new validation helpers
- Updated `tests/lib/business.test.ts` with unit tests for new validation logic
- Test coverage >= 80% for the modified file

## Tests

### Unit Tests

- [ ] `validateOpeningHours` rejects null/undefined input
- [ ] `validateOpeningHours` rejects non-object input
- [ ] `validateOpeningHours` rejects day keys outside monday–sunday
- [ ] `validateOpeningHours` rejects time not in HH:MM format
- [ ] `validateOpeningHours` rejects when `open >= close`
- [ ] `validateOpeningHours` accepts empty object (no hours provided)
- [ ] `validateOpeningHours` accepts valid full-week schedule
- [ ] `validateSocialLinks` accepts undefined/empty input (all fields optional)
- [ ] `validateSocialLinks` accepts valid URLs for each sub-field
- [ ] `validateSocialLinks` rejects invalid URL format for any sub-field

## Success Criteria

- All tests passing
- Test coverage >= 80% for `lib/business.ts`
- Existing business CRUD routes operate unchanged with the new fields

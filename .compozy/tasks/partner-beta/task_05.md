---
status: completed
title: Partner Campaign Form Simplification
type: frontend
complexity: medium
dependencies: []
---

# Task 05: Partner Campaign Form Simplification

## Overview
Simplifies the campaign creation form by introducing outcome-driven presets and removing confusing configuration options for the merchant.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST implement standard presets (Benefício Fidelidade, Promoção Relâmpago, Promoção de Evento, Liquidação de Item).
- MUST hide frequency and user limit configuration from the UI.
- MUST tie max units directly to BOGO and item discounts.
- MUST use a currency mask for all monetary inputs (e.g., `R$ 15,00`).
</requirements>

## Subtasks
- [x] 05.1 Refactor the campaign type selector to use the new presets.
- [x] 05.2 Hide frequency/user limits and automatically derive their values based on the preset.
- [x] 05.3 Implement a currency input mask for price fields.
- [x] 05.4 Update payload generation to convert formatted currency to cents before API submission.

## Implementation Details
Reference the TechSpec for preset definitions and currency requirements.

### Relevant Files
- `islands/CouponManager.tsx` or `islands/CampaignForm.tsx` — the form component for campaigns.

### Dependent Files
- `routes/business/coupons.tsx` — the page hosting the component.

## Deliverables
- Updated campaign form UI.
- Currency masking utility.
- Unit tests with 80%+ coverage **(REQUIRED)**

## Tests
- Unit tests:
  - [x] Preset selection: selecting 'Benefício Fidelidade' sets correct internal constraints.
  - [x] Currency masking: typing "1500" formats as "R$ 15,00" and outputs 1500 cents.
- Integration tests:
  - [x] None required.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%

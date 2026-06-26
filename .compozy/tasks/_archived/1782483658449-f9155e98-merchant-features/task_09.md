---
status: completed
title: Business Dashboard Analytics Tab
type: frontend
complexity: low
dependencies:
    - task_08
---

# Task 09: Business Dashboard Analytics Tab

## Overview

Add an "Analytics" tab to the BusinessHeader navigation component so merchants can navigate to the new analytics dashboard. This is a small UI change that connects the analytics page into the existing dashboard navigation structure.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- BusinessHeader MUST accept `'analytics'` as a valid value for the `active` prop alongside existing values (`'coupons'`, `'checkout'`, `'profile'`)
- The navigation MUST display 4 tabs: "Meus Cupons", "Validar Cupom", "Analytics", "Perfil" (or English equivalents)
- The "Analytics" tab MUST link to `/business/analytics`
- Active tab styling MUST be consistent with existing tabs
- The change MUST be minimal — only the header and the BusinessHeader type union need updating
</requirements>

## Subtasks

- [ ] 9.1 Update the `active` prop type in `BusinessHeader.tsx` to include `'analytics'`
- [ ] 9.2 Add the "Analytics" nav link with correct href and active styling

## Implementation Details

The BusinessHeader at `components/BusinessHeader.tsx` currently has `active: 'coupons' | 'checkout' | 'profile'`. Add `'analytics'` to the union type and add a fourth `<a>` tag in the nav for the Analytics tab.

The page route `/business/analytics.tsx` already exists from task 08 — no additional route work needed in this task.

### Relevant Files
- `components/BusinessHeader.tsx` — Nav component to update
- `routes/business/coupons.tsx` — Existing route (passes `active="coupons"`)
- `routes/business/checkout.tsx` — Existing route (passes `active="checkout"`)
- `routes/business/profile.tsx` — Existing route (passes `active="profile"`)
- `routes/business/analytics.tsx` — New route from task 08 (will pass `active="analytics"`)

### Dependent Files
- (none — this is a pure presentational change)

### Related ADRs
- ADR-002: Business Dashboard Layout — Cohesive Redesign with Dedicated Analytics Tab

## Deliverables

- Updated `BusinessHeader.tsx` with Analytics tab
- All business page routes pass the correct active prop
- Component tests verifying the new tab renders and is active when expected

## Tests

- Component tests:
  - [ ] BusinessHeader renders 4 tabs when active="coupons"
  - [ ] BusinessHeader renders 4 tabs when active="analytics"
  - [ ] Analytics tab has correct href="/business/analytics"
  - [ ] Analytics tab is highlighted when active="analytics"
  - [ ] Existing tabs continue to work correctly
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Analytics tab appears in the business dashboard navigation
- Tab highlights correctly when on the analytics page

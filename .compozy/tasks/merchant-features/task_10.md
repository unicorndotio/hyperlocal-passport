---
status: completed
title: Business Onboarding Walkthrough
type: frontend
complexity: medium
dependencies:
    - task_06
---

# Task 10: Business Onboarding Walkthrough

## Overview

Create an interactive walkthrough overlay that guides merchants through the redesigned dashboard on first login after the feature deploy. The walkthrough highlights each tab, explains new features, and tracks completion via a `hasSeenMerchantOnboarding` flag on the Business record.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- The walkthrough MUST trigger once per business on the first login after the feature deploy
- The walkthrough MUST NOT show again once completed (persisted via `hasSeenMerchantOnboarding` flag on the Business record)
- The walkthrough overlay MUST cover the full viewport with a semi-transparent backdrop
- The walkthrough MUST highlight UI elements step by step with tooltip-style explanations
- At minimum, the walkthrough MUST cover: the 4 dashboard tabs, the coupon creation form with templates, the checkout validation panel, and the analytics dashboard
- The walkthrough MUST have Next/Previous/Dismiss navigation
- A progress indicator (e.g., Step 3 of 7) MUST be shown
- The `hasSeenMerchantOnboarding` field MUST be added to the Business interface in `lib/business.ts`
- A PUT/PATCH endpoint or a dedicated onboarding completion endpoint MUST be available to set the flag
- The walkthrough SHOULD gracefully degrade on mobile (tap targets must be accessible)

## Subtasks

- [ ] 10.1 Add `hasSeenMerchantOnboarding?: boolean` to the Business interface in `lib/business.ts`
- [ ] 10.2 Create an API endpoint (or extend existing) to update the `hasSeenMerchantOnboarding` flag
- [ ] 10.3 Build the BusinessOnboarding island with step configuration and overlay UI
- [ ] 10.4 Implement step-by-step tooltip navigation with Next/Previous/Dismiss
- [ ] 10.5 Integrate the island into the business dashboard layout, gated by the flag
- [ ] 10.6 Write component and integration tests

## Implementation Details

The BusinessOnboarding island at `islands/BusinessOnboarding.tsx` (new) manages:
- A configurable array of steps, each with `{ targetSelector: string, title: string, description: string, position: 'top' | 'bottom' | 'left' | 'right' }`
- Overlay state: `{ isActive, currentStep }`
- On mount, checks `business.hasSeenMerchantOnboarding` — if false, shows the walkthrough
- On completion or dismiss, calls the API to set `hasSeenMerchantOnboarding: true`

The walkthrough uses CSS for the overlay + spotlight effect. Position tooltips relative to the target element using `getBoundingClientRect()`.

The onboarding is rendered in the business dashboard layout (`routes/business/_layout.tsx` or at the individual page level) so it overlays all pages.

See TechSpec "Component Overview" section for BusinessOnboarding responsibility. Reference ADR-002 for the onboarding flag design.

### Relevant Files
- `islands/BusinessOnboarding.tsx` — New island component
- `lib/business.ts` — Business interface to extend with hasSeenMerchantOnboarding
- `routes/business/_layout.tsx` or individual page routes — Where to render the island
- `routes/api/businesses/[id]/profile.ts` or similar — API to update onboarding flag

### Dependent Files
- (none — this island is rendered in the layout)

### Related ADRs
- ADR-002: Business Dashboard Layout — Cohesive Redesign with Dedicated Analytics Tab

## Deliverables

- `islands/BusinessOnboarding.tsx` with full walkthrough implementation
- Updated `lib/business.ts` with `hasSeenMerchantOnboarding` field
- API endpoint to set the onboarding flag
- Integration of walkthrough into business dashboard
- Component and integration tests with 80%+ coverage

## Tests

- Component tests:
  - [ ] Walkthrough renders when hasSeenMerchantOnboarding is false
  - [ ] Walkthrough does NOT render when hasSeenMerchantOnboarding is true
  - [ ] Walkthrough shows first step on mount
  - [ ] Next button advances to the next step
  - [ ] Previous button goes back a step
  - [ ] Dismiss button closes the walkthrough
  - [ ] Progress indicator shows correct step number
  - [ ] Final step shows completion state
- Integration tests:
  - [ ] Completing walkthrough calls API to set flag
  - [ ] Dismissing walkthrough calls API to set flag
  - [ ] Subsequent page loads do not show walkthrough
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Merchants see the walkthrough on first login after feature deploy
- Walkthrough only shows once per business
- All steps are navigable and dismissible

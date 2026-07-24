---
status: completed
title: Onboarding Wizard Fixes
type: frontend
complexity: low
dependencies: []
---

# Task 08: Onboarding Wizard Fixes

## Overview
Fixes CSS and interaction issues with the partner onboarding wizard to ensure a smooth, mandatory first-time experience.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST ensure the wizard overlays all page content (correct z-index and fixed positioning).
- MUST prevent the wizard from closing when clicking on the background overlay.
</requirements>

## Subtasks
- [x] 08.1 Fix z-index and positioning CSS classes.
- [x] 08.2 Remove background click-to-close event handlers.

## Implementation Details
Reference the TechSpec for the specific CSS fixes required.

### Relevant Files
- `islands/BusinessOnboarding.tsx` — the wizard component.

### Dependent Files
- None.

## Deliverables
- Updated wizard component.
- Unit tests with 80%+ coverage **(REQUIRED)**

## Tests
- Unit tests:
  - [x] Wizard interaction: background click does not close modal.
- Integration tests:
  - [ ] None required.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%

---
status: completed
title: Opening Hours UI Fix
type: frontend
complexity: low
dependencies: []
---

# Task 13: Opening Hours UI Fix

## Overview

Add per-day toggle/remove functionality to the BusinessProfileEditor's opening hours section so merchants can remove individual days from their schedule. The data model already supports partial week configurations (optional fields in `OpeningHours`), but the UI forces all 7 days to be present.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- The opening hours section MUST allow merchants to remove individual days (e.g., remove Sunday from the schedule)
- The "removed" state MUST hide both the open and close inputs for that day
- An "Add Day" button or similar mechanism MUST allow re-adding a previously removed day
- The existing validation for opening hours MUST continue to work (validates only days that have values)
- The submitted data MUST be a partial record that omits removed days
- The UI change MUST be minimal — existing structure and styling preserved
- All text MUST be in English per project convention

## Subtasks

- [x] 13.1 Add a toggle/remove button next to each day in the opening hours grid
- [x] 13.2 Implement show/hide behavior for removed days (hide inputs, show "Add" button)
- [x] 13.3 Update submission logic to omit removed days from the payload
- [x] 13.4 Write component tests for the new toggle behavior

## Implementation Details

The BusinessProfileEditor at `islands/BusinessProfileEditor.tsx` currently renders all 7 days (Mon-Sun) with open/close time inputs. A "Fechado" (closed) toggle already exists conceptually but the UI forces every day to have values.

Add a per-day toggle button (e.g., "Remove day" / "Add day") that controls visibility of that day's time inputs. When a day is removed:
- The open/close inputs are hidden
- A "+ Add [Day]" button is shown
- On submit, that day's key is omitted from the openingHours object

The existing `validateOpeningHours()` function in `lib/business.ts` already handles partial records — it validates only the entries that exist.

### Relevant Files
- `islands/BusinessProfileEditor.tsx` — Island to modify
- `lib/business.ts` — OpeningHours type and validation (already supports partial records)

### Dependent Files
- (none — self-contained UI change)

## Deliverables

- Updated `BusinessProfileEditor.tsx` with per-day toggle
- Hide/show behavior for removed days
- Submission correctly omits removed days
- Component tests with 80%+ coverage

## Tests

- Component tests:
  - [ ] All 7 days shown by default with open/close inputs
  - [ ] Clicking "Remove" on a day hides its inputs and shows "Add" button
  - [ ] Clicking "Add" on a removed day restores its inputs
  - [ ] Multiple days can be removed independently
  - [ ] Submitting with removed days omits them from the payload
  - [ ] Existing validation still works for remaining days
  - [ ] Submitting with all days removed is valid (empty openingHours)
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Merchants can remove individual days from their schedule
- Removed days can be re-added
- Submitted data is correct for partial week schedules

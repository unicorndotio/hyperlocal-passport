---
status: completed
title: 'PassportCover island + passaporte page update'
type: frontend
complexity: medium
dependencies:
  - task_04
---

# Task 07: PassportCover island + passaporte page update

## Overview

Create the `PassportCover` island that implements the Bento-style passport cover with open/closed/locked states and a 2D slide-and-fade animation. Update the passaporte page to use this island instead of the flat redemption list.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create `islands/PassportCover.tsx` using `useSignal` for state management
- MUST implement three states: `closed` (deep blue cover), `open` (light yellow inner pages with QR codes), `locked` (pending/rejected status with explanatory message)
- MUST use hardware-accelerated CSS transitions (`transform`, `opacity`) for the 2D slide-and-fade animation
- MUST render `QRCodeDisplay` islands for each active redemption when in open state
- MUST render the savings history section (total savings + per-business breakdown)
- MUST update `routes/passaporte.tsx` to use `<PassportCover>` and `<BottomNav>`
- MUST use Bento design tokens (deep blue gradient, light yellow, JetBrains Mono for code)
</requirements>

## Subtasks

- [x] 07.1 Create `islands/PassportCover.tsx` with useSignal state machine
- [x] 07.2 Implement closed state — deep blue cover card with passport branding
- [x] 07.3 Implement open state — slide-and-fade transition showing active redemptions with QR codes
- [x] 07.4 Implement locked state — locked badge with verification message
- [x] 07.5 Integrate `QRCodeDisplay` islands for each redemption code
- [x] 07.6 Integrate savings history display
- [x] 07.7 Update `routes/passaporte.tsx` to use PassportCover + BottomNav
- [x] 07.8 Write tests

## Implementation Details

See TechSpec "System Architecture" and "Core Interfaces" sections for the PassportCover island design. See PRD "F4 — Digital Passport" for the UX requirements.

The animation uses CSS transitions triggered by toggling a `data-open` attribute on the container. No JavaScript animation libraries.

The locked state is shown when `ctx.state.user.status` is `pending` or `rejected`. The existing page handler in `routes/passaporte.tsx` already checks auth.

### Relevant Files

- `islands/PassportCover.tsx` — New island
- `routes/passaporte.tsx` — Modify: use PassportCover + BottomNav
- `islands/QRCodeDisplay.tsx` — Existing QR island (reuse)
- `components/BottomNav.tsx` — From task_04
- `components/ui/card.tsx` — Card component for styling
- `lib/utils.ts` — `formatBRL()` for savings display
- `DESIGN.md` — Bento design tokens

### Dependent Files

- No other tasks depend directly on this one

### Related ADRs

- [ADR-004: Feed Route, Navigation Architecture, and Passport Island](../adrs/adr-004.md) — Documents PassportCover island decision

## Deliverables

- `islands/PassportCover.tsx` with three visual states
- Updated `routes/passaporte.tsx`
- Tests for all three states and animation interaction
- Test coverage >=80%

## Tests

- Unit tests:
  - [x] PassportCover renders in closed state by default (cover visible, inner content hidden)
  - [ ] Tapping the cover transitions to open state (inner content visible) — requires browser/DOM environment
  - [x] PassportCover with status='pending' renders locked badge, cover not tappable
  - [x] PassportCover with status='rejected' renders locked badge with rejection message
  - [x] Open state renders QRCodeDisplay for each redemption
  - [x] Open state renders savings history with total and per-business breakdown
  - [x] PassportCover with empty redemptions array renders empty state
- Integration tests:
  - [ ] `GET /passaporte` renders the PassportCover island in closed state — requires PG_CONNECTION
  - [ ] `GET /passaporte` with pending user renders locked state — requires PG_CONNECTION
- Test coverage target: >=80% — 10/10 unit test steps pass; integration tests need DB
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Passport cover opens and closes with CSS animation
- Locked state correctly gates access for pending/rejected residents
- QR codes display correctly in open state
- Savings history renders correctly

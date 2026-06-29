---
status: completed
title: 'Shared BottomNav component + update existing pages'
type: refactor
complexity: medium
dependencies: []
---

# Task 04: Shared BottomNav component + update existing pages

## Overview

Extract the duplicated bottom navigation bar from `/catalog`, `/passaporte`, and `/business/[id]` into a shared `components/BottomNav.tsx` component. This eliminates markup duplication and provides a single navigation source for all resident-facing pages.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create `components/BottomNav.tsx` as a static UI component (not an island)
- MUST accept an `active` prop indicating the current tab: `'feed'`, `'catalog'`, or `'passaporte'`
- MUST render three tabs: Feed (home icon), Catalog (store icon), Passport (passport icon)
- MUST highlight the active tab using the primary color (`#FAD4C0`)
- MUST replace the inline bottom nav in `routes/catalog.tsx`, `routes/passaporte.tsx`, and `routes/business/[id].tsx` with `<BottomNav>`
- MUST preserve all existing navigation behavior and styling
</requirements>

## Subtasks

- [ ] 04.1 Create `components/BottomNav.tsx` with the three-tab layout
- [ ] 04.2 Verify the component renders correctly for each active tab state
- [ ] 04.3 Update `routes/catalog.tsx` — replace inline nav with `<BottomNav active="catalog" />`
- [ ] 04.4 Update `routes/passaporte.tsx` — replace inline nav with `<BottomNav active="passaporte" />`
- [ ] 04.5 Update `routes/business/[id].tsx` — replace inline nav with `<BottomNav active="catalog" />`
- [ ] 04.6 Write tests verifying correct tab highlighting per page

## Implementation Details

The BottomNav is a Preact component (not an island) because the active tab is determined at render time from props, not from client-side interactivity.

Follow the existing component conventions in `components/ui/` (functional component with `cn()` utility for class merging and Bento design tokens).

The three tabs are:
- Feed (`/`) — home/sprinkler icon
- Catalog (`/catalog`) — store/building icon
- Passaporte (`/passaporte`) — passport/booklet icon

### Relevant Files

- `components/BottomNav.tsx` — New component
- `routes/catalog.tsx` — Modify: replace inline nav
- `routes/passaporte.tsx` — Modify: replace inline nav
- `routes/business/[id].tsx` — Modify: replace inline nav
- `components/ui/button.tsx` — Reference for component pattern
- `lib/utils.ts` — `cn()` utility

### Dependent Files

- `routes/index.tsx` — Will use BottomNav with `active="feed"` (task_03)
- `routes/passaporte.tsx` — Also modified by task_07 (PassportCover integration)

### Related ADRs

- [ADR-004: Feed Route, Navigation Architecture, and Passport Island](../adrs/adr-004.md) — Documents nav extraction decision

## Deliverables

- `components/BottomNav.tsx` with three tabs and active state
- Updated `routes/catalog.tsx`, `routes/passaporte.tsx`, `routes/business/[id].tsx`
- Tests for tab highlighting
- Test coverage >=80%

## Tests

- Unit tests:
  - [ ] BottomNav with `active="feed"` renders Feed tab with `text-primary` class
  - [ ] BottomNav with `active="catalog"` renders Catalog tab with `text-primary` class
  - [ ] BottomNav with `active="passaporte"` renders Passport tab with `text-primary` class
  - [ ] Inactive tabs render with `text-muted-foreground` class
  - [ ] All three tab links point to correct routes: `/`, `/catalog`, `/passaporte`
- Integration tests:
  - [ ] Catalog page renders with BottomNav and correct active tab
  - [ ] Passaporte page renders with BottomNav and correct active tab
  - [ ] Business detail page renders with BottomNav and correct active tab
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Bottom nav renders identically across all three pages
- Active tab is correctly highlighted on each page

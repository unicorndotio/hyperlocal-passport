---
status: completed
title: 'Feed page — rewrite routes/index.tsx as feed page'
type: frontend
complexity: medium
dependencies:
  - task_02
---

# Task 03: Feed page — rewrite routes/index.tsx as feed page

## Overview

Replace the Fresh boilerplate index page with the resident feed page. The feed is the new home page and primary discovery surface, displaying a stream of system-generated events and merchant posts fetched from the feed API.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST replace the existing `routes/index.tsx` with a feed page handler + renderer
- MUST fetch feed data server-side via `queryFeed()` from `lib/feed.ts`
- MUST render a feed stream of event cards with type-specific styling (merchant_post, coupon_released, savings_notice)
- MUST include the shared BottomNav component (from task_04) with "feed" tab active
- MUST use lazy-loading for merchant post images
- MUST show an empty state when no feed events exist
- MUST pass `ctx.state.user` to render user-specific content
- MUST show a loading skeleton or progressive enhancement for client-side navigation
</requirements>

## Subtasks

- [ ] 03.1 Rewrite `routes/index.tsx` handler to call `queryFeed()` server-side
- [ ] 03.2 Design and implement feed event card rendering with type-specific styling
- [ ] 03.3 Implement merchant post card with image lazy-loading
- [ ] 03.4 Implement coupon release and savings notice cards
- [ ] 03.5 Add empty state and loading state
- [ ] 03.6 Write tests for the feed page

## Implementation Details

The feed page follows the Fresh pattern: `define.handlers({ GET })` fetches data via `queryFeed()`, returns it via `page()`. The default export `define.page` renders the feed stream.

Each event type has a distinct visual treatment:
- `merchant_post` — Card with business name, title, body text, optional image (lazy-loaded)
- `coupon_released` — Compact card with "New coupon!" badge, business name, title
- `savings_notice` — Compact card with savings amount highlight, business name
- `admin_announcement` — Card with announcement styling

See existing Fresh page patterns in `routes/catalog.tsx` and `routes/passaporte.tsx`. Use Bento design system tokens from `DESIGN.md`.

### Relevant Files

- `routes/index.tsx` — Rewrite completely
- `lib/feed.ts` — Feed query function (imported on server side)
- `routes/catalog.tsx` — Reference for Fresh page pattern
- `components/ui/card.tsx` — Use Card component for event cards
- `DESIGN.md` — Design tokens for styling

### Dependent Files

- No other tasks depend on this file (it's the terminal page)

### Related ADRs

- [ADR-004: Feed Route, Navigation Architecture, and Passport Island](../adrs/adr-004.md) — Feed replaces root route

## Deliverables

- Rewritten `routes/index.tsx` with feed page handler and renderer
- Feed event card rendering with type-specific styling
- Unit and integration tests
- Test coverage >=80%

## Tests

- Unit tests:
  - [ ] Handler with no feed events renders empty state with appropriate message
  - [ ] Handler with merchant_post events renders business name, title, body correctly
  - [ ] Handler with coupon_released events renders coupon badge and title
  - [ ] Handler with savings_notice events renders savings amount highlight
- Integration tests:
  - [ ] `GET /` returns 200 with feed HTML containing event cards
  - [ ] `GET /` passes user from ctx.state.user to the renderer
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Feed page renders all 4 event types correctly
- Empty state shows when no events exist

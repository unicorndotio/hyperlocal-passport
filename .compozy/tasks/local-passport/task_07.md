---
status: pending
title: Demand signal frontend
type: frontend
complexity: medium
dependencies:
  - task_06
---

# Task 07: Demand signal frontend

## Overview

Add the user-facing "Request a service" button on the catalog page and an admin-facing signal viewer tab in the ApprovalDashboard island. Residents can submit requests for businesses/services not yet in the catalog. Admins can view all signals aggregated by category and mark them as reviewed.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add a "Solicitar serviço" (Request a service) button on the catalog page at `routes/catalog.tsx`
- MUST show a modal/dialog when the button is clicked with: free-text description input + category dropdown selector + submit button
- MUST call `POST /api/signals` on submit and show success confirmation
- MUST show inline error feedback on failure
- MUST add a signal viewer tab to the admin ApprovalDashboard island showing signals grouped by category with counts
- MUST allow admin to mark individual signals as reviewed
- MUST show a badge with total unreviewed count on the signal viewer tab
</requirements>

## Subtasks

- [ ] 7.1 Add "Solicitar serviço" button to the catalog page (`routes/catalog.tsx`)
- [ ] 7.2 Create signal request modal component (inline in catalog or reusable)
- [ ] 7.3 Implement form submission to `POST /api/signals` with success/error feedback
- [ ] 7.4 Add signal viewer tab to `islands/ApprovalDashboard.tsx` with category-grouped list
- [ ] 7.5 Implement admin review action (mark as reviewed) calling `PUT /api/admin/signals/[id]/review`
- [ ] 7.6 Add unreviewed count badge to the tab header
- [ ] 7.7 Write UI component and integration tests

## Implementation Details

The catalog page at `routes/catalog.tsx` uses a server-rendered handler + `define.page`. The "Request a service" button and modal can be added as a small inline island embedded in the catalog page, or as a separate island component imported by the page.

The admin ApprovalDashboard at `islands/ApprovalDashboard.tsx` already has a tabbed interface (approvals tab). Add a new "Sinais" (Signals) tab with signals fetched from `GET /api/admin/signals`. Follow the existing tab pattern for consistency.

Use Radix UI dialog (already available as `components/ui/alert-dialog.tsx` or create a simple modal) for the signal request form.

### Relevant Files

- `routes/catalog.tsx` — Add "Request a service" button + modal trigger on the page
- `islands/ApprovalDashboard.tsx` — Add signal viewer tab with category counts and review actions
- `routes/admin/approvals.tsx` — Already renders ApprovalDashboard; no changes needed
- `components/ui/badge.tsx` — For unreviewed badge count display

### Dependent Files

- `routes/api/signals/index.ts` — POST endpoint consumed by resident form (Task 06)
- `routes/api/admin/signals/index.ts` — GET endpoint consumed by admin tab (Task 06)
- `routes/api/admin/signals/[id]/review.ts` — PUT endpoint for review action (Task 06)

### Related ADRs

- [ADR-003: Resident Demand Signals Storage and Notification](adrs/adr-003.md) — Defines the signal data model and admin notification approach

## Deliverables

- Updated `routes/catalog.tsx` with "Request a service" button and modal form
- Updated `islands/ApprovalDashboard.tsx` with signal viewer tab, category groups, review actions, and unreviewed badge
- Tests for the UI components (rendering, form submission, signal listing, review action)
- Test coverage >= 80% for modified files

## Tests

### Unit Tests

- [ ] Catalog page renders "Solicitar serviço" button
- [ ] Signal request modal opens on button click
- [ ] Modal form renders category dropdown and description textarea
- [ ] Modal submit calls correct API endpoint
- [ ] Modal shows success confirmation on 201
- [ ] Modal shows error feedback on 400/429

### Integration Tests

- [ ] ApprovalDashboard renders "Sinais" tab when signals exist
- [ ] ApprovalDashboard shows category-grouped signals with counts
- [ ] ApprovalDashboard shows unreviewed badge count
- [ ] Admin marks a signal as reviewed → badge count decrements
- [ ] Non-admin cannot see signal viewer tab

## Success Criteria

- All tests passing
- Test coverage >= 80% for modified files
- Resident can submit a service request from the catalog
- Admin can view, filter by category, and mark signals as reviewed
- Unreviewed count badge updates correctly after review actions

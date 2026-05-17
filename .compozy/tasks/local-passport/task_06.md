---
status: pending
title: Build Admin Approvals UI
type: frontend
complexity: medium
dependencies:
  - task_05
---

# Task 06: Build Admin Approvals UI

## Overview
Develop the visual dashboard where administrators can review pending resident registrations, inspect uploaded documents, and approve or reject applications to join the benefits club.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST provide a dashboard view listing all users with `status: pending`.
- MUST securely render the document URLs (CNH and Proof of Residence) provided by `task_02` using pre-signed links if necessary.
- MUST provide "Approve" and "Reject" buttons that call the API built in `task_05`.
- MUST update the UI optimistically or refetch the list upon successful action.
</requirements>

## Subtasks
- [ ] 6.1 Create the admin dashboard route and layout.
- [ ] 6.2 Build a list/table component displaying pending users.
- [ ] 6.3 Build an overlay/modal to view the uploaded documents in high resolution.
- [ ] 6.4 Wire up the action buttons to perform `POST /api/admin/approvals/:userId`.

## Implementation Details
Use shadcn/ui components like Data Table, Dialog/Modal for the images, and Buttons. Ensure the route requires an admin session.

### Relevant Files
- `routes/admin/approvals.tsx` — To be created.
- `islands/ApprovalDashboard.tsx` — To be created.

### Dependent Files
- None.

### Related ADRs
- None.

## Deliverables
- Working Admin UI dashboard.
- Document viewer modal.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for UI flow **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] Component renders list correctly when data is provided.
  - [ ] Approve button triggers API call with correct ID.
- Integration tests:
  - [ ] End-to-end test simulating admin login and successful approval of a mocked pending user.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Admin can review documents and approve users seamlessly.

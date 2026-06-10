---
status: completed
title: Business dashboard UI — profile editor
type: frontend
complexity: medium
dependencies:
  - task_03
---

# Task 05: Business dashboard UI — profile editor

## Overview

Build a self-service profile editor page for business owners to manage their business information: logo, description, social media links (Instagram, Facebook, WhatsApp, online menu), and opening hours. Show an activation status banner when the business is not yet enabled by admin. This is the business owner's counterpart to the admin-operated BusinessManager island.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create a new island `islands/BusinessProfileEditor.tsx` for the self-service profile editor
- MUST create a new route page `routes/business/profile.tsx` that renders the profile editor island
- MUST fetch current business data from `GET /api/businesses/[id]` (owned by the logged-in user)
- MUST save updates via `PUT /api/businesses/[id]/profile` (from Task 03)
- MUST include fields: logo (with preview), description (textarea), socialLinks (Instagram, Facebook, WhatsApp, menu link as URL inputs), openingHours (day-by-day open/close time pickers)
- MUST show a banner "Sua listagem está pendente de ativação. Você será listado assim que sua assinatura for confirmada." when `isActive === false`
- MUST validate fields client-side before submitting
- MUST show success/error feedback after save
- MUST be accessible only to users with `business` or `admin` role (middleware already enforces this for `/business/*` paths)
</requirements>

## Subtasks

- [x] 5.1 Create `routes/business/profile.tsx` page route
- [x] 5.2 Create `islands/BusinessProfileEditor.tsx` island component
- [x] 5.3 Implement logo preview and upload
- [x] 5.4 Implement socialLinks fields (Instagram, Facebook, WhatsApp, menu URL)
- [x] 5.5 Implement openingHours day-by-day time picker UI
- [x] 5.6 Implement activation status banner
- [x] 5.7 Write UI component and integration tests

## Implementation Details

The existing `routes/business/coupons.tsx` and `routes/business/checkout.tsx` show the pattern for business pages. Create a new sibling page at `routes/business/profile.tsx`. The island should:

1. On mount, fetch the current user's session and find their business via `GET /api/businesses` filtered by `userId` (or a dedicated `GET /api/businesses/me` helper)
2. Populate form fields from the fetched business data
3. On submit, call `PUT /api/businesses/[id]/profile` with the updated data

Follow the existing island patterns (Preact hooks, Tailwind styling, Radix UI components from `components/ui/`).

### Relevant Files

- `routes/business/profile.tsx` — New page route for the self-service profile editor
- `islands/BusinessProfileEditor.tsx` — New island component
- `routes/business/coupons.tsx` — Existing business page for reference pattern
- `islands/BusinessManager.tsx` — Existing admin island for field layout reference (logo, description fields)
- `islands/CouponManager.tsx` — Existing business island for UI pattern reference
- `components/ui/card.tsx`, `components/ui/button.tsx`, `components/ui/badge.tsx` — UI primitives

### Dependent Files

- `routes/api/businesses/[id]/profile.ts` — Backend endpoint consumed by this UI (Task 03)
- `routes/_middleware.ts` — Already protects `/business/*` for business+admin roles

### Related ADRs

- [ADR-004: Immediate Business Access with Feature Gating During Activation](adrs/adr-004.md) — Activation status banner requirement, businesses can edit profile before activation

## Deliverables

- New `routes/business/profile.tsx` page route
- New `islands/BusinessProfileEditor.tsx` island with full profile editor UI
- Tests for form rendering, validation, submission, and activation banner
- Test coverage >= 80% for new files

## Tests

### Unit Tests

- [x] Profile editor renders all expected form fields (logo, description, socialLinks, openingHours)
- [x] Activation banner renders when `isActive === false`
- [x] Activation banner hidden when `isActive === true`
- [x] Client-side validation rejects invalid URL in socialLinks fields
- [x] Client-side validation rejects invalid opening time format

### Integration Tests

- [x] Business user loads profile page → sees their business data prefilled
- [x] Business user updates profile → success feedback shown → data persisted
- [x] Business user submits with invalid data → error feedback shown → form not submitted

## Success Criteria

- All tests passing
- Test coverage >= 80% for new files
- Business owner can fully manage their profile via the new UI
- Activation status banner correctly reflects `isActive` state

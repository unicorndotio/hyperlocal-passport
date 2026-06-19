---
status: completed
title: Business self-service registration page
type: frontend
complexity: medium
dependencies:
  - task_02
---

# Task 08: Business self-service registration page

## Overview

Create a public-facing registration page at `/business/register` (or similar path) where business owners can sign up for Passaporte Local. This is the business counterpart to the resident registration page at `/register.tsx`. The page uses the existing `POST /api/businesses/register` endpoint (created in Task 02) to register the business and create a user account with `role=business`.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create a new page route `routes/business/register.tsx` for the public registration page
- MUST create a new island component `islands/BusinessRegistrationForm.tsx` with the registration form
- MUST accept fields: business name (nome fantasia), company name (razão social), CNPJ, email, password
- MUST validate all required fields client-side before submitting (name, companyName, CNPJ, email, password)
- MUST NOT include logo, description, category, socialLinks, or openingHours in registration form — these are edited later in the business profile page (Task 05)
- MUST submit via multipart/form-data to `POST /api/businesses/register`
- MUST show loading state during submission
- MUST show success state with message: "Cadastro enviado! Sua conta foi criada, mas o negócio só aparecerá no catálogo após confirmação de pagamento e ativação pelo admin. Você já pode fazer login e preparar seu perfil."
- On success, redirect to `/login` (shared login page for residents, businesses, and admins) with a `?registered=business` query param
- The login page (`routes/login.tsx`) MUST show a toast/banner when `?registered=business` is present: "Conta criada! Aguarde ativação do admin para seu negócio aparecer no catálogo. Faça login para completar seu perfil."
- MUST show error messages from API (400 validation, 409 duplicate email/CNPJ, 500 server error)
- MUST follow the same visual design as `routes/register.tsx` (RegistrationForm island)
- MUST be accessible without authentication (public page)
- MUST redirect to login page on successful registration
</requirements>

## Subtasks

- [ ] 8.1 Create `routes/business/register.tsx` page route
- [ ] 8.2 Create `islands/BusinessRegistrationForm.tsx` island component
- [ ] 8.3 Implement form fields: business name, company name, CNPJ, email, password
- [ ] 8.4 Implement client-side validation for all fields
- [ ] 8.5 Implement form submission to `/api/businesses/register` with multipart/form-data
- [ ] 8.6 Implement success state with redirect to login
- [ ] 8.7 Implement error handling for API responses
- [ ] 8.8 Write UI component and integration tests

## Implementation Details

The page follows the existing pattern from `routes/register.tsx` and `islands/RegistrationForm.tsx`. The form fields match the API endpoint requirements from Task 02.

### Relevant Files

- `routes/business/register.tsx` — New page route for business registration
- `islands/BusinessRegistrationForm.tsx` — New island component with the form
- `routes/register.tsx` — Existing resident registration page pattern to follow
- `islands/RegistrationForm.tsx` — Existing resident form component pattern to follow
- `routes/api/businesses/register.ts` — Backend endpoint (Task 02) — MUST be updated to remove logo/description/socialLinks/openingHours/category required fields
- `lib/business.ts` — Validation helpers: `isValidCnpj`, `formatCnpjDisplay`
- `lib/signals.ts` — Contains `VALID_CATEGORIES` array for category dropdown
- `components/ui/` — UI primitives (Card, Button, Input, Select, etc.)

### Dependent Files

- `routes/_middleware.ts` — Already allows public access to `/api/businesses/register` (line 23)
- `routes/api/businesses/register.ts` — MUST be updated to make logo optional (remove required validation)
- `routes/login.tsx` — MUST show approval message when `?registered=business` query param present

### Related ADRs

- [ADR-002: Self-Service Business Registration with Admin Payment Gate](../adrs/adr-002.md) — Core ADR defining self-service registration flow
- [ADR-004: Immediate Business Access with Feature Gating During Activation](../adrs/adr-004.md) — Business gets immediate login but catalog visibility requires admin toggle

## Deliverables

- New `routes/business/register.tsx` page route
- New `islands/BusinessRegistrationForm.tsx` island with full registration form UI
- Unit tests for form validation logic
- Integration tests for form submission flow
- Test coverage >= 80% for new files

## Tests

### Unit Tests

- [ ] Form renders all required fields (business name, company name, CNPJ, category, email, password)
- [ ] Form renders optional fields: logo, description, socialLinks, openingHours
- [ ] CNPJ validation accepts valid CNPJ and rejects invalid format
- [ ] Email validation accepts valid email and rejects invalid format
- [ ] Password validation enforces minimum 8 characters
- [ ] Logo file validation (when provided) accepts JPG/PNG/WebP and rejects other types
- [ ] SocialLinks validation accepts valid URLs and rejects invalid ones
- [ ] OpeningHours validation accepts valid HH:MM format with open < close
- [ ] Category dropdown shows all VALID_CATEGORIES
- [ ] Form shows field-level errors on blur for invalid input
- [ ] Form submits successfully without logo file

### Integration Tests

- [ ] Valid form submission (with logo) returns 201 and shows success state
- [ ] Valid form submission (without logo) returns 201 and shows success state
- [ ] Duplicate email returns 409 and shows appropriate error
- [ ] Duplicate CNPJ returns 409 and shows appropriate error
- [ ] Missing required fields returns 400 with field-specific errors
- [ ] Invalid CNPJ returns 400 with CNPJ error
- [ ] Successful registration redirects to `/login?registered=business` after success state
- [ ] Loading state shown during submission
- [ ] Login page shows approval banner when `?registered=business` present

## Success Criteria

- All tests passing
- Test coverage >= 80% for new files
- Business owner can register via the new page
- Form validates client-side before submission
- Success message explains admin approval is needed before business appears in catalog
- On success, user is redirected to login page
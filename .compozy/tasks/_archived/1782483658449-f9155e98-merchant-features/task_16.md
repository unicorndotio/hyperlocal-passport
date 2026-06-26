---
status: completed
title: Localize Admin Merchant Route Pages to pt-BR
type: frontend
complexity: low
dependencies: []
---

# Task 16: Localize Admin Merchant Route Pages to pt-BR

## Overview

Translate all English inline UI strings in `routes/admin/coupons.tsx` and `routes/admin/analytics.tsx` to Brazilian Portuguese, and fix the mixed-language page heading in `routes/business/analytics.tsx`. These admin route pages contain navigation links and page titles that are currently in English, while the existing admin routes (`routes/admin/approvals.tsx`, `routes/admin/businesses.tsx`) already use Portuguese for the same navigation elements — causing inconsistency.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- The admin header title "Admin Panel" in both files MUST be changed to "Painel Administrativo" to match existing admin routes
- All navigation link labels MUST be translated to pt-BR to match existing admin routes: "Approvals" → "Aprovações", "Businesses" → "Empresas Parceiras", "Coupons" → "Cupons", "Analytics" → "Analytics"
- The "Back to site" link MUST be changed to "Voltar para o site" to match existing admin routes
- The page title "Coupon Management" in `coupons.tsx` MUST be translated to "Gerenciamento de Cupons"
- The page description in `coupons.tsx` MUST be translated to pt-BR
- The page title "System Analytics" in `analytics.tsx` MUST be translated to "Analytics do Sistema"
- The page description in `analytics.tsx` MUST be translated to pt-BR
- The business analytics page heading "Analytics" in `routes/business/analytics.tsx` MUST be changed to "Analytics" (already correct in pt-BR — this file is mostly Portuguese except for this heading which is acceptable as-is but must be verified for consistency)
- All existing page structure, routing, and island composition MUST be preserved — no logic changes
</requirements>

## Subtasks
- [x] 16.1 Translate admin header and nav links in `routes/admin/coupons.tsx`
- [x] 16.2 Translate page title and description in `routes/admin/coupons.tsx`
- [x] 16.3 Translate admin header and nav links in `routes/admin/analytics.tsx`
- [x] 16.4 Translate page title and description in `routes/admin/analytics.tsx`
- [x] 16.5 Verify `routes/business/analytics.tsx` heading consistency
- [x] 16.6 Verify navigation links work correctly after changes
- [x] 16.7 Verify all tests pass

## Implementation Details

Modify `routes/admin/coupons.tsx`, `routes/admin/analytics.tsx`, and (if needed) `routes/business/analytics.tsx`. These are simple route page components with inline JSX text. No component logic or data flow changes required.

### Existing Portuguese Admin Route Reference

The nav links in `routes/admin/businesses.tsx` and `routes/admin/approvals.tsx` already use:

| Element | Existing pt-BR |
|---------|---------------|
| Header title | `Painel Administrativo` |
| Nav: Approvals | `Aprovações` |
| Nav: Businesses | `Empresas Parceiras` |
| Nav: Coupons | `Cupons` |
| Nav: Analytics | `Analytics` |
| Back link | `Voltar para o site` |

### Specific Changes for `routes/admin/coupons.tsx`

- Line 18: `Admin Panel` → `Painel Administrativo`
- Line 25: `Approvals` → `Aprovações`
- Line 32: `Businesses` → `Empresas Parceiras`
- Line 39: `Coupons` → `Cupons`
- Line 46: `Analytics` → `Analytics` (already correct — same word in pt-BR)
- Line 55: `Back to site` → `Voltar para o site`
- Line 64: `Coupon Management` → `Gerenciamento de Cupons`
- Line 66-67: Description → `Visualize, filtre, edite e exclua cupons em todas as empresas.`

### Specific Changes for `routes/admin/analytics.tsx`

- Line 18: `Admin Panel` → `Painel Administrativo`
- Line 25: `Approvals` → `Aprovações`
- Line 32: `Businesses` → `Empresas Parceiras`
- Line 39: `Coupons` → `Cupons`
- Line 46: `Analytics` → `Analytics` (already correct)
- Line 55: `Back to site` → `Voltar para o site`
- Line 64: `System Analytics` → `Analytics do Sistema`
- Line 66-67: Description → `Métricas agregadas em todas as empresas e cupons.`

### Relevant Files
- `routes/admin/coupons.tsx` — translate nav links, page title, and description
- `routes/admin/analytics.tsx` — translate nav links, page title, and description
- `routes/business/analytics.tsx` — verify heading is already pt-BR consistent
- `routes/admin/businesses.tsx` — reference for existing Portuguese admin nav
- `routes/admin/approvals.tsx` — reference for existing Portuguese admin nav

### Dependent Files
- `islands/AdminCoupons.tsx` — rendered by `coupons.tsx`, translated in task 15
- `islands/AdminAnalytics.tsx` — rendered by `analytics.tsx`, translated in task 15

## Deliverables
- `routes/admin/coupons.tsx` with all nav links, page title, and description in pt-BR
- `routes/admin/analytics.tsx` with all nav links, page title, and description in pt-BR
- `routes/business/analytics.tsx` verified for pt-BR consistency
- Navigation across all admin pages consistently uses Portuguese labels
- All existing tests pass unchanged

## Tests
- Unit tests:
  - [x] Verify nav link labels match existing Portuguese admin routes
  - [x] Verify page titles and descriptions are in pt-BR
- Integration tests:
  - [x] Visual regression: admin coupon management page header and nav in pt-BR
  - [x] Visual regression: admin analytics page header and nav in pt-BR
  - [x] Navigation links point to correct routes after text changes
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Admin nav links in `routes/admin/coupons.tsx` and `routes/admin/analytics.tsx` match the Portuguese labels in `routes/admin/approvals.tsx` and `routes/admin/businesses.tsx`
- Page titles and descriptions are fully in pt-BR
- All navigation links remain functional

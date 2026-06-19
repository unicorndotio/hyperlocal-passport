---
status: completed
title: Localize Admin Merchant UI Islands to pt-BR
type: frontend
complexity: low
dependencies: []
---

# Task 15: Localize Admin Merchant UI Islands to pt-BR

## Overview

Translate all English inline UI strings in `islands/AdminCoupons.tsx`, `islands/AdminAnalytics.tsx`, and `islands/BusinessProfileEditor.tsx` to Brazilian Portuguese. These islands form the admin-facing coupon management and analytics interfaces, plus the business profile editor with opening hours. They contain ~57 user-facing strings (behavior labels, filter controls, table headers, modal dialogs, summary cards, error/empty states, "Add"/"Remove" day buttons) that are currently in English, inconsistent with the existing admin pages that already use Portuguese.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- All behavior type labels in `BEHAVIOR_LABELS` in `AdminCoupons.tsx` MUST be translated to pt-BR (consistent with CouponManager translations)
- All filter labels, placeholders, and options MUST be translated to pt-BR ("Business ID:", "Status:", "All", "Active", "Inactive", "Apply Filters")
- All table column headers MUST be translated to pt-BR ("Business", "Title", "Behavior Type", "Status", "Created", "Actions")
- All button text MUST be translated to pt-BR ("Edit", "Delete", "Cancel", "Save", "Saving...")
- The edit modal title "Edit Coupon", field labels ("Title", "Active"), and info labels ("Behavior:", "Business:") MUST be translated to pt-BR
- The delete confirmation dialog MUST be translated to pt-BR
- All error messages and empty state text MUST be translated to pt-BR
- In `AdminAnalytics.tsx`, all summary card titles ("Total Coupons", "Total Views", "Total Redemptions", "Total Validations", "Total Discount Given") MUST be translated to pt-BR
- The section heading "Per-Business Breakdown" MUST be translated to pt-BR
- All loading, error, and empty state text MUST be translated to pt-BR
- The `toLocaleString('en-US')` calls in `AdminAnalytics.tsx` MUST be changed to `toLocaleString('pt-BR')` for proper number formatting
- In `BusinessProfileEditor.tsx`, the "+ Add" day button text (line 358) MUST be translated to "+ Adicionar"
- In `BusinessProfileEditor.tsx`, the "Remove" day button text (line 431) MUST be translated to "Remover"
- All existing functionality, data flow, and component behavior MUST be preserved — no logic changes
</requirements>

## Subtasks
- [ ] 15.1 Translate all strings in `AdminCoupons.tsx` (behavior labels, filters, table, modal, errors)
- [ ] 15.2 Translate all strings in `AdminAnalytics.tsx` (summary cards, section headings, empty states, errors)
- [ ] 15.3 Translate "Add" and "Remove" day buttons in `BusinessProfileEditor.tsx`
- [ ] 15.4 Change `toLocaleString('en-US')` to `toLocaleString('pt-BR')` in AdminAnalytics.tsx
- [ ] 15.5 Verify terminology consistency with existing Portuguese admin pages
- [ ] 15.6 Verify all tests pass and UI renders correctly

## Implementation Details

Modify `islands/AdminCoupons.tsx`, `islands/AdminAnalytics.tsx`, and `islands/BusinessProfileEditor.tsx`. All three contain inline string constants and JSX text nodes. No component structure, state management, or API call changes are required.

### Terminology Alignment

Reference the existing Portuguese admin pages (`routes/admin/approvals.tsx`, `routes/admin/businesses.tsx`) for consistent admin terminology:

- "Business" → "Empresa"
- "Businesses" → "Empresas"
- "Title" → "Título"
- "Behavior Type" → "Tipo de Comportamento" or "Tipo"
- "Status" → "Status"
- "Created" → "Criado em"
- "Coupon" → "Cupom"
- "Coupons" → "Cupons"
- "Actions" → "Ações"
- "Edit" → "Editar"
- "Delete" → "Excluir"
- "Cancel" → "Cancelar"
- "Save" → "Salvar"
- "Saving..." → "Salvando..."
- "Active" → "Ativo"
- "Inactive" → "Inativo"
- "All" → "Todos"
- "Apply Filters" → "Aplicar Filtros"
- "Business ID" → "ID da Empresa"
- "Filter by business ID" → "Filtrar por ID da empresa"
- "Add" (day button) → "Adicionar"
- "Remove" (day button) → "Remover"

For AdminAnalytics summary cards:
- "Total Coupons" → "Total de Cupons"
- "Total Views" → "Total de Visualizações"
- "Total Redemptions" → "Total de Resgates"
- "Total Validations" → "Total de Validações"
- "Total Discount Given" → "Total de Descontos Concedidos"
- "Per-Business Breakdown" → "Detalhamento por Empresa"
- "Loading analytics..." → "Carregando analytics..."
- "No data available" → "Nenhum dado disponível"
- "Create coupons across businesses to see analytics here." → "Crie cupons em todas as empresas para ver analytics aqui."

### Relevant Files
- `islands/AdminCoupons.tsx` — translate inline strings; ~35 user-facing strings
- `islands/AdminAnalytics.tsx` — translate inline strings and fix locale formatting; ~20 user-facing strings
- `islands/BusinessProfileEditor.tsx` — translate "Add" and "Remove" day buttons; 2 user-facing strings
- `routes/admin/businesses.tsx` — reference for existing Portuguese admin page style
- `routes/admin/approvals.tsx` — reference for existing Portuguese admin page style
- `islands/CouponManager.tsx` — reference for consistent behavior type label translations (task 14)

### Dependent Files
- `routes/admin/coupons.tsx` — renders AdminCoupons island, may need nav alignment (see task 16)
- `routes/admin/analytics.tsx` — renders AdminAnalytics island, may need nav alignment (see task 16)

## Deliverables
- `islands/AdminCoupons.tsx` with all user-facing strings translated to pt-BR
- `islands/AdminAnalytics.tsx` with all user-facing strings translated to pt-BR and number formatting using pt-BR locale
- `islands/BusinessProfileEditor.tsx` with "Add" and "Remove" day buttons translated to pt-BR
- All existing tests pass unchanged (no logic changes)
- Visual verification of filter panel, coupon table, edit modal, delete confirmation, summary cards, and per-business breakdown in pt-BR

## Tests
- Unit tests:
  - [ ] Verify behavior type labels render in pt-BR
  - [ ] Verify status badges show "Ativo" / "Inativo" instead of "Active" / "Inactive"
  - [ ] Verify modal title reads "Editar Cupom" instead of "Edit Coupon"
  - [ ] Verify "Adicionar" and "Remover" button text in BusinessProfileEditor opening hours
- Integration tests:
  - [ ] Visual regression: admin coupons page filter panel labels are in pt-BR
  - [ ] Visual regression: admin analytics summary cards show pt-BR titles
  - [ ] Visual regression: admin analytics numbers formatted with pt-BR locale (period for decimals, not commas)
  - [ ] Visual regression: delete confirmation dialog in pt-BR
  - [ ] Visual regression: BusinessProfileEditor opening hours shows "Adicionar" and "Remover" instead of "Add" and "Remove"
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Every English string in AdminCoupons.tsx, AdminAnalytics.tsx, and BusinessProfileEditor.tsx replaced with pt-BR equivalent
- Number formatting uses pt-BR locale
- Terminology is consistent with existing Portuguese admin pages
- Component behavior and data flow are unchanged

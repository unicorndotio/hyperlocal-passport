---
status: completed
title: Localize CouponManager Island to pt-BR
type: frontend
complexity: low
dependencies: []
---

# Task 14: Localize CouponManager Island to pt-BR

## Overview

Translate all English inline UI strings in `islands/CouponManager.tsx` to Brazilian Portuguese. This component is the core merchant-facing coupon creation and management interface and contains ~80 user-facing strings (template presets, form labels, validation errors, table headers, buttons, and dynamic summaries) that need to be localized to match the pt-BR language context already set in `<html lang='pt-BR'>`.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- All template preset names and descriptions in `TEMPLATE_PRESETS` array MUST be translated to pt-BR
- All behavior type labels in `BEHAVIOR_LABELS` and `BEHAVIOR_OPTIONS` MUST be translated to pt-BR
- All usage frequency options in `FREQUENCY_OPTIONS` MUST be translated to pt-BR
- All form field labels, placeholders, and button text MUST be translated to pt-BR (including "Title", "Behavior Type", "Template", "Cancel", "New Coupon", "Save Changes", "Create Coupon", "Saving...", etc.)
- All validation error messages in the `validate()` function MUST be translated to pt-BR
- All API error and connection error messages MUST be translated to pt-BR
- All table column headers MUST be translated to pt-BR ("Coupon", "Type", "Discount", "Restrictions", "Status", "Actions")
- The empty state text "No coupons yet. Create your first one above." MUST be translated to pt-BR
- Dynamic summary strings in `behaviorTypeSummary()` and `restrictionSummary()` MUST produce pt-BR output
- The "Edit" button text in the table actions column MUST be translated to pt-BR
- All existing functionality, data flow, and component behavior MUST be preserved — no logic changes
</requirements>

## Subtasks
- [ ] 14.1 Translate template preset names and descriptions (6 presets)
- [ ] 14.2 Translate behavior type labels and select option labels
- [ ] 14.3 Translate usage frequency options
- [ ] 14.4 Translate form labels, placeholders, and button text
- [ ] 14.5 Translate validation error messages
- [ ] 14.6 Translate API and connection error messages
- [ ] 14.7 Translate table headers, empty state, and action buttons
- [ ] 14.8 Update dynamic summary functions to output pt-BR
- [ ] 14.9 Verify all tests pass and UI renders correctly

## Implementation Details

Modify `islands/CouponManager.tsx` — no other files affected. This is a mechanical string replacement task; all template strings, labels, and messages are inline constants and JSX text nodes. The component structure, signals, event handlers, and API calls must remain unchanged.

### Translation Reference

Use the established pt-BR patterns from the rest of the codebase (e.g., `AnalyticsDashboard.tsx`, `BusinessOnboarding.tsx`, `BusinessHeader.tsx`) for tone and terminology consistency:

- "Coupon" → "Cupom" / "Cupons"
- "Discount" → "Desconto"
- "Active" → "Ativo"
- "Type" → "Tipo"
- "Edit" → "Editar"
- "Cancel" → "Cancelar"
- "Save" → "Salvar"
- "Delete" → "Excluir"
- "Create" → "Criar"
- "Loading" → "Carregando"
- "Error" → "Erro"
- "Actions" → "Ações"
- "Status" → "Status" (same in pt-BR)
- "Unlimited" → "Ilimitado"
- "One Time" → "Uma vez"
- "Daily" → "Diário"
- "Weekly" → "Semanal"
- "Monthly" → "Mensal"

Template preset translations follow the pattern set in `BusinessOnboarding.tsx` (steps use pt-BR titles and descriptions).

### Relevant Files
- `islands/CouponManager.tsx` — sole file to modify; all ~80 strings are inline in this file
- `islands/BusinessOnboarding.tsx` — reference for pt-BR tone and terminology used in merchant UI
- `islands/AnalyticsDashboard.tsx` — reference for pt-BR translation patterns in merchant dashboard
- `components/BusinessHeader.tsx` — reference for pt-BR navigation labels ("Meus Cupons", "Validar Cupom", "Analytics", "Meu Perfil")

### Dependent Files
- No other files are expected to change — this is a self-contained localization of a single component

## Deliverables
- `islands/CouponManager.tsx` with all user-facing strings translated to pt-BR
- All existing tests pass unchanged (no logic changes)
- Visual verification that all template cards, form fields, table columns, error messages, and dynamic summaries display in pt-BR
- Manual review of empty states, loading states, and error states in pt-BR

## Tests
- Unit tests:
  - [ ] Verify `behaviorTypeSummary()` outputs pt-BR strings (e.g., `"10% de desconto"` instead of `"10% off"`)
  - [ ] Verify `restrictionSummary()` outputs pt-BR strings (e.g., `"Global: 100"` unchanged but prefix labels are numeric-only, so no change needed)
  - [ ] Verify all validation error messages are in pt-BR
- Integration tests:
  - [ ] Visual regression: coupon creation form renders all labels and placeholders in pt-BR
  - [ ] Visual regression: coupon list table shows pt-BR column headers and empty state
  - [ ] Visual regression: error banners display pt-BR messages
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Every English string in the CouponManager component is replaced with its pt-BR equivalent
- Component behavior, data flow, and API interactions are unchanged
- pt-BR terminology is consistent with existing Portuguese components (BusinessOnboarding, AnalyticsDashboard, BusinessHeader)

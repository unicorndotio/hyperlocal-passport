# Partner Beta PRD

## Overview

The Partner Beta initiative finalizes the business-facing features for a soft launch. It introduces an improved partner dashboard with complete profile fields, revised and simplified coupon campaign models, and a basic ledger system for admins to manage active business states. This effort aims to solve the "chicken-and-egg" problem by successfully onboarding and retaining initial business partners before the resident-facing launch.

## Goals

- Fix current onboarding wizard UX issues to ensure a smooth first-time experience.
- Complete business profile data collection to populate the catalog effectively (including Address, Maps link, and updated Categories).
- Simplify coupon creation by removing confusing configuration options and focusing on clear, outcome-driven preset models.
- Enforce feature restrictions for inactive (non-paying) businesses while allowing them to view historical data.
- Provide admins with a basic ledger to track partner payments and manage subscriptions.

## User Stories

### Partner Business
- As a partner business, I want my onboarding wizard to display correctly over the page and guide me to completion, so I understand how to use the platform.
- As a partner business, I want to edit my full profile including address, category, and Google Maps link, so residents can easily find my physical location.
- As a partner business, I want to easily select between predefined campaign models (e.g., "Benefício Fidelidade") without worrying about confusing configuration options like frequency or user limits.
- As an inactive business, I want to view my past performance but clearly understand that I need to contact the Passport team to reactivate my plan and create new campaigns.

### Administrator
- As an admin, I want to record payments (date, value, months) in a basic ledger and manually toggle a business's active status so I can manage which businesses are currently paying partners.

## Core Features

### 1. Partner Dashboard: Profile & Categories
- **Expanded Profile Fields**: Add inputs for CEP, Street Name, Street Number, Neighborhood, and Google Maps link. Include read-only displays for fields used during account creation (Nome Fantasia, Razão Social, CNPJ).
- **Updated Business Categories**: Replace the existing category list with the new standard list (Gastronomia, Moda, Casa & Decor, Corpo & Fitness, Beleza, Saúde & Farmácia, Educação, Mercado & Conveniência, Serviços, Eventos & Experiências, Hotelaria, Comércio Geral & Outros, Pet & Veterinária, Automotivo).

### 2. Partner Dashboard: Coupon Campaigns
- **Simplified Configuration**: Hide the "frequency" and "user limit" fields to simplify creation (rely on global caps).
- **Contextual Fields**: Tie the "max units" field specifically to BOGO and item-discount types, removing it from percentage and fixed-value discounts. Format all monetary inputs as currency (not cents).
- **Preset Campaign Models**:
  - *Benefício Fidelidade* (Main): Percentage discount, unlimited redemptions, always active, no expiration.
  - *Promoção Relâmpago*: Percentage discount, valid for 7 days.
  - *Promoção de Evento*: Keep as-is.
  - *Liquidação de Item*: Item discount, global limit. (Remove "Desconto Simples").

### 3. Partner Dashboard: Inactive State & Onboarding
- **Inactive Business State**: Implement a "read-only" view for the Coupon and Posts pages. Disable all "Create" and "Edit" buttons and display a prominent warning banner instructing the user to contact `passporte@nodolabs.xyz`.
- **Onboarding Wizard Fix**: Correct the z-index/overlay issues so the wizard covers the page content properly and cannot be dismissed until the user reaches the end of the flow.
- **Analytics**: Temporarily hide the Analytics navigation link.

### 4. Admin Dashboard: Partners Ledger
- **Basic Ledger**: A new table/interface in the admin dashboard to record a payment's date, value, and duration (months).
- **Manual Toggle**: A manual switch to update the `isActive` state and an expiration date field on the business profile.

## User Experience

- **Inactive Partners**: Upon logging in, inactive partners see a warning banner at the top of the dashboard. If they navigate to Campaigns or Posts, they can view existing lists, but the primary action buttons are visually disabled and unclickable.
- **Campaign Creation**: The campaign creation form is streamlined. Selecting a preset (e.g., Benefício Fidelidade) automatically configures the underlying rules without exposing unnecessary complexity (like frequency caps) to the merchant. Inputting prices feels natural (e.g., R$ 15,00 instead of 1500).

## High-Level Technical Constraints

- **Currency Formatting**: Monetary values should be input and displayed as standard currency strings in the UI, but must be converted to/from integer cents for API transport and database storage.
- **Client-Side Restrictions**: The inactive restrictions will be enforced on the client-side UI for this beta phase (buttons disabled, banners shown).

## Non-Goals (Out of Scope)

- Complex analytical dashboards (Google Analytics/Clarity integration will be handled in a future version).
- Changing email or password via the profile page.
- Automated subscription management or direct payment gateway integrations (e.g., Stripe, Pagar.me).
- API-level security enforcement for inactive businesses (deferred to post-beta).

## Phased Rollout Plan

### MVP (Beta Phase)
- Implement all core features listed above.
- Manual payment tracking by admins.
- Client-side enforcement of inactive restrictions.

## Success Metrics

- 100% completion rate for the new business onboarding flow.
- Number of businesses successfully updating their profiles with address and category data.
- Number of active "Benefício Fidelidade" campaigns created by beta partners.

## Risks and Mitigations

- **Risk**: Inactive businesses might bypass the client-side UI restrictions to create campaigns.
  **Mitigation**: Monitor beta usage closely. The risk is low given the trusted nature of the beta partners, but API checks will be fast-tracked if abuse occurs.
- **Risk**: Merchants might find the new currency inputs confusing if not formatted properly.
  **Mitigation**: Ensure robust frontend masking (e.g., using a reliable input mask library) so the input behaves exactly like a standard Brazilian Real currency field.

## Architecture Decision Records

- [ADR-001: Inactive Business Restrictions via Client-Side UI Disablement](adrs/adr-001.md)

## Open Questions

- None at this time.

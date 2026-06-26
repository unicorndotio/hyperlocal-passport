# Passaporte Local — Merchant Features Product Requirements Document

## Overview

Passaporte Local's current coupon system is a placeholder — the "basic" vs "special" type selector is cosmetic with no behavioral difference, checkout only computes percentage discounts, and businesses have no visibility into whether their promotions drive foot traffic. Without these tools, the platform cannot deliver on its core value proposition: giving businesses cost-effective customer acquisition through targeted promotions that build neighborhood loyalty.

**Problem:** Business owners in Jurerê want to run real promotions — "10% off for residents," "double chopp on game day," "R$5 off pastéis on purchases over R$30," "50% off on items expiring today" — but the current system cannot express any of these offers. The Brazilian hyperlocal market is valued at $2.9T (2025) and projected at $13.5T by 2034 (18.7% CAGR), yet no player owns "neighborhood-wide multi-business loyalty" specifically.

**Who it is for:** Business owners and cashiers who need to create, manage, validate, and measure the impact of promotions at the physical point of sale. Admins who support businesses and may create coupons on their behalf.

**Why it is valuable:** A flexible coupon engine with template presets makes powerful promotions accessible to micro-entrepreneurs without a learning curve. Analytics closes the feedback loop — businesses see that their coupons drive visits, giving them a measurable reason to stay subscribed. The checkout rework logs total purchase values per transaction, enabling a future "You saved R$XXX across X visits" feature for residents — a key engagement driver that encourages repeat usage. Together, these features transform Passaporte Local from a discount directory into a retention tool that both businesses and residents actively use and value.

## Goals

- Equip every active business with at least 3 live coupons within 30 days of the feature launch
- Achieve > 70% business activation rate (complete profile + create ≥ 1 coupon within 7 days of being enabled)
- Maintain checkout validation under 10 seconds for all coupon types
- Reach > 60% redemption-to-validation conversion rate (redeemed coupons that are actually used at checkout within 7 days)
- Keep checkout error rate below 5% across all coupon behavior types
- Reduce time-to-first-coupon to under 2 minutes through template presets and interactive onboarding

## User Stories

### Business Owner

- As a business owner, I want to create a coupon by picking a template and setting a discount value so that I can publish a promotion in under 2 minutes without configuring every field.
- As a business owner, I want to choose from percentage discount, fixed amount discount, buy X get Y free, or item-specific discount so that I can run the exact promotion my business needs.
- As a business owner, I want to set restrictions on my coupon (global cap, per-user cap, valid dates, usage frequency, minimum purchase value, application scope) so that I control how the promotion behaves.
- As a business owner, I want to edit an existing coupon's settings so that I can adjust a promotion without deleting and recreating it.
- As a business owner, I want to see how many residents viewed, redeemed, and validated each of my coupons so that I know which promotions drive foot traffic.
- As a business owner, I want to browse my full transaction history with filters so that I can track the total discount I've given and estimate the revenue impact.
- As a business owner, I want to view my expired coupons in a separate tab so that I can review past promotions and decide whether to relaunch similar offers.

### Cashier

- As a cashier, I want to enter the customer's redemption code and the purchase total so that the system calculates the correct discount regardless of coupon type (percentage, fixed, BOGO, item-specific).
- As a cashier, I want to scan a QR code from the customer's phone as an alternative to typing the code so that validation is faster.

### Admin

- As an admin, I want to view, create, edit, and deactivate any business's coupons from a dedicated admin section so that I can support business owners and manage promotions across the platform.
- As an admin, I want to see system-wide coupon analytics (total coupons, total views, total redemptions, total validations, total discount given across all businesses) so that I can measure platform engagement and report to stakeholders.

### Resident

- As a resident, I want to see the specific discount I'm getting (e.g., "R$5 off," "buy 1 get 1 free," "50% off on pastéis") when I redeem a coupon so that I know exactly what to expect at checkout.
- As a resident, I want my redeemed coupon to accurately reflect the promotion I selected so that the checkout experience matches my expectation.

## Core Features

### F1 — Flexible Coupon Engine

Businesses can create coupons with 4 behavior types and a composable restriction matrix. Behaviors define what the coupon does; restrictions define how it behaves.

**Behavior types:**
- **Percentage Discount** — Subtract a percentage of the total (e.g., 10% off)
- **Fixed Amount Discount** — Subtract a fixed monetary value (e.g., R$5 off)
- **Buy X Get Y Free** — Offer free items based on quantity purchased (e.g., buy 1 get 1 free "double chopp", buy 3 get 1 free). Supports both same-item (buy 2 chopps, get 1 free) and cross-item (buy a wine, get a free dessert) through scope configuration. The business inputs the **unit price** of the item. At checkout, the cashier enters the quantity consumed; the system calculates the discount based on how many full sets of (X + Y) fit into the quantity, and logs the total purchase value as `unit_price × quantity_consumed`. Example: chopp at R$10/unit, buy 1 get 1 free, customer consumed 6 → 3 free items → R$30 discount, R$60 total logged.
- **Item-Specific Discount** — Apply a discount to specific items rather than the entire order (e.g., 50% off on pastéis, or R$3 off on espressos). The business inputs the **unit price** and **discount per unit** (percentage or fixed). At checkout, the cashier enters the quantity consumed; the system calculates `discount_per_unit × quantity_consumed` and logs the total purchase value as `unit_price × quantity_consumed`.

**Restrictions:**
- **Global Cap** — Maximum number of redemptions across all residents
- **User Cap** — Maximum redemptions per resident
- **Valid From / Valid Until** — Date and time window for the promotion
- **Usage Frequency** — Per Day, Per Week, Per Month, or One-Time per resident
- **Max Units per Redemption** — Maximum quantity the coupon applies to in a single use (relevant for item-specific and BOGO)
- **Application Scope** — All Items, Specific Categories, or Specific Items
- **Minimum Purchase Value** — Minimum total amount required for the coupon to apply (e.g., R$30 minimum for R$5 off)

**Coupon lifecycle:**
- Coupons auto-deactivate when `validUntil` passes or global cap is reached
- Deactivated coupons move to an "Expired" tab visible only to the business
- Businesses can manually deactivate a coupon at any time
- Businesses can edit coupon settings (restrictions, behavior amount, active status) via a PATCH endpoint

### F2 — Coupon Template Presets

To protect micro-entrepreneurs from choice overload, the coupon creation form starts with a template selector. Templates pre-fill restriction defaults so the business only needs to set a discount value and optionally override restrictions.

**Templates (V1):**
- **Simple Discount** — Percentage off, no cap, always active. Default template, shown first.
- **Flash Sale** — Percentage off, one-time use per resident, 7-day validity. For limited-time offers.
- **Loyalty Perk** — Percentage off, per-week frequency, no expiry. For ongoing resident loyalty.
- **Event Promo** — Fixed amount or BOGO, one-time, single-day validity. For football matches, holidays, etc.
- **Item Clearance** — Item-specific discount, one-time, global cap. For moving specific products.

A "Custom" mode is available for power users who want to configure every restriction manually.

### F3 — Coupon Analytics Dashboard

A dedicated tab in the business dashboard showing per-coupon performance data.

**Per-coupon funnel:**
- **Views** — How many residents saw the coupon on the business detail page
- **Redemptions** — How many residents redeemed the coupon (created a QR code)
- **Validations** — How many redemptions were actually validated at checkout

**Aggregate metrics:**
- Total discount given (R$) across all coupons
- Most popular coupons by views, redemptions, and validations
- Estimated incremental visits (validations per time period)

**Transaction history:**
- Full list of validated transactions with date, coupon name, discount applied, and total amount
- Paginated with search and date range filters

### F4 — Checkout Validation Panel Rework

The cashier-facing validation panel must compute discounts for all behavior types. The flow is gated by coupon type: for percentage and fixed-amount coupons, the cashier enters the total purchase amount (existing flow). For BOGO and item-specific coupons, the cashier enters the **quantity consumed** — the system already knows the unit price from the coupon and calculates both the discount and the total purchase value to log.

- **Percentage Discount:** cashier enters total amount → `amount * percent / 100` (existing formula). Total logged for resident savings tracking.
- **Fixed Amount:** cashier enters total amount → subtract `amountCents` with a floor of zero. Total logged for resident savings tracking.
- **BOGO:** cashier enters **quantity consumed** → system computes `unit_price × quantity_consumed` as total, then calculates free items based on buy/free ratio from the coupon, discount = `free_items × unit_price`. Both discount and total logged.
- **Item-Specific:** cashier enters **quantity consumed** → system computes `unit_price × quantity_consumed` as total, then `discount = discount_per_unit × quantity_consumed`. Both discount and total logged.

The full flow must complete in under 10 seconds to minimize cashier friction. All transaction records include the total purchase value so residents can later see aggregate savings ("You saved R$XXX across X visits").

**Minimum Purchase Value enforcement:** At checkout, if the calculated total is below the coupon's minimum purchase value, the system shows a warning and disables the confirm button.

### F5 — Interactive Business Onboarding

On first login after the merchant features launch, a walkthrough guides the business owner through:
1. The new dashboard layout (Coupons, Checkout, Analytics, Profile tabs)
2. The template-based coupon creation flow
3. How to view analytics and transaction history

Tracked via a `hasSeenMerchantOnboarding` flag per business so it only triggers once.

### F6 — Business Dashboard Redesign

The business header gains a 4th tab:

| Tab | Route | Purpose |
|-----|-------|---------|
| Meus Cupons | `/business/coupons` | Create, edit, manage coupons |
| Validar Cupom | `/business/checkout` | Validate customer redemptions |
| Analytics | `/business/analytics` | Coupon performance funnel + transaction history |
| Meu Perfil | `/business/profile` | Edit business profile, opening hours |

### F7 — Opening Hours UI Fix

Allow removing individual days from the opening hours editor. The data model already supports null entries (closed days), but the UI always shows all 7 days. Add a visual toggle per day (e.g., "Fechado" checkbox) and a clear indicator that a day without times means the business is closed.

## User Experience

### Business Owner Journey

1. Business logs in and sees the **interactive onboarding** walkthrough highlighting the 4-tab layout and the new coupon creation flow
2. Navigates to **Meus Cupons**, clicks "Novo Cupom"
3. Sees the **template selector**: Simple Discount (default), Flash Sale, Loyalty Perk, Event Promo, Item Clearance, or Custom
4. Selects a template, sets the discount value (e.g., 10% for Simple Discount), optionally adjusts restrictions
5. The coupon appears in the coupon list with live usage tracking (claimed / limit progress bar)
6. A resident views the coupon on the business profile page → counted as a **view**
7. The resident clicks "Resgatar Agora" → counted as a **redemption**, QR code generated
8. At checkout, the cashier scans the QR code in the **Validar Cupom** tab → enters the total → system calculates the correct discount for that behavior type → confirms → counted as a **validation**
9. Business navigates to the **Analytics** tab to see the full funnel (views → redemptions → validations) and transaction history

### Cashier Journey

1. Cashier opens the **Validar Cupom** tab on a tablet or computer at the store counter
2. Customer shows their QR code on their phone
3. Cashier scans the QR code (or types the 6-character code manually)
4. System looks up the redemption, validates it is active and not expired, and identifies the coupon behavior type
5. Based on coupon type:
   - **Percentage or Fixed Amount:** Cashier enters the purchase total amount
   - **BOGO or Item-Specific:** Cashier enters the **quantity consumed** (e.g., "6 chopps"). The system already knows the unit price from the coupon.
6. System validates minimum purchase value if applicable — shows a warning and disables confirm if below threshold
7. System shows the discount name, calculated discount value (e.g., "R$ 30,00 de desconto"), and the total purchase value being logged
8. Cashier confirms, system records the transaction (total purchase value + discount + final amount) and marks the redemption as used

### Admin Journey

1. Admin logs in and navigates to the existing "Empresas Parceiras" management page
2. For any business, Admin can click to view, create, edit, or deactivate coupons
3. This enables support scenarios: helping a newly onboarded business set up their first promotion, or troubleshooting a misconfigured coupon

### Resident Journey

1. Resident browses the catalog and opens a business detail page
2. Sees available coupons with clear discount descriptions (e.g., "R$5 OFF", "Compre 1, Leve 2", "50% OFF em Pastéis")
3. Clicks "Resgatar Agora" on a coupon
4. Redirected to the Passaporte page with the QR code
5. The QR code description shows the exact promotion terms
6. Shows the QR code at checkout for validation

## High-Level Technical Constraints

- **Web app only** — No native mobile apps in V1. The business dashboard must work on desktop browsers and tablets at the store counter.
- **Checkout under 10 seconds** — The validation flow must consistently complete in under 10 seconds from code entry to confirmation.
- **No backward compatibility required** — The app is in active local development with no real users. No migration needed; the old coupon format can be replaced entirely.
- **Best-effort analytics** — Analytics data (views, redemptions, validations) is derived from existing KV counters and transaction records. No external analytics pipeline in V1.

## Non-Goals (Out of Scope)

- **Posts and events / timeline feed** — The social timeline with business posts, events, and CTAs. This is a separate V2 feature.
- **Coupon stacking** — Multiple coupons cannot be combined on a single purchase. Each coupon is redeemed and validated independently. Stacking rules are V2.
- **Multi-location business management** — Businesses operate a single location in V1. Per-location coupon targeting and multi-location dashboards are V2.
- **Automated expiry notifications** — No push, email, or in-app notifications for expiring coupons. Businesses see expired coupons in the Expired tab. Notifications are Phase 2 of the broader platform.
- **Refunds or voided transactions** — Once a transaction is recorded, it is immutable. Refund handling is V2.
- **Offline validation mode** — Checkout requires internet connectivity. Offline mode with async reconciliation is V2.
- **Punch card / stamp card loyalty** — The platform is coupon-based, not stamp-card-based. Digital stamp cards are a separate feature category if pursued later.

## Phased Rollout Plan

### MVP (Phase 1)

**Core features delivered:**
- Flexible coupon engine with 4 behavior types and all restrictions
- Coupon template presets (5 templates + Custom mode)
- Coupon analytics dashboard with per-coupon funnel and transaction history
- Checkout validation panel rework for all behavior types
- Business dashboard redesign (4 tabs: Coupons, Checkout, Analytics, Profile)
- Interactive onboarding walkthrough for business owners
- Coupon edit endpoint (PATCH)
- Admin full CRUD access on business coupons
- Auto-deactivation of expired coupons with Expired tab
- Opening hours UI fix (remove individual days)
- Data migration for existing coupons

**Success criteria to proceed to Phase 2:**
- ≥ 3 coupons created per business on average within 30 days
- > 70% business activation rate
- < 5% checkout error rate
- > 60% redemption-to-validation conversion rate

### Phase 2 — Posts & Events

- Timeline feed with business posts, CTAs, and event listings
- Tie coupons to specific posts and events
- Notifications for new posts and expiring coupons

### Phase 3 — Advanced Merchant Tools

- Coupon stacking with configurable priority rules
- Multi-location business management
- Offline validation mode
- Refund and void support
- Punch card / stamp card loyalty option

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Coupons created per business | ≥ 3 avg within 30 days | Coupon creation records grouped by business |
| Business activation rate | > 70% within 7 days of being enabled | Businesses with ≥ 1 coupon / total enabled businesses |
| Time to create a coupon | < 2 minutes from template selection to publish | Session timing on the coupon creation form |
| Redemption-to-validation conversion | > 60% within 7 days | Validations / redemptions per coupon |
| Checkout error rate | < 5% of validation attempts | Error responses / total POSTs to validate endpoint |
| Checkout completion time | < 10 seconds | Time from code entry to confirmation |
| Business retention | > 80% month-over-month renewal | Active businesses at month end / start of month |

## Risks and Mitigations

- **Business overwhelm from the new UI** — The new coupon engine has more options than the current 7-field form. Template presets mitigate this by hiding complexity behind curated defaults. The interactive onboarding walkthrough further reduces the learning curve.

- **Cashier confusion with new discount types** — A cashier used to percentage discounts may be confused by BOGO or item-specific calculations. The checkout panel shows the discount name and value clearly before confirmation. The calculation is fully automated — the cashier only enters the code and total.

- **Businesses don't use analytics** — If the analytics tab is ignored, businesses won't see the value of their coupons. Mitigated by including key metrics (validation count, usage progress) in the coupon list view itself, so even businesses that never visit Analytics get some feedback.

- **Migration breaks existing coupons** — Existing coupons in the old format may cause errors during the transition. Mitigated by a one-time migration script that transforms old coupons to the new format atomically, and backward-compatible code paths for any missed records.

- **Analytics data is sparse initially** — In the first weeks, most coupons will have zero views and zero validations. The analytics tab should show helpful empty states ("Share this coupon with your customers to start seeing results") rather than empty charts.

- **Admins mismanaging business coupons** — Full admin CRUD access means an admin could accidentally deactivate a business's active promotion. Mitigated by confirmation dialogs on destructive actions and an audit log of coupon changes (Phase 2).

## Architecture Decision Records

- [ADR-001: Coupon Engine Architecture — Discriminated Union with Template Presets](adrs/adr-001.md) — Embed behavior+restrictions as a typed discriminated union in a single Coupon document. Calculation dispatched via strategy pattern. Template presets simplify the UI instead of feature flags.
- [ADR-002: Business Dashboard Layout — Cohesive Redesign with Dedicated Analytics Tab](adrs/adr-002.md) — Redesign the business dashboard with 4 tabs (Coupons, Checkout, Analytics, Profile) and interactive onboarding walkthrough.

## Open Questions

- Template preset defaults: exact restriction values for each template need validation with real business testers. (e.g., does "Loyalty Perk" need a user cap per week, or is infinite with per-week frequency better?)
- Analytics data model: views are currently not tracked. A **simple KV counter** (like `globalClaimedCount`) is the pragmatic V1 choice — it's consistent with the existing pattern, requires no new infrastructure, and is sufficient for single-neighborhood scale (~50 businesses). If contention becomes an issue, upgrade to an increment-only counter key in V2.
- Should the admin coupon management get its own dedicated admin section? **Yes** — a new admin section for coupon oversight across all businesses, plus a system-wide analytics view showing aggregate coupon performance across the neighborhood.
- The BOGO same-item vs cross-item question is resolved: both use the same behavior type, differentiated by UI template and scope configuration.

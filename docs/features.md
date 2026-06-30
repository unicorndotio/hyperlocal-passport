# Features — Passaporte Local

Complete inventory of features across all shipped workflows.

---

## Resident Experience

### Hybrid Feed (Home Page)
- Dynamic reverse-chronological timeline on the home page.
- Combines system announcements, new coupon releases, and community transaction event updates ("Maria saved R$ 20 at Padaria do Joao") with merchant-authored text and image posts.
- Personalized "savings notices" appear for logged-in residents when they make a transaction.
- Bypasses authentication logic for public visitors so the feed is accessible prior to registration/login.

### Registration & Onboarding
- Form collects: name, CPF, email, WhatsApp, and document photo uploads.
- Document uploads: photo ID (RG/CNH) and proof of residence.
- Status transitions: `pending` → `approved` | `rejected`.
- Post-submission screen: "Seu cadastro está em análise… aprovado em até 1 dia útil".
- Approval email notification on status change.

### Business Catalog
- Mobile-first category-filtered listing.
- Categories: Casa, Corpo, Alimentação, Esporte (extensible).
- Each business card shows: logo, name, category, discount percentage (5–30%), description, contact.
- Demand signals: "I want this service" button aggregates neighborhood interest.

### Digital Passport (QR Code)
- Bento-style passport card with a premium Brazilian Passport cover design.
- Hardware-accelerated 2D slide-and-fade flip transition when tapped to reveal the inner passport pages.
- Inner passport displays active, unused coupon redemption codes with unique QR representation.
- Locked state: displays a locked status badge and locks all coupon redemption actions if the resident's status is `pending` or `rejected`.

### Coupon Redemption
- Resident selects a coupon from a business page and redeems with one tap.
- System enforces `userMonthlyLimit` and `globalLimit` before generating a code.
- Unique short alphanumeric code + QR generated per redemption.
- Expired and used codes visible in history with status labels.

### Savings History
- Total savings counter dynamically shows the cumulative value the resident has received from checkouts.
- Full breakdown of past redemptions, including business name, discount amount, and date.
- Access is gated to approved residents.

---

## Business Experience

### Validation Dashboard (Cashier Panel)
- Web-based, no new hardware required — runs on any browser
- Primary input: type code or scan QR code
- System confirms resident identity and approval status
- Cashier enters purchase total; system calculates exact discount in BRL
- One-click confirmation records the transaction

### Checkout Calculator
Dispatches by coupon behavior type:
| Behavior | Calculation |
|----------|-------------|
| Percentage discount | `totalAmount × percent / 100` |
| Fixed amount | `totalAmount - amountCents` |
| Buy X Get Y Free | free items at zero cost, quantity tracking |
| Item-specific | `discountCents × quantity` |

### Coupon Management
- Business or admin creates coupons with: title, behavior type, restrictions
- Restrictions: global cap, per-user monthly cap, valid from/until, minimum purchase value
- Template presets for common promotions (Simple Discount, Flash Sale, Loyalty Perk, Event Promo, Item Clearance)
- Custom mode for power users who want to configure every restriction field
- Edit (PATCH) existing coupons: update restrictions, discount value, active status
- Basic and special coupon types (special = limited-time / limited-quantity event offers)

### Opening Hours
- Per-day open/close hours stored on business profile
- Individual days can be removed (marked as closed)

### Post Publishing
- Simplified publisher UI form for businesses to write text updates and upload promotional images.
- Integrates with the backend image optimization pipeline (using `sharp`) to compress image sizes dynamically.
- Automatically refreshes the global feed materialized view upon creation/updates.

---

## Admin Backoffice

### Resident Approval Queue
- Lists all pending registrations with name, CPF, submission date
- Document viewer: inline display of uploaded ID and proof of residence
- Approve or reject with one action; triggers email notification to resident
- Target SLA: < 24 hours

### Business Management (CRUD)
- Create, read, update, deactivate business profiles
- Assign business profile to a user account
- Manage logo upload, category, discount offer, CNPJ

### User Auditing
- System-wide visibility into all users by role and status
- View documents for any resident

---

## Coupon Engine (Detailed)

The coupon behavior is stored as a **discriminated union** on the Coupon document, enabling a strategy-pattern dispatch at checkout. Restrictions are a composable set orthogonal to behavior.

### Behavior Types
```
percentage_discount  → e.g. "10% off entire purchase"
fixed_amount         → e.g. "R$5 off on purchases over R$30"
buy_x_get_y          → e.g. "Buy 2 chouriços, get 1 free"
item_specific        → e.g. "R$3 off each pastel after 6pm"
```

### Restriction Matrix
| Restriction | Description |
|-------------|-------------|
| `globalLimit` | Total redemptions available across all users (null = infinite) |
| `userMonthlyLimit` | Max redemptions per user per calendar month |
| `validFrom` / `validUntil` | Date window for the offer |
| `minPurchaseValue` | Minimum total before discount applies |
| `maxUnitsPerRedemption` | For BOGO/item-specific: max qualifying units |
| `applicationScope` | Which items/categories the discount applies to |

---

## Demand Signals (F6)

At the moment this feature was deferred to a future version of the application, there are still some remnants of it in the code:

Residents can signal interest in services not yet listed:
- "I want this service" button on catalog items and empty-category states
- "Request a service" freeform input for unlisted service types
- Signals aggregate per category/neighborhood — visible to admins and prospective businesses as evidence of demand
- Designed to seed V2 mesh-network data

---

## Out of Scope (V1 — Do Not Implement)

These features are explicitly deferred to future phases:

| Feature | Target Phase |
|---------|-------------|
| Marketplace / e-commerce | Phase 3 |
| Payment gateway (subscriptions or in-app purchases) | Phase 3 |
| Cashback / points accumulation (Beach Pay-style) | Phase 3 |
| Community classifieds, lost-and-found, "Anuncie Aqui" | Phase 2 |
| Mobile push notifications | Phase 2 |
| Self-service business onboarding | Phase 2 |
| Automated document verification (idwall / Unico Check) | Phase 2 |
| WhatsApp-based service quote requests | Phase 2 |
| Multi-neighborhood admin tools | Phase 2 |
| Coupon stacking (multiple coupons per purchase) | Phase 2 |
| Multi-location business management | Phase 2 |
| Automated coupon expiry notifications | Phase 2 |
| Refunds / voided transactions | Phase 2 |
| Offline validation mode | Phase 2 |
| Family sub-accounts / dependents with own QR | Open question |
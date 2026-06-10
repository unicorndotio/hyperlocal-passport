# Passaporte Local — Neighborhood Benefits Platform

## Overview

Passaporte Local is a mobile-first web application that connects neighborhood residents with local businesses through a discount and benefits club. Residents get exclusive savings at nearby shops, restaurants, and service providers. Businesses pay a flat monthly subscription to be listed and gain access to hyperlocal customers they cannot reach through generic advertising.

**Problem:** Residents lack incentive to choose local merchants over chains and aggregators. Small businesses cannot afford the rising customer acquisition costs of platforms like iFood and Google Ads, and generic loyalty programs fail to build neighborhood-level retention.

**Who it is for:** Residents who want to save money and support their local economy. Small business owners who want repeat customers from their own zip code.

**Why it is valuable:** Creates a closed-loop local economy — money stays in the neighborhood, residents save 5-30% on everyday spending, businesses gain cost-effective customer acquisition and retention.

**V1 ambition:** Launch in a single dense neighborhood (Jurerê, Florianópolis) with 10-15 businesses pre-onboarded and a validated retention loop before expansion. Hybrid approach: original core features plus resident demand-signal augmentation to seed mesh-network data for V2.

## Summary / Differentiator

No Brazilian player currently owns "neighborhood-wide multi-business loyalty." Existing solutions are either national points programs (Smiles, Livelo, Esfera) or single-store punch cards. Passaporte Local fills the gap — a multi-business neighborhood network with QR-based validation at the physical point of sale. The addition of resident demand signals ("I want this service in my neighborhood") transforms the platform from a passive discount catalog into an active economic coordination layer, seeding mesh-network data for V2.

## Problem

Residents of Brazilian neighborhoods spend significant money outside their local area — at shopping malls, large chains, and digital aggregators. They do this not out of preference but because they have no visibility into what local businesses offer, no incentive to choose them, and no convenient way to access neighborhood-specific discounts. The hyperlocal services market is valued at $2.9T globally (2025) and projected to reach $13.5T by 2034 (18.7% CAGR), yet most of that value leaks to global aggregators.

Small business owners face a parallel pain: they cannot afford the high commissions of food delivery platforms (iFood charges 12-27% per order) or the escalating costs of digital ads. They know their best customers live within a 2km radius, but they have no cost-effective tool to reach them specifically. Loyalty programs return 2.5x more frequent visits (ABRASCE data), but implementing one is technically and financially out of reach for most micro-empresários.

### Market Data

- Hyperlocal services market: $2.9T (2025), projected $13.5T by 2034 (CAGR 18.7%)
- Brazilian loyalty members return 2.5x more frequently (ABRASCE)
- No major Brazilian player owns "neighborhood commerce/loyalty" specifically
- Customer acquisition costs are 5-7x higher than retention costs
- Typical SMB loyalty platform pricing: $12-200/mo per business

## Core Features

| # | Feature | Priority | Description |
| --- | ------- | -------- | ----------- |
| F1 | Resident Onboarding with Document Verification | Critical | Residents upload photo ID and proof of residence. Admin approves or rejects within 24h SLA. Collects CPF, email, family members, preference filters. |
| F2 | Business Catalog by Category | Critical | Mobile-first catalog organized by categories (Casa, Corpo, Alimentação, Esporte, etc.). Each business shows logo, discount percentage (5-30%), description, location, and contact. |
| F3 | Digital Passport (QR Code) | Critical | Authenticated residents see a QR code on their phone representing their CPF-linked passport. Presented at the physical store checkout to claim discounts. |
| F4 | Business Validation Panel | Critical | Web-based tool for cashiers: type CPF or scan QR, enter purchase total, system calculates discount and records the transaction. Must work in under 10 seconds. |
| F5 | Admin Backoffice | High | Pending approval queue with document viewer, business CRUD (admin creates business profiles, no self-service in V1), catalog management. |
| F6 | Resident Demand Signals | High | "I want this service" and "Request a service" buttons on catalog items. Signals aggregate into neighborhood demand heatmaps that businesses see as evidence before subscribing. Seeds mesh-network data for V2. |
| F7 | Business Subscription Management | Medium | Register businesses with flat monthly subscription. No payment gateway in V1 — billing handled externally. Subscription tier controls listing visibility and feature access. |

## KPIs

| KPI | Target | How to Measure |
| --- | ------ | -------------- |
| Registered residents approved | 500+ in first 3 months | Count of approved resident records in KV |
| Active businesses listed | 50+ in first 3 months | Count of business profiles with active flag |
| Monthly discount validations | 200+/month by month 3 | Transaction records in KV with timestamp |
| Average resident approval time | < 24 hours | Time delta between registration and approval events |
| Business subscription renewal rate | > 80% month-over-month | Active businesses at end of month vs start |
| Resident activation rate | > 30% | Residents with ≥ 1 validation ever / total approved |

## Feature Assessment

| Criteria | Score | Rationale |
| -------- | ----- | --------- |
| **Impact** | Must do | Directly drives local economy, gives residents savings, gives businesses repeat customers. Market gap is wide open in Brazil. |
| **Reach** | Strong | Affects every neighborhood resident and local business. Addressable market is any Brazilian urban neighborhood. |
| **Frequency** | Strong | Residents shop weekly; businesses transact daily. The QR validation loop creates recurring engagement. |
| **Differentiation** | Strong | No Brazilian competitor owns "neighborhood-wide multi-business loyalty." Demand signals add further differentiation. |
| **Defensibility** | Strong | Network effects compound with each new business and resident. Local community trust is hard to replicate. Flat subscription model avoids the friction of per-transaction fees that competitors might undercut. |
| **Feasibility** | Must do | MVP already built on Deno Fresh + KV + Better Auth. Demand signals are a small UI + API addition. |

**Leverage type:** Compounding Feature (each new resident and business increases value for all others)

## Council Insights

- **Recommended approach:** Launch single neighborhood first (Jurerê) with 10-15 businesses pre-onboarded. Prove the retention loop before expanding. Add resident demand signals to seed V2 mesh-network data.
- **Key trade-offs:** Depth in one neighborhood (stronger learning, better metrics) vs breadth across many (faster brand awareness, risk of thin adoption everywhere). Council unanimously favored depth.
- **Risks identified:**
  - Manual document verification scales linearly and will become a bottleneck at multi-neighborhood scale. Mitigation: automated verification SDK in Phase 2.
  - Jurerê is a wealthy beach enclave — its dynamics may not generalize. Mitigation: document assumptions explicitly; validate in a mid-income neighborhood in Phase 2.
  - Cashier friction kills adoption. Mitigation: the validation panel must work in < 10 seconds; accept CPF typing as primary input (QR scanning is secondary).
- **Stretch goal (V2+):** Evolve from discount passport to neighborhood economic mesh network — resident demand signals, business-to-resident offers, neighborhood-level economic analytics dashboard. The Thinker's reframing of the neighborhood as a platform, not just a directory.

## Out of Scope (V1)

- **Marketplace / e-commerce** — No product listings, checkout, or payment processing. The platform validates discounts at physical POS only. Marketplace is Phase 3+.
- **Cashback or points system** — No monetary accumulation inside the platform. Beach Pay-style cashback is Phase 3+.
- **Self-service business onboarding** — Businesses are onboarded by the admin team. Self-service registration is Phase 2.
- **Classifieds / "Anuncie Aqui"** — No community classifieds, lost-and-found, or paid ad placements. These are Phase 2 engagement tools.
- **Payment gateway integration** — No payment processing for subscriptions or transactions. Business subscriptions billed externally; in-store payments handled by the business's existing POS.
- **Mobile push notifications** — No push notification infrastructure. Web-based alerts only if added. Push is Phase 2.
- **Multi-neighborhood admin tools** — Admin dashboard handles one neighborhood in V1. Multi-neighborhood filtering and management is Phase 2.

## Architecture Decision Records

- [ADR-001: Single-Neighborhood Pilot Before Multi-Neighborhood Expansion](adrs/adr-001.md) — Launch V1 in one dense neighborhood. Prove retention loop before expanding horizontally.

## Open Questions

- Automated document verification: should we use a Brazilian SDK (e.g., idwall, Unico Check) or build rule-based validation? Decision deferred to Phase 2.
- What is the right flat subscription price for businesses? User research indicated preference for flat fee over transaction fees, but exact pricing needs market testing.
- Family member handling: can dependents use the same CPF-linked passport, or does each family member need their own account and QR code?
- Neighborhood expansion cadence: what validated metric triggers expansion to neighborhood #2?
- Demand signal data model: are signals tied to specific businesses, service categories, or both?

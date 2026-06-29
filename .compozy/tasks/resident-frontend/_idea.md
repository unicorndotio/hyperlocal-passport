# Idea: Resident Frontend Dashboard and Digital Passport (V1)

## Overview

The Resident Frontend is the primary user-facing mobile-first interface of Passaporte Local. It allows neighborhood residents to register/login, browse active local business catalogs, redeem promotional coupons, and present a secure digital passport (QR code) at physical points of sale (POS) to claim discounts. 

The V1 scope includes:
1. A hybrid feed displaying automated savings updates and active coupons interspersed with social posts (text + images) published by local merchants.
2. A simple merchant publishing tool for small businesses.
3. An offline-valid QR code verification loop.
4. A premium Bento-style design mirroring a physical passport cover.

## Problem

Residents lack a unified, friction-free way to discover and redeem local neighborhood discounts. Carrying physical coupon sheets or installing separate loyalty applications for every small merchant leads to low adoption and app fatigue. 

Furthermore, local merchants have no direct, low-friction digital channel to announce daily specials, flash sales, or community events (like a local "Banana Festival" or holiday promo) to neighborhood residents. Combining system-generated transaction updates with merchant-authored social posts solves both resident discovery fatigue and merchant marketing limitations.

### Market Data

* **Redemption Performance:** Mobile digital coupons achieve average redemption rates of **7% or higher**, vastly outperforming traditional print media.
* **App Fatigue Barrier:** Approximately **93.5% of mobile consumers** expect digital coupon redemptions, but reject downloading distinct native apps for individual stores. A mobile-optimized web application minimizes setup friction.
* **Point of Sale UX:** In physical retail checkouts, any interaction taking longer than **5 seconds** causes major drop-off and merchant dissatisfaction, emphasizing the need for instant-loading, performant, and offline-capable interfaces.

## Core Features

| #   | Feature | Priority | Description |
| --- | ------- | -------- | ----------- |
| F1  | Bento-Style Feed | Critical | Dynamic feed displaying active coupons, administrative notices, transaction savings (e.g., "Resident saved R$ 20.00"), and merchant-authored social posts interspersed. |
| F2  | Flat Digital Passport | Critical | Deep blue passport cover that opens via hardware-accelerated 2D fade-and-slide transition to show light-yellow pages with the QR code, status, and active codes. |
| F3  | Offline-Valid QR Token | Critical | Generates a dynamic QR code containing a short-lived cryptographic status payload, allowing cashiers to perform offline signature validation in network dead zones. |
| F4  | Merchant Post Publishing | High | A simple publishing interface and API endpoints for verified business accounts to post text and promotional image updates directly to the resident feed. |
| F5  | Business Directory | High | Categorized list and details pages for local merchants showing opening hours, logos, descriptions, social media links, and a list of active coupons. |
| F6  | Verification Gating | High | Shows a locked badge and explanatory status modal for residents with "pending" or "rejected" registration, restricting passport opening and coupon redemption. |
| F7  | Active coupon redemptions | Medium | Tab listing all unused, active redemption codes claimed by the logged-in resident. |

## KPIs

| KPI | Target | How to Measure |
| --- | --- | --- |
| Coupon Redemption Rate | > 10.0% | `redemptions.status` marked as `used` divided by total `redemptions` created. |
| Weekly Merchant Posts | > 20 posts/week | Number of text/image posts published by merchants in the database weekly. |
| Active Passport Circulation | > 150 residents/week | Distinct resident users generating QR codes / loading the passport page weekly. |
| Checkout Validation Time | < 3.0 seconds | Time delta from cashier scanning QR/code to validation success response. |
| POS Validation Failure Rate | < 2.0% | Percentage of failed validation requests due to timeout or offline errors. |

## Feature Assessment

| Criteria | Question | Score |
| --- | --- | --- |
| **Impact** | How much more valuable does this make the product? | **Must do** |
| **Reach** | What % of users would this affect? | **Must do** |
| **Frequency** | How often would users encounter this value? | **Strong** |
| **Differentiation** | Does this set us apart or just match competitors? | **Strong** |
| **Defensibility** | Is this easy to copy or does it compound over time? | **Strong** |
| **Feasibility** | Can we actually build this? | **Must do** |

Leverage type: **Strategic Bet** (Establishes the core user interface, merchant publishing channel, and physical redemption mechanics that enable hyper-local closed-loop commerce).

## Council Insights

* **Recommended approach:** Support merchant text/image publishing but keep the publishing tool lightweight (simple upload/form-based post). Skip custom 3D card flipping animations for the passport cover to free up engineering resources for the publishing pipeline and POS speed.
* **Key trade-offs:** Traded interactive 3D cover gestures for a merchant marketing channel, while relying on automated feed posts (like coupon creations or transaction savings) to prevent a "ghost town" feed if merchant posting activity fluctuates.
* **Risks identified:** Merchant image uploads could impact feed loading performance.
  * *Mitigation:* Automatically compress, optimize, and lazy-load all merchant-uploaded feed images on the backend.
* **Stretch goal (V2+):** Resident social engagement (likes/comments), gamified community savings leaderboard, and interactive 3D WebGL passport flip.

## Out of Scope (V1)

* **Resident Comments / Likes** — Residents cannot comment or react (like/heart) to feed posts in V1 to avoid complex community moderation systems.
* **Cashback / Points Wallet** — No points accumulation or currency wallets. Only direct percentage/fixed coupon redemptions.
* **Interactive 3D Flipping Gesture** — Custom 3D canvas/WebGL card flipping is deferred to V2 to ensure fast POS performance and cross-browser accessibility.

## Architecture Decision Records

* [ADR-001: Scope and UX Decisions for V1 Resident Frontend](adrs/adr-001.md) — Replaces 3D flip animation with 2D transitions, implements hybrid social feed (system events + merchant posts), and enforces online/offline validation parameters.

## Open Questions

* **Image Hosting:** What service or local storage configuration will host merchant-uploaded feed images? (We propose utilizing the existing `file_metadata` local volume mechanism).
* **JWT Expiry:** What is the ideal expiry lifetime for the offline-valid QR code token? (We propose 5 minutes to prevent replay attacks).

# Technical Specification: Partner Beta

## Executive Summary
This TechSpec outlines the implementation for the `partner-beta` workflow. The primary technical focus is adding the Partner Ledger data model and admin API, expanding the Business schema with address fields, and modifying the frontend Preact components for the Partner Dashboard to simplify campaign creation and restrict inactive users. The main technical trade-off is relying on client-side UI restrictions for inactive businesses (ADR-001) rather than comprehensive API-level authorization to optimize for a fast beta launch.

## System Architecture
No new services or major architectural patterns are introduced. We will use the existing Deno Fresh file-based routing and Drizzle ORM schema.
- **Database**: Add `partner_ledger` table and append columns to the existing `businesses` table.
- **Backend API**: Add Admin endpoints for logging payments to the ledger.
- **Frontend (Admin)**: Add a Ledger management component to the `BusinessManager.tsx` island.
- **Frontend (Partner)**: Modify `ProfileForm`, `CampaignForm`, and the dashboard layout to enforce read-only state for inactive partners.

## Data Models

### Changes to `businesses`
Modify `db/schema.ts` to add the following columns to the `businesses` table:
- `cep`: text (for Zip Code)
- `street`: text
- `number`: text
- `neighborhood`: text
- `mapsUrl`: text (Google Maps link)
- `expirationDate`: timestamp (Tracks the end date of the current subscription)

### New Table: `partner_ledger`
Create a new table in `db/schema.ts`:
- `id`: uuid (PK)
- `businessId`: uuid (FK to `businesses.id`)
- `amountCents`: integer
- `months`: integer
- `paymentDate`: timestamp
- `createdAt`: timestamp

## API Design

### 1. Business Profile Update
- **Route**: `PUT /api/businesses/:id`
- **Change**: Extend the Zod validation schema to accept the new address fields and `mapsUrl`.

### 2. Admin Ledger API
- **Route**: `POST /api/admin/businesses/:id/ledger`
- **Payload**: `{ amountCents: number, months: number, paymentDate: string }`
- **Behavior**: Inserts a record into `partner_ledger`. Updates the business's `expirationDate` and sets `isActive = true`.

### 3. Admin Status Toggle
- **Route**: `POST /api/admin/businesses/:id/toggle`
- **Change**: Update the existing logic to also accept an optional `expirationDate` if manually overriden by the admin.

## Core Interfaces

```typescript
// Drizzle Schema Definition for the new Ledger
export const partnerLedger = pgTable('partner_ledger', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, {
    onDelete: 'cascade',
  }),
  amountCents: integer('amount_cents').notNull(),
  months: integer('months').notNull(),
  paymentDate: timestamp('payment_date', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
```

## Development Sequencing

1. **Database Schema & Migrations**: Add the new fields to `businesses` and create `partner_ledger`. Run `drizzle-kit generate`.
2. **Backend APIs**: Update the Business update endpoint and create the new Admin Ledger endpoints.
3. **Admin Dashboard UI**: Update `islands/BusinessManager.tsx` to include a modal or section for logging payments to the ledger and displaying the `expirationDate`.
4. **Partner Profile UI**: Update the Partner profile settings form to include the new address inputs, Google Maps link, and update the category list to match the new taxonomy.
5. **Partner Campaigns UI**: Modify the coupon creation form to format inputs as currency (using a masking library or utility) and hide the frequency/user limit fields. Implement the new `Benefício Fidelidade` preset logic.
6. **Inactive Restrictions UI**: Wrap the Partner Dashboard mutating components (Create Coupon, Create Post) with read-only logic and display the warning banner if `isActive` is false.
7. **Onboarding Fix**: Adjust the CSS (z-index, fixed positioning) of the Partner onboarding wizard to correctly overlay the page and remove the background-click-to-close behavior.

## Security and Privacy
Inactive businesses will have UI-level restrictions. As documented in ADR-001, we accept the risk of API abuse for the beta launch, but admin functionality (Ledger) remains strictly protected by existing RBAC middleware.

## Architecture Decision Records
- [ADR-001: Inactive Business Restrictions via Client-Side UI Disablement](adrs/adr-001.md)
- [ADR-002: Ledger Data Model](adrs/adr-002.md)

## Open Questions
- What specific currency masking library should we use for the frontend (e.g., a custom Preact hook or a lightweight package like `react-number-format` adapted for Preact)? *I recommend using standard JS `Intl.NumberFormat` with a custom input handler to avoid heavy dependencies.*

import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ── Users (Better Auth + custom fields) ──
export const users = pgTable('user', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  name: text('name').notNull(),
  image: text('image'),
  role: text('role').default('resident'),
  status: text('status').default('pending'),
  cpf: text('cpf'),
  phone: text('phone'),
  address: text('address'),
  documents: jsonb('documents').default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ── Businesses ──
export const businesses = pgTable('businesses', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  companyName: text('company_name').notNull(),
  cnpj: text('cnpj').notNull().unique(),
  category: text('category').notNull(),
  description: text('description'),
  logoUrl: text('logo_url').notNull(),
  socialLinks: jsonb('social_links'),
  openingHours: jsonb('opening_hours'),
  isActive: boolean('is_active').notNull().default(false),
  hasSeenMerchantOnboarding: boolean('has_seen_merchant_onboarding').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idxUserId: index('idx_businesses_user_id').on(table.userId),
}))

// ── Coupons ──
export const coupons = pgTable('coupons', {
  id: text('id').primaryKey(),
  businessId: text('business_id').notNull().references(() => businesses.id),
  title: text('title').notNull(),
  description: text('description'),
  behavior: jsonb('behavior').notNull(),
  restrictions: jsonb('restrictions').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idxBusinessId: index('idx_coupons_business_id').on(table.businessId),
}))

// ── Redemptions ──
export const redemptions = pgTable('redemptions', {
  id: text('id').primaryKey(),
  couponId: text('coupon_id').notNull().references(() => coupons.id),
  businessId: text('business_id').notNull().references(() => businesses.id),
  userId: text('user_id').notNull().references(() => users.id),
  status: text('status').notNull().default('active'),
  redeemedAt: timestamp('redeemed_at').notNull().defaultNow(),
  usedAt: timestamp('used_at'),
}, (table) => ({
  idxUserCouponMonth: index('idx_redemptions_user_coupon_month').on(table.userId, table.couponId, table.redeemedAt),
  idxCouponId: index('idx_redemptions_coupon_id').on(table.couponId),
}))

// ── Transactions ──
export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  redemptionId: text('redemption_id').notNull().references(() => redemptions.id),
  couponId: text('coupon_id').notNull().references(() => coupons.id),
  businessId: text('business_id').notNull().references(() => businesses.id),
  userId: text('user_id').notNull().references(() => users.id),
  totalAmountCents: integer('total_amount_cents').notNull(),
  discountAppliedCents: integer('discount_applied_cents').notNull(),
  finalAmountCents: integer('final_amount_cents').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
}, (table) => ({
  idxCouponId: index('idx_transactions_coupon_id').on(table.couponId),
  idxBusinessId: index('idx_transactions_business_id').on(table.businessId),
  idxUserId: index('idx_transactions_user_id').on(table.userId),
}))

// ── Signals ──
export const signals = pgTable('signals', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  category: text('category').notNull(),
  description: text('description'),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idxUserId: index('idx_signals_user_id').on(table.userId),
  idxStatus: index('idx_signals_status').on(table.status),
}))

// ── Coupon Analytics ──
export const couponAnalytics = pgTable('coupon_analytics', {
  id: text('id').primaryKey(),
  couponId: text('coupon_id').notNull().unique().references(() => coupons.id, { onDelete: 'cascade' }),
  views: integer('views').notNull().default(0),
  redemptions: integer('redemptions').notNull().default(0),
  validations: integer('validations').notNull().default(0),
})

// ── File Metadata ──
export const fileMetadata = pgTable('file_metadata', {
  id: text('id').primaryKey(),
  filename: text('filename').notNull().unique(),
  userId: text('user_id'),
  isPublic: boolean('is_public').notNull().default(false),
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
})

// ── Better Auth: Session ──
export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
})

// ── Better Auth: Account ──
export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ── Better Auth: Verification ──
export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ── Relations ──

export const usersRelations = relations(users, ({ many }) => ({
  businesses: many(businesses),
  redemptions: many(redemptions),
  transactions: many(transactions),
  signals: many(signals),
  sessions: many(session),
  accounts: many(account),
}))

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  user: one(users, { fields: [businesses.userId], references: [users.id] }),
  coupons: many(coupons),
  redemptions: many(redemptions),
  transactions: many(transactions),
}))

export const couponsRelations = relations(coupons, ({ one, many }) => ({
  business: one(businesses, { fields: [coupons.businessId], references: [businesses.id] }),
  redemptions: many(redemptions),
  transactions: many(transactions),
  analytics: one(couponAnalytics),
}))

export const redemptionsRelations = relations(redemptions, ({ one }) => ({
  coupon: one(coupons, { fields: [redemptions.couponId], references: [coupons.id] }),
  business: one(businesses, { fields: [redemptions.businessId], references: [businesses.id] }),
  user: one(users, { fields: [redemptions.userId], references: [users.id] }),
  transaction: one(transactions, { fields: [redemptions.id], references: [transactions.redemptionId] }),
}))

export const transactionsRelations = relations(transactions, ({ one }) => ({
  redemption: one(redemptions, { fields: [transactions.redemptionId], references: [redemptions.id] }),
  coupon: one(coupons, { fields: [transactions.couponId], references: [coupons.id] }),
  business: one(businesses, { fields: [transactions.businessId], references: [businesses.id] }),
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
}))

export const signalsRelations = relations(signals, ({ one }) => ({
  user: one(users, { fields: [signals.userId], references: [users.id] }),
}))

export const couponAnalyticsRelations = relations(couponAnalytics, ({ one }) => ({
  coupon: one(coupons, { fields: [couponAnalytics.couponId], references: [coupons.id] }),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(users, { fields: [session.userId], references: [users.id] }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(users, { fields: [account.userId], references: [users.id] }),
}))

import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull()
    .defaultNow(),
})

// ── Businesses ──
export const businesses = pgTable('businesses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, {
    onDelete: 'cascade',
  }),
  name: text('name').notNull(),
  companyName: text('company_name').notNull(),
  cnpj: text('cnpj').notNull().unique(),
  category: text('category').notNull(),
  description: text('description'),
  logoUrl: text('logo_url').notNull(),
  socialLinks: jsonb('social_links'),
  openingHours: jsonb('opening_hours'),
  isActive: boolean('is_active').notNull().default(false),
  hasSeenMerchantOnboarding: boolean('has_seen_merchant_onboarding').default(
    false,
  ),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull()
    .defaultNow(),
}, (table) => ({
  idxUserId: index('idx_businesses_user_id').on(table.userId),
}))

// ── Coupons ──
export const coupons = pgTable('coupons', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, {
    onDelete: 'cascade',
  }),
  title: text('title').notNull(),
  description: text('description'),
  behavior: jsonb('behavior').notNull(),
  restrictions: jsonb('restrictions').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull()
    .defaultNow(),
}, (table) => ({
  idxBusinessId: index('idx_coupons_business_id').on(table.businessId),
}))

// ── Redemptions ──
export const redemptions = pgTable('redemptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  couponId: uuid('coupon_id').notNull().references(() => coupons.id, {
    onDelete: 'cascade',
  }),
  businessId: uuid('business_id').notNull().references(() => businesses.id, {
    onDelete: 'cascade',
  }),
  userId: text('user_id').notNull().references(() => users.id, {
    onDelete: 'cascade',
  }),
  status: text('status').notNull().default('active'),
  redeemedAt: timestamp('redeemed_at', { withTimezone: true }).notNull()
    .defaultNow(),
  usedAt: timestamp('used_at', { withTimezone: true }),
}, (table) => ({
  idxUserCouponMonth: index('idx_redemptions_user_coupon_month').on(
    table.userId,
    table.couponId,
    table.redeemedAt,
  ),
  idxCouponId: index('idx_redemptions_coupon_id').on(table.couponId),
  idxUserStatus: index('idx_redemptions_user_id_status').on(
    table.userId,
    table.status,
  ),
}))

// ── Transactions ──
export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  redemptionId: uuid('redemption_id').notNull().references(
    () => redemptions.id,
    { onDelete: 'restrict' },
  ),
  couponId: uuid('coupon_id').notNull().references(() => coupons.id, {
    onDelete: 'restrict',
  }),
  businessId: uuid('business_id').notNull().references(() => businesses.id, {
    onDelete: 'restrict',
  }),
  userId: text('user_id').notNull().references(() => users.id, {
    onDelete: 'restrict',
  }),
  totalAmountCents: integer('total_amount_cents').notNull(),
  discountAppliedCents: integer('discount_applied_cents').notNull(),
  finalAmountCents: integer('final_amount_cents').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull()
    .defaultNow(),
}, (table) => ({
  idxCouponId: index('idx_transactions_coupon_id').on(table.couponId),
  idxBusinessId: index('idx_transactions_business_id').on(table.businessId),
  idxUserId: index('idx_transactions_user_id').on(table.userId),
  idxRedemptionId: index('idx_transactions_redemption_id').on(
    table.redemptionId,
  ),
}))

// ── Signals ──
export const signals = pgTable('signals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, {
    onDelete: 'restrict',
  }),
  category: text('category').notNull(),
  description: text('description'),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull()
    .defaultNow(),
}, (table) => ({
  idxUserId: index('idx_signals_user_id').on(table.userId),
  idxStatus: index('idx_signals_status').on(table.status),
}))

// ── Coupon Analytics ──
export const couponAnalytics = pgTable('coupon_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  couponId: uuid('coupon_id').notNull().unique().references(() => coupons.id, {
    onDelete: 'cascade',
  }),
  views: integer('views').notNull().default(0),
  redemptions: integer('redemptions').notNull().default(0),
  validations: integer('validations').notNull().default(0),
})

// ── Merchant Posts ──
export const merchantPosts = pgTable('merchant_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, {
    onDelete: 'cascade',
  }),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body'),
  imageUrl: varchar('image_url', { length: 500 }),
  isVisible: boolean('is_visible').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull()
    .defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  idxBusinessId: index('idx_merchant_posts_business_id').on(table.businessId),
}))

// ── File Metadata ──
export const fileMetadata = pgTable('file_metadata', {
  id: uuid('id').primaryKey().defaultRandom(),
  filename: text('filename').notNull().unique(),
  userId: text('user_id').references(() => users.id, {
    onDelete: 'cascade',
  }),
  isPublic: boolean('is_public').notNull().default(false),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull()
    .defaultNow(),
}, (table) => ({
  idxUserId: index('idx_file_metadata_user_id').on(table.userId),
}))

// ── Better Auth: Session ──
export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull()
    .defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => users.id, {
    onDelete: 'cascade',
  }),
})

// ── Better Auth: Account ──
export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => users.id, {
    onDelete: 'cascade',
  }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', {
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
    withTimezone: true,
  }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull()
    .defaultNow(),
})

// ── Better Auth: Verification ──
export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull()
    .defaultNow(),
}, (table) => ({
  idxIdentifier: index('idx_verification_identifier').on(table.identifier),
}))

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
  merchantPosts: many(merchantPosts),
}))

export const couponsRelations = relations(coupons, ({ one, many }) => ({
  business: one(businesses, {
    fields: [coupons.businessId],
    references: [businesses.id],
  }),
  redemptions: many(redemptions),
  transactions: many(transactions),
  analytics: one(couponAnalytics),
}))

export const redemptionsRelations = relations(redemptions, ({ one }) => ({
  coupon: one(coupons, {
    fields: [redemptions.couponId],
    references: [coupons.id],
  }),
  business: one(businesses, {
    fields: [redemptions.businessId],
    references: [businesses.id],
  }),
  user: one(users, { fields: [redemptions.userId], references: [users.id] }),
  transaction: one(transactions, {
    fields: [redemptions.id],
    references: [transactions.redemptionId],
  }),
}))

export const transactionsRelations = relations(transactions, ({ one }) => ({
  redemption: one(redemptions, {
    fields: [transactions.redemptionId],
    references: [redemptions.id],
  }),
  coupon: one(coupons, {
    fields: [transactions.couponId],
    references: [coupons.id],
  }),
  business: one(businesses, {
    fields: [transactions.businessId],
    references: [businesses.id],
  }),
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
}))

export const merchantPostsRelations = relations(merchantPosts, ({ one }) => ({
  business: one(businesses, {
    fields: [merchantPosts.businessId],
    references: [businesses.id],
  }),
}))

export const signalsRelations = relations(signals, ({ one }) => ({
  user: one(users, { fields: [signals.userId], references: [users.id] }),
}))

export const couponAnalyticsRelations = relations(
  couponAnalytics,
  ({ one }) => ({
    coupon: one(coupons, {
      fields: [couponAnalytics.couponId],
      references: [coupons.id],
    }),
  }),
)

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(users, { fields: [session.userId], references: [users.id] }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(users, { fields: [account.userId], references: [users.id] }),
}))

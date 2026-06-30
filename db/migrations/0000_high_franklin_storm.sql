CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"company_name" text NOT NULL,
	"cnpj" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"logo_url" text NOT NULL,
	"social_links" jsonb,
	"opening_hours" jsonb,
	"is_active" boolean DEFAULT false NOT NULL,
	"has_seen_merchant_onboarding" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "businesses_cnpj_unique" UNIQUE("cnpj")
);
--> statement-breakpoint
CREATE TABLE "coupon_analytics" (
	"id" text PRIMARY KEY NOT NULL,
	"coupon_id" text NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"redemptions" integer DEFAULT 0 NOT NULL,
	"validations" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "coupon_analytics_coupon_id_unique" UNIQUE("coupon_id")
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"behavior" jsonb NOT NULL,
	"restrictions" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_metadata" (
	"id" text PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"user_id" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "file_metadata_filename_unique" UNIQUE("filename")
);
--> statement-breakpoint
CREATE TABLE "merchant_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text,
	"image_url" varchar(500),
	"is_visible" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redemptions" (
	"id" text PRIMARY KEY NOT NULL,
	"coupon_id" text NOT NULL,
	"business_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"redeemed_at" timestamp DEFAULT now() NOT NULL,
	"used_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"redemption_id" text NOT NULL,
	"coupon_id" text NOT NULL,
	"business_id" text NOT NULL,
	"user_id" text NOT NULL,
	"total_amount_cents" integer NOT NULL,
	"discount_applied_cents" integer NOT NULL,
	"final_amount_cents" integer NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"name" text NOT NULL,
	"image" text,
	"role" text DEFAULT 'resident',
	"status" text DEFAULT 'pending',
	"cpf" text,
	"phone" text,
	"address" text,
	"documents" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_analytics" ADD CONSTRAINT "coupon_analytics_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_posts" ADD CONSTRAINT "merchant_posts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_redemption_id_redemptions_id_fk" FOREIGN KEY ("redemption_id") REFERENCES "public"."redemptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_businesses_user_id" ON "businesses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_coupons_business_id" ON "coupons" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_merchant_posts_business_id" ON "merchant_posts" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_redemptions_user_coupon_month" ON "redemptions" USING btree ("user_id","coupon_id","redeemed_at");--> statement-breakpoint
CREATE INDEX "idx_redemptions_coupon_id" ON "redemptions" USING btree ("coupon_id");--> statement-breakpoint
CREATE INDEX "idx_signals_user_id" ON "signals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_signals_status" ON "signals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_transactions_coupon_id" ON "transactions" USING btree ("coupon_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_business_id" ON "transactions" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_user_id" ON "transactions" USING btree ("user_id");

--> statement-breakpoint
CREATE MATERIALIZED VIEW feed_events AS
SELECT
  mp.id || '-merchant' AS id,
  'merchant_post' AS type,
  mp.title,
  mp.body AS description,
  mp.image_url,
  mp.business_id AS business_id,
  b.name AS business_name,
  mp.created_at::timestamptz AS created_at
FROM merchant_posts mp
JOIN businesses b ON b.id = mp.business_id
WHERE mp.is_visible = true

UNION ALL

SELECT
  c.id || '-coupon' AS id,
  'coupon_released' AS type,
  c.title,
  c.description,
  NULL::varchar AS image_url,
  c.business_id,
  b.name AS business_name,
  c.created_at::timestamptz AS created_at
FROM coupons c
JOIN businesses b ON b.id = c.business_id
WHERE c.is_active = true

ORDER BY created_at DESC;
--> statement-breakpoint
CREATE UNIQUE INDEX idx_feed_events_id ON feed_events (id);

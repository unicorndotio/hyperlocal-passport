CREATE TABLE "merchant_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text,
	"image_url" varchar(500),
	"is_visible" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "merchant_posts" ADD CONSTRAINT "merchant_posts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_merchant_posts_business_id" ON "merchant_posts" USING btree ("business_id");
--> statement-breakpoint
CREATE MATERIALIZED VIEW feed_events AS
SELECT
  mp.id::text || '-merchant' AS id,
  'merchant_post' AS type,
  mp.title,
  mp.body AS description,
  mp.image_url,
  mp.business_id::text AS business_id,
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
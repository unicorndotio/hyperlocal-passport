ALTER TABLE "businesses" ADD COLUMN "cep" text;
--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "street" text;
--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "number" text;
--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "neighborhood" text;
--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "maps_url" text;
--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "expiration_date" timestamp with time zone;

CREATE TABLE "notification_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" text NOT NULL,
	"old_price" integer,
	"new_price" integer,
	"change_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "prices" ADD COLUMN "available" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "product_metrics" ADD COLUMN "available" boolean;--> statement-breakpoint
ALTER TABLE "product_metrics" ADD COLUMN "last_observation_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "product_type" text;--> statement-breakpoint
ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_queue_status_idx" ON "notification_queue" USING btree ("status","created_at");
CREATE TABLE "scraper_sessions" (
	"platform" text PRIMARY KEY NOT NULL,
	"cookie" text NOT NULL,
	"user_agent" text NOT NULL,
	"headers" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);

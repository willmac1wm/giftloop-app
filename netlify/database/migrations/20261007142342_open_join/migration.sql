ALTER TABLE "exchanges" ADD COLUMN "join_token" text;--> statement-breakpoint
ALTER TABLE "exchanges" ADD COLUMN "join_open" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "exchanges" ADD CONSTRAINT "exchanges_join_token_key" UNIQUE("join_token");
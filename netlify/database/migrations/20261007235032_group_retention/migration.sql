CREATE TABLE "exchange_traditions" (
	"exchange_id" uuid PRIMARY KEY,
	"theme" text DEFAULT '' NOT NULL,
	"rules" text DEFAULT '' NOT NULL,
	"memory" text DEFAULT '' NOT NULL,
	"photo" text DEFAULT '' NOT NULL,
	"photo_approved" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gift_preferences" (
	"user_id" text PRIMARY KEY,
	"interests" text DEFAULT '' NOT NULL,
	"avoid" text DEFAULT '' NOT NULL,
	"approach" text DEFAULT 'inspiration' NOT NULL,
	"secondhand" boolean DEFAULT false NOT NULL,
	"handmade" boolean DEFAULT false NOT NULL,
	"experiences" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exchange_traditions" ADD CONSTRAINT "exchange_traditions_exchange_id_exchanges_id_fkey" FOREIGN KEY ("exchange_id") REFERENCES "exchanges"("id") ON DELETE CASCADE;
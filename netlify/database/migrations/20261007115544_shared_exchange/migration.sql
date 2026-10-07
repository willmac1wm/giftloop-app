CREATE TABLE "exclusions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"exchange_id" uuid NOT NULL,
	"giver_member_id" uuid NOT NULL,
	"receiver_member_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_prefs" (
	"user_id" text PRIMARY KEY,
	"email_invites" boolean DEFAULT true NOT NULL,
	"email_assignments" boolean DEFAULT true NOT NULL,
	"email_reminders" boolean DEFAULT true NOT NULL,
	"sms_opt_in" boolean DEFAULT false NOT NULL,
	"phone" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"item_id" uuid NOT NULL UNIQUE,
	"member_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wish_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"list_id" uuid NOT NULL,
	"title" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"size" text DEFAULT '' NOT NULL,
	"color" text DEFAULT '' NOT NULL,
	"priority" text DEFAULT '' NOT NULL,
	"original_url" text DEFAULT '' NOT NULL,
	"shopping_url" text DEFAULT '' NOT NULL,
	"retailer" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wish_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_user_id" text NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "kind" text DEFAULT 'note' NOT NULL;--> statement-breakpoint
ALTER TABLE "exchanges" ADD COLUMN "status" text DEFAULT 'accepting' NOT NULL;--> statement-breakpoint
ALTER TABLE "exchanges" ADD COLUMN "signup_deadline" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "exchanges" ADD COLUMN "timezone" text DEFAULT 'America/Los_Angeles' NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "status" text DEFAULT 'invited' NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "invite_token" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "exchange_role" text DEFAULT 'member' NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "wish_list_id" uuid;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_invite_token_key" UNIQUE("invite_token");--> statement-breakpoint
ALTER TABLE "exclusions" ADD CONSTRAINT "exclusions_exchange_id_exchanges_id_fkey" FOREIGN KEY ("exchange_id") REFERENCES "exchanges"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "exclusions" ADD CONSTRAINT "exclusions_giver_member_id_members_id_fkey" FOREIGN KEY ("giver_member_id") REFERENCES "members"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "exclusions" ADD CONSTRAINT "exclusions_receiver_member_id_members_id_fkey" FOREIGN KEY ("receiver_member_id") REFERENCES "members"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_item_id_wish_items_id_fkey" FOREIGN KEY ("item_id") REFERENCES "wish_items"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_member_id_members_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "wish_items" ADD CONSTRAINT "wish_items_list_id_wish_lists_id_fkey" FOREIGN KEY ("list_id") REFERENCES "wish_lists"("id") ON DELETE CASCADE;
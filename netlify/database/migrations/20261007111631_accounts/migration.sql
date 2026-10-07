CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"exchange_id" uuid NOT NULL,
	"giver_member_id" uuid NOT NULL,
	"receiver_member_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"exchange_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"status" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exchanges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organizer_id" text NOT NULL,
	"organizer_email" text NOT NULL,
	"title" text NOT NULL,
	"budget" text DEFAULT '' NOT NULL,
	"occasion" text DEFAULT 'Christmas' NOT NULL,
	"event_date" text DEFAULT '' NOT NULL,
	"invite_message" text DEFAULT '' NOT NULL,
	"drawn_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"exchange_id" uuid NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"list_title" text DEFAULT '' NOT NULL,
	"age_band" text DEFAULT '' NOT NULL,
	"shop_for" text DEFAULT '' NOT NULL,
	"wishes" text DEFAULT '' NOT NULL,
	"hobbies" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_exchange_id_exchanges_id_fkey" FOREIGN KEY ("exchange_id") REFERENCES "exchanges"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_giver_member_id_members_id_fkey" FOREIGN KEY ("giver_member_id") REFERENCES "members"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_receiver_member_id_members_id_fkey" FOREIGN KEY ("receiver_member_id") REFERENCES "members"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_exchange_id_exchanges_id_fkey" FOREIGN KEY ("exchange_id") REFERENCES "exchanges"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_member_id_members_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_exchange_id_exchanges_id_fkey" FOREIGN KEY ("exchange_id") REFERENCES "exchanges"("id") ON DELETE CASCADE;
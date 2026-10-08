CREATE TABLE "merchants" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"domains" text NOT NULL,
	"affiliate_param" text DEFAULT '' NOT NULL,
	"config_key" text DEFAULT '' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"countries" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"exchange_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"kind" text NOT NULL,
	"run_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"requester_user_id" text DEFAULT '' NOT NULL,
	"requester_email" text DEFAULT '' NOT NULL,
	"subject" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "provider_message_id" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_prefs" ADD COLUMN "sms_stopped_at" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_jobs" ADD CONSTRAINT "notification_jobs_exchange_id_exchanges_id_fkey" FOREIGN KEY ("exchange_id") REFERENCES "exchanges"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "notification_jobs" ADD CONSTRAINT "notification_jobs_member_id_members_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE;
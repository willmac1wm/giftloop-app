ALTER TABLE "notification_prefs" ADD COLUMN "timezone" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_prefs" ADD COLUMN "reminder_days" integer DEFAULT 7 NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_prefs" ADD COLUMN "reminder_time" text DEFAULT '09:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_prefs" ADD COLUMN "quiet_start" integer DEFAULT 21 NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_prefs" ADD COLUMN "quiet_end" integer DEFAULT 8 NOT NULL;
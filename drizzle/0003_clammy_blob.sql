CREATE TYPE "public"."visitor_log_type" AS ENUM('QR', 'login');--> statement-breakpoint
ALTER TABLE "visitor_logs" ADD COLUMN "type" "visitor_log_type" DEFAULT 'QR' NOT NULL;
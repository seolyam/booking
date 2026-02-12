-- Migration: Status refactor (10 → 4 values) + new tables (visitor_logs, request_ratings)

-- Step 1: Map existing request statuses to new values
UPDATE "requests" SET "status" = 'submitted' WHERE "status" = 'draft';
UPDATE "requests" SET "status" = 'submitted' WHERE "status" = 'resubmitted';
UPDATE "requests" SET "status" = 'approved' WHERE "status" = 'closed';
--> statement-breakpoint

-- Step 2: Convert status column to text temporarily
ALTER TABLE "requests" ALTER COLUMN "status" SET DATA TYPE text;
--> statement-breakpoint

-- Step 3: Map remaining old values to new values
UPDATE "requests" SET "status" = 'open' WHERE "status" = 'submitted';
UPDATE "requests" SET "status" = 'pending' WHERE "status" IN ('pending_review', 'reviewed', 'on_hold', 'needs_revision');
UPDATE "requests" SET "status" = 'resolved' WHERE "status" = 'approved';
UPDATE "requests" SET "status" = 'cancelled' WHERE "status" = 'rejected';
--> statement-breakpoint

-- Step 4: Drop old enum and create new one
DROP TYPE "public"."request_status";
--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('open', 'pending', 'resolved', 'cancelled');
--> statement-breakpoint

-- Step 5: Convert column back to enum
ALTER TABLE "requests" ALTER COLUMN "status" SET DATA TYPE "public"."request_status" USING "status"::"public"."request_status";
--> statement-breakpoint
ALTER TABLE "requests" ALTER COLUMN "status" SET DEFAULT 'open';
--> statement-breakpoint

-- Step 6: Create visitor_logs table
CREATE TABLE "visitor_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"company" text,
	"contact_number" text,
	"purpose_of_visit" text NOT NULL,
	"time_in" timestamp with time zone DEFAULT now() NOT NULL,
	"time_out" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_visitor_logs_time_in" ON "visitor_logs" USING btree ("time_in");
--> statement-breakpoint

-- Step 7: Create request_ratings table
CREATE TABLE "request_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comments" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_request_ratings_request" ON "request_ratings" USING btree ("request_id");
--> statement-breakpoint
ALTER TABLE "request_ratings" ADD CONSTRAINT "request_ratings_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;

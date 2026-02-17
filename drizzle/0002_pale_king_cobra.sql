CREATE TYPE "public"."visit_status" AS ENUM('ACTIVE', 'COMPLETED', 'AUTO_CLOSED');--> statement-breakpoint
CREATE TABLE "form_configs" (
	"category_key" text PRIMARY KEY NOT NULL,
	"category_label" text,
	"description" text,
	"icon_key" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"required_pdfs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"instructions" text,
	"fields" jsonb DEFAULT '[]'::jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "request_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comments" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visitor_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"company" text,
	"contact_number" text,
	"purpose_of_visit" text NOT NULL,
	"expected_duration" integer,
	"expected_end_time" timestamp with time zone,
	"status" "visit_status" DEFAULT 'ACTIVE' NOT NULL,
	"auto_closed" boolean DEFAULT false NOT NULL,
	"time_in" timestamp with time zone DEFAULT now() NOT NULL,
	"time_out" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "requests" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "requests" ALTER COLUMN "status" SET DEFAULT 'open'::text;--> statement-breakpoint
DROP TYPE "public"."request_status";--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('open', 'pending', 'resolved', 'cancelled');--> statement-breakpoint
ALTER TABLE "requests" ALTER COLUMN "status" SET DEFAULT 'open'::"public"."request_status";--> statement-breakpoint
ALTER TABLE "requests" ALTER COLUMN "status" SET DATA TYPE "public"."request_status" USING "status"::"public"."request_status";--> statement-breakpoint
ALTER TABLE "requests" ALTER COLUMN "category" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "form_configs" ADD CONSTRAINT "form_configs_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_ratings" ADD CONSTRAINT "request_ratings_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_request_ratings_request" ON "request_ratings" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "idx_visitor_logs_time_in" ON "visitor_logs" USING btree ("time_in");--> statement-breakpoint
CREATE INDEX "idx_visitor_logs_status_end" ON "visitor_logs" USING btree ("status","expected_end_time");
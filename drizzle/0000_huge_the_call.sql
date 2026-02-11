CREATE TYPE "public"."application_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."request_category" AS ENUM('flight_booking', 'hotel_accommodation', 'meals', 'room_reservation', 'business_permits', 'radio_licenses', 'work_permit', 'equipments_assets');--> statement-breakpoint
CREATE TYPE "public"."request_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('draft', 'submitted', 'pending_review', 'reviewed', 'on_hold', 'needs_revision', 'resubmitted', 'approved', 'rejected', 'closed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('requester', 'admin', 'superadmin');--> statement-breakpoint
CREATE SEQUENCE "public"."ticket_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"previous_status" text,
	"new_status" text,
	"comment" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"file_path" text NOT NULL,
	"file_size" integer NOT NULL,
	"file_type" text DEFAULT 'application/pdf' NOT NULL,
	"label" text,
	"uploaded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"address" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branches_name_unique" UNIQUE("name"),
	CONSTRAINT "branches_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text DEFAULT 'info' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"link" text,
	"resource_id" uuid,
	"resource_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_number" bigint DEFAULT nextval('public.ticket_number_seq') NOT NULL,
	"title" text NOT NULL,
	"requester_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"category" "request_category" NOT NULL,
	"status" "request_status" DEFAULT 'draft' NOT NULL,
	"priority" "request_priority" DEFAULT 'medium' NOT NULL,
	"form_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"remarks" text,
	"rejection_reason" text,
	"closed_at" timestamp with time zone,
	"closed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role" "user_role" DEFAULT 'requester' NOT NULL,
	"branch_id" uuid,
	"approval_status" "application_status" DEFAULT 'pending' NOT NULL,
	"requested_role" "user_role" DEFAULT 'requester' NOT NULL,
	"full_name" text,
	"position" text,
	"department" text,
	"id_number" text,
	"id_document_path" text,
	"approved_at" timestamp with time zone,
	"approved_by" uuid,
	"rejected_at" timestamp with time zone,
	"rejected_by" uuid,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_branches" ADD CONSTRAINT "admin_branches_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_branches" ADD CONSTRAINT "admin_branches_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_activity_logs_request" ON "activity_logs" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "idx_activity_logs_actor" ON "activity_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "idx_activity_logs_created_at" ON "activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_admin_branches_admin" ON "admin_branches" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "idx_admin_branches_branch" ON "admin_branches" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_attachments_request" ON "attachments" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "idx_attachments_uploader" ON "attachments" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "idx_comments_request" ON "comments" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_unread" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "idx_requests_requester" ON "requests" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "idx_requests_branch" ON "requests" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_requests_category" ON "requests" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_requests_status" ON "requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_requests_created_at" ON "requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_users_branch" ON "users" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_users_approval_status" ON "users" USING btree ("approval_status");
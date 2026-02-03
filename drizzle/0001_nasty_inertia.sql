CREATE TYPE "public"."budget_category_type" AS ENUM('CAPEX', 'OPEX', 'BOTH');--> statement-breakpoint
CREATE TABLE "archived_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"archived_budget_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"previous_status" text,
	"new_status" text,
	"timestamp" timestamp with time zone NOT NULL,
	"comment" text
);
--> statement-breakpoint
CREATE TABLE "archived_budget_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"archived_budget_id" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_cost" numeric(15, 2) NOT NULL,
	"total_cost" numeric(15, 2) NOT NULL,
	"quarter" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "archived_budget_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"archived_budget_id" uuid NOT NULL,
	"description" text NOT NULL,
	"target_quarter" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "archived_budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_budget_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"budget_number" bigint NOT NULL,
	"project_code" text,
	"budget_type" "budget_type" NOT NULL,
	"fiscal_year" integer NOT NULL,
	"status" "budget_status" NOT NULL,
	"total_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"variance_explanation" text,
	"roi_analysis" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"archived_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"allowed_type" "budget_category_type" DEFAULT 'BOTH' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "budget_project_counters" (
	"fiscal_year" integer NOT NULL,
	"budget_type" "budget_type" NOT NULL,
	"next_number" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_project_counters_fiscal_year_budget_type_pk" PRIMARY KEY("fiscal_year","budget_type")
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
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_code" text NOT NULL,
	"name" text NOT NULL,
	"department" text NOT NULL,
	"description" text,
	"created_by" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_project_code_unique" UNIQUE("project_code")
);
--> statement-breakpoint
ALTER TABLE "budget_items" ALTER COLUMN "unit_cost" SET DATA TYPE numeric(15, 2);--> statement-breakpoint
ALTER TABLE "budget_items" ALTER COLUMN "total_cost" SET DATA TYPE numeric(15, 2);--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "budget_number" bigint DEFAULT nextval('public.budget_number_seq') NOT NULL;--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "project_code" text;--> statement-breakpoint
ALTER TABLE "archived_audit_logs" ADD CONSTRAINT "archived_audit_logs_archived_budget_id_archived_budgets_id_fk" FOREIGN KEY ("archived_budget_id") REFERENCES "public"."archived_budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "archived_audit_logs" ADD CONSTRAINT "archived_audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "archived_budget_items" ADD CONSTRAINT "archived_budget_items_archived_budget_id_archived_budgets_id_fk" FOREIGN KEY ("archived_budget_id") REFERENCES "public"."archived_budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "archived_budget_milestones" ADD CONSTRAINT "archived_budget_milestones_archived_budget_id_archived_budgets_id_fk" FOREIGN KEY ("archived_budget_id") REFERENCES "public"."archived_budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "archived_budgets" ADD CONSTRAINT "archived_budgets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "archived_budgets_source_uq" ON "archived_budgets" USING btree ("source_budget_id");--> statement-breakpoint
CREATE UNIQUE INDEX "archived_budgets_project_code_year_uq" ON "archived_budgets" USING btree ("fiscal_year","project_code");--> statement-breakpoint
CREATE INDEX "idx_projects_project_code" ON "projects" USING btree ("project_code");--> statement-breakpoint
CREATE INDEX "idx_projects_department" ON "projects" USING btree ("department");--> statement-breakpoint
CREATE INDEX "idx_projects_created_by" ON "projects" USING btree ("created_by");--> statement-breakpoint
CREATE UNIQUE INDEX "budgets_project_code_year_uq" ON "budgets" USING btree ("fiscal_year","project_code");
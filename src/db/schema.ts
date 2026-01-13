import {
  pgTable,
  uuid,
  text,
  integer,
  decimal,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

// Enums
export const departmentEnum = pgEnum("department", [
  "Office of the President",
  "CESRA",
  "Customer Care",
  "HCM",
  "Controllership",
  "Admin and General Services",
  "Finance",
  "Procurement",
  "Legal",
  "NDOG",
]);

export const userRoleEnum = pgEnum("user_role", [
  "requester",
  "reviewer",
  "approver",
  "superadmin",
]);

export const applicationStatusEnum = pgEnum("application_status", [
  "pending",
  "approved",
  "rejected",
]);

export const budgetTypeEnum = pgEnum("budget_type", ["capex", "opex"]);

export const budgetStatusEnum = pgEnum("budget_status", [
  "draft",
  "submitted",
  "revision_requested",
  "verified_by_reviewer", // Instructions say 'verified' in Step A details but 'verified_by_reviewer' in Data Flow 2.0. "If valid: Verifies it (Status -> verified_by_reviewer)". Step A says 'verified'. I will use 'verified' as per Step A Schema definition instructions.
  "verified",
  "approved",
  "rejected",
]);

// Tables

export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // Links to Supabase Auth User ID
  email: text("email").notNull(),
  role: userRoleEnum("role").notNull().default("requester"),
  department: departmentEnum("department").notNull(),
  approval_status: applicationStatusEnum("approval_status")
    .notNull()
    .default("pending"),
  requested_role: userRoleEnum("requested_role").notNull().default("requester"),
  full_name: text("full_name"),
  position: text("position"),
  id_number: text("id_number"),
  id_document_path: text("id_document_path"),
  approved_at: timestamp("approved_at", { withTimezone: true }),
  approved_by: uuid("approved_by"),
  rejected_at: timestamp("rejected_at", { withTimezone: true }),
  rejected_by: uuid("rejected_by"),
  rejection_reason: text("rejection_reason"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const budgets = pgTable("budgets", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: uuid("user_id")
    .references(() => users.id)
    .notNull(), // requester
  budget_type: budgetTypeEnum("budget_type").notNull(),
  fiscal_year: integer("fiscal_year").notNull(),
  status: budgetStatusEnum("status").default("draft").notNull(),
  total_amount: decimal("total_amount", { precision: 15, scale: 2 })
    .notNull()
    .default("0"),
  variance_explanation: text("variance_explanation"), // Nullable
  roi_analysis: text("roi_analysis"), // Nullable, only for approver. Text or JSON. Instructions say text/json. Let's use text for simplicity or jsonb if structured. "text/json, nullable" -> logic says text is easier for "Hidden Details".
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const budgetItems = pgTable("budget_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  budget_id: uuid("budget_id")
    .references(() => budgets.id, { onDelete: "cascade" })
    .notNull(),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull(),
  unit_cost: decimal("unit_cost", { precision: 12, scale: 2 }).notNull(),
  total_cost: decimal("total_cost", { precision: 12, scale: 2 }).notNull(),
  quarter: text("quarter").notNull(), // Q1, Q2, Q3, Q4. Could be enum but text is flexible enough for now.
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  budget_id: uuid("budget_id")
    .references(() => budgets.id, { onDelete: "cascade" })
    .notNull(),
  actor_id: uuid("actor_id")
    .references(() => users.id)
    .notNull(),
  action: text("action").notNull(), // e.g. 'submit', 'verify', 'reject', 'approve'
  previous_status: text("previous_status"),
  new_status: text("new_status"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  comment: text("comment"), // For revision comments or rejection reasons
});

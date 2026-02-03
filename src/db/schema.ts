import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  decimal,
  timestamp,
  pgEnum,
  boolean,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";

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

// Category type enum for budget categories
export const budgetCategoryTypeEnum = pgEnum("budget_category_type", [
  "CAPEX",
  "OPEX",
  "BOTH",
]);

// Tables

// Projects table - groups budget requests
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    project_code: text("project_code").notNull().unique(),
    name: text("name").notNull(),
    department: text("department").notNull(),
    description: text("description"),
    created_by: uuid("created_by").references(() => users.id),
    is_active: boolean("is_active").default(true).notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_projects_project_code").on(table.project_code),
    index("idx_projects_department").on(table.department),
    index("idx_projects_created_by").on(table.created_by),
  ],
);

// Budget categories with allowed type
export const budgetCategories = pgTable("budget_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  allowed_type: budgetCategoryTypeEnum("allowed_type")
    .notNull()
    .default("BOTH"),
  is_active: boolean("is_active").default(true).notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

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

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user_id: uuid("user_id")
      .references(() => users.id)
      .notNull(), // requester
    budget_number: bigint("budget_number", { mode: "number" })
      .default(sql`nextval('public.budget_number_seq')`)
      .notNull(),
    // Human-friendly, year-resetting project ID: CapEx-1..CapEx-N / OpEx-1..OpEx-N
    // Nullable for backwards compatibility (older rows).
    project_code: text("project_code"),
    title: text("title"),
    budget_type: budgetTypeEnum("budget_type").notNull(),
    fiscal_year: integer("fiscal_year").notNull(),
    status: budgetStatusEnum("status").default("draft").notNull(),
    total_amount: decimal("total_amount", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    variance_explanation: text("variance_explanation"), // Nullable
    roi_analysis: text("roi_analysis"), // Nullable, only for approver. Text or JSON. Instructions say text/json. Let's use text for simplicity or jsonb if structured. "text/json, nullable" -> logic says text is easier for "Hidden Details".
    start_date: timestamp("start_date"),
    end_date: timestamp("end_date"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    projectCodePerYearUq: uniqueIndex("budgets_project_code_year_uq").on(
      t.fiscal_year,
      t.project_code,
    ),
  }),
);

export const budgetProjectCounters = pgTable(
  "budget_project_counters",
  {
    fiscal_year: integer("fiscal_year").notNull(),
    budget_type: budgetTypeEnum("budget_type").notNull(),
    // Next number to assign (1-based).
    next_number: integer("next_number").notNull().default(1),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.fiscal_year, t.budget_type] }),
  }),
);

export const archivedBudgets = pgTable(
  "archived_budgets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Original budget UUID from the active table.
    source_budget_id: uuid("source_budget_id").notNull(),
    user_id: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    budget_number: bigint("budget_number", { mode: "number" }).notNull(),
    project_code: text("project_code"),
    title: text("title"),
    budget_type: budgetTypeEnum("budget_type").notNull(),
    fiscal_year: integer("fiscal_year").notNull(),
    status: budgetStatusEnum("status").notNull(),
    total_amount: decimal("total_amount", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    variance_explanation: text("variance_explanation"),
    roi_analysis: text("roi_analysis"),
    start_date: timestamp("start_date"),
    end_date: timestamp("end_date"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull(),
    archived_at: timestamp("archived_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    sourceUq: uniqueIndex("archived_budgets_source_uq").on(t.source_budget_id),
    projectCodePerYearUq: uniqueIndex(
      "archived_budgets_project_code_year_uq",
    ).on(t.fiscal_year, t.project_code),
  }),
);

export const archivedBudgetItems = pgTable("archived_budget_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  archived_budget_id: uuid("archived_budget_id")
    .references(() => archivedBudgets.id, { onDelete: "cascade" })
    .notNull(),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull(),
  unit_cost: decimal("unit_cost", { precision: 15, scale: 2 }).notNull(),
  total_cost: decimal("total_cost", { precision: 15, scale: 2 }).notNull(),
  quarter: text("quarter").notNull(),
});

export const archivedBudgetMilestones = pgTable("archived_budget_milestones", {
  id: uuid("id").defaultRandom().primaryKey(),
  archived_budget_id: uuid("archived_budget_id")
    .references(() => archivedBudgets.id, { onDelete: "cascade" })
    .notNull(),
  description: text("description").notNull(),
  target_quarter: text("target_quarter"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const archivedAuditLogs = pgTable("archived_audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  archived_budget_id: uuid("archived_budget_id")
    .references(() => archivedBudgets.id, { onDelete: "cascade" })
    .notNull(),
  actor_id: uuid("actor_id")
    .references(() => users.id)
    .notNull(),
  action: text("action").notNull(),
  previous_status: text("previous_status"),
  new_status: text("new_status"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  comment: text("comment"),
});

export const budgetItems = pgTable("budget_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  budget_id: uuid("budget_id")
    .references(() => budgets.id, { onDelete: "cascade" })
    .notNull(),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull(),
  unit_cost: decimal("unit_cost", { precision: 15, scale: 2 }).notNull(),
  total_cost: decimal("total_cost", { precision: 15, scale: 2 }).notNull(),
  quarter: text("quarter").notNull(), // Q1, Q2, Q3, Q4. Could be enum but text is flexible enough for now.
});

export const budgetMilestones = pgTable("budget_milestones", {
  id: uuid("id").defaultRandom().primaryKey(),
  budget_id: uuid("budget_id")
    .references(() => budgets.id, { onDelete: "cascade" })
    .notNull(),
  description: text("description").notNull(),
  target_quarter: text("target_quarter"), // e.g. 'Q1'
  created_at: timestamp("created_at").defaultNow().notNull(),
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

export const reviewChecklists = pgTable("review_checklists", {
  id: uuid("id").defaultRandom().primaryKey(),
  budget_id: uuid("budget_id")
    .references(() => budgets.id, { onDelete: "cascade" })
    .notNull(),
  reviewer_id: uuid("reviewer_id")
    .references(() => users.id)
    .notNull(),
  item_key: text("item_key").notNull(), // 'documented_costs', 'reasonable_costs', etc.
  item_label: text("item_label").notNull(), // Display label
  is_checked: boolean("is_checked").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================================
// Relations
// ============================================================================

export const projectsRelations = relations(projects, ({ one, many }) => ({
  creator: one(users, {
    fields: [projects.created_by],
    references: [users.id],
  }),
  budgets: many(budgets),
}));

export const budgetsRelations = relations(budgets, ({ one, many }) => ({
  user: one(users, {
    fields: [budgets.user_id],
    references: [users.id],
  }),
  items: many(budgetItems),
  milestones: many(budgetMilestones),
  auditLogs: many(auditLogs),
}));

export const budgetItemsRelations = relations(budgetItems, ({ one }) => ({
  budget: one(budgets, {
    fields: [budgetItems.budget_id],
    references: [budgets.id],
  }),
}));

export const budgetMilestonesRelations = relations(
  budgetMilestones,
  ({ one }) => ({
    budget: one(budgets, {
      fields: [budgetMilestones.budget_id],
      references: [budgets.id],
    }),
  }),
);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  budget: one(budgets, {
    fields: [auditLogs.budget_id],
    references: [budgets.id],
  }),
  actor: one(users, {
    fields: [auditLogs.actor_id],
    references: [users.id],
  }),
}));

// Type exports for convenience
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
export type BudgetCategory = typeof budgetCategories.$inferSelect;
export type BudgetItem = typeof budgetItems.$inferSelect;

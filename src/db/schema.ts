import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  pgEnum,
  boolean,
  jsonb,
  bigint,
  index,
  pgSequence,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";

// ============================================================================
// Sequences
// ============================================================================

export const ticketNumberSeq = pgSequence("ticket_number_seq", { startWith: 1 });

// ============================================================================
// Enums
// ============================================================================

export const userRoleEnum = pgEnum("user_role", [
  "requester",
  "admin",
  "superadmin",
]);

export const applicationStatusEnum = pgEnum("application_status", [
  "pending",
  "approved",
  "rejected",
]);

export const requestCategoryEnum = pgEnum("request_category", [
  "flight_booking",
  "hotel_accommodation",
  "meals",
  "room_reservation",
  "business_permits",
  "radio_licenses",
  "work_permit",
  "equipments_assets",
]);

export const requestStatusEnum = pgEnum("request_status", [
  "open",
  "pending",
  "resolved",
  "cancelled",
]);

export const requestPriorityEnum = pgEnum("request_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

// ============================================================================
// Tables
// ============================================================================

export const branches = pgTable("branches", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  code: text("code").notNull().unique(),
  address: text("address"),
  is_active: boolean("is_active").default(true).notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(), // Links to Supabase Auth User ID
    email: text("email").notNull(),
    role: userRoleEnum("role").notNull().default("requester"),
    branch_id: uuid("branch_id").references(() => branches.id),
    approval_status: applicationStatusEnum("approval_status")
      .notNull()
      .default("pending"),
    requested_role: userRoleEnum("requested_role")
      .notNull()
      .default("requester"),
    full_name: text("full_name"),
    position: text("position"),
    department: text("department"),
    id_number: text("id_number"),
    id_document_path: text("id_document_path"),
    approved_at: timestamp("approved_at", { withTimezone: true }),
    approved_by: uuid("approved_by"),
    rejected_at: timestamp("rejected_at", { withTimezone: true }),
    rejected_by: uuid("rejected_by"),
    rejection_reason: text("rejection_reason"),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_users_branch").on(table.branch_id),
    index("idx_users_role").on(table.role),
    index("idx_users_approval_status").on(table.approval_status),
  ],
);

export const adminBranches = pgTable(
  "admin_branches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    admin_id: uuid("admin_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    branch_id: uuid("branch_id")
      .references(() => branches.id, { onDelete: "cascade" })
      .notNull(),
    assigned_at: timestamp("assigned_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_admin_branches_admin").on(table.admin_id),
    index("idx_admin_branches_branch").on(table.branch_id),
  ],
);

export const requests = pgTable(
  "requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticket_number: bigint("ticket_number", { mode: "number" })
      .default(sql`nextval('public.ticket_number_seq')`)
      .notNull(),
    title: text("title").notNull(),
    requester_id: uuid("requester_id")
      .references(() => users.id)
      .notNull(),
    branch_id: uuid("branch_id")
      .references(() => branches.id)
      .notNull(),
    category: text("category").notNull(),
    status: requestStatusEnum("status").default("open").notNull(),
    priority: requestPriorityEnum("priority").default("medium").notNull(),
    form_data: jsonb("form_data").notNull().default({}),
    remarks: text("remarks"),
    rejection_reason: text("rejection_reason"),
    closed_at: timestamp("closed_at", { withTimezone: true }),
    closed_by: uuid("closed_by").references(() => users.id),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_requests_requester").on(table.requester_id),
    index("idx_requests_branch").on(table.branch_id),
    index("idx_requests_category").on(table.category),
    index("idx_requests_status").on(table.status),
    index("idx_requests_created_at").on(table.created_at),
  ],
);

export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    request_id: uuid("request_id")
      .references(() => requests.id, { onDelete: "cascade" })
      .notNull(),
    file_name: text("file_name").notNull(),
    file_path: text("file_path").notNull(),
    file_size: integer("file_size").notNull(),
    file_type: text("file_type").notNull().default("application/pdf"),
    label: text("label"),
    uploaded_by: uuid("uploaded_by")
      .references(() => users.id)
      .notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_attachments_request").on(table.request_id),
    index("idx_attachments_uploader").on(table.uploaded_by),
  ],
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    request_id: uuid("request_id")
      .references(() => requests.id, { onDelete: "cascade" })
      .notNull(),
    user_id: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    content: text("content").notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_comments_request").on(table.request_id),
  ],
);

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    request_id: uuid("request_id")
      .references(() => requests.id, { onDelete: "cascade" })
      .notNull(),
    actor_id: uuid("actor_id")
      .references(() => users.id)
      .notNull(),
    action: text("action").notNull(),
    previous_status: text("previous_status"),
    new_status: text("new_status"),
    comment: text("comment"),
    metadata: jsonb("metadata"),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_activity_logs_request").on(table.request_id),
    index("idx_activity_logs_actor").on(table.actor_id),
    index("idx_activity_logs_created_at").on(table.created_at),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user_id: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    type: text("type").default("info").notNull(),
    is_read: boolean("is_read").default(false).notNull(),
    link: text("link"),
    resource_id: uuid("resource_id"),
    resource_type: text("resource_type"),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_notifications_user").on(table.user_id),
    index("idx_notifications_unread").on(table.user_id, table.is_read),
  ],
);

export type FieldSchema = {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  enabled?: boolean;
  options?: { label: string; value: string }[];
  placeholder?: string;
  description?: string;
};

export const formConfigs = pgTable(
  "form_configs",
  {
    category_key: text("category_key").primaryKey(),
    category_label: text("category_label"),
    description: text("description"),
    icon_key: text("icon_key"),
    is_active: boolean("is_active").default(true).notNull(),
    required_pdfs: jsonb("required_pdfs").$type<string[]>().default([]).notNull(),
    instructions: text("instructions"),
    fields: jsonb("fields").$type<FieldSchema[]>().default([]),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_by: uuid("updated_by").references(() => users.id),
  }
);

export const visitorLogs = pgTable(
  "visitor_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    company: text("company"),
    contact_number: text("contact_number"),
    purpose_of_visit: text("purpose_of_visit").notNull(),
    time_in: timestamp("time_in", { withTimezone: true }).defaultNow().notNull(),
    time_out: timestamp("time_out", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_visitor_logs_time_in").on(table.time_in),
  ],
);

export const requestRatings = pgTable(
  "request_ratings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    request_id: uuid("request_id")
      .references(() => requests.id, { onDelete: "cascade" })
      .notNull(),
    rating: integer("rating").notNull(),
    comments: text("comments"),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_request_ratings_request").on(table.request_id),
  ],
);

// ============================================================================
// Relations
// ============================================================================

export const branchesRelations = relations(branches, ({ many }) => ({
  users: many(users),
  adminAssignments: many(adminBranches),
  requests: many(requests),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  branch: one(branches, {
    fields: [users.branch_id],
    references: [branches.id],
  }),
  requests: many(requests),
  comments: many(comments),
  notifications: many(notifications),
  adminBranches: many(adminBranches),
}));

export const adminBranchesRelations = relations(adminBranches, ({ one }) => ({
  admin: one(users, {
    fields: [adminBranches.admin_id],
    references: [users.id],
  }),
  branch: one(branches, {
    fields: [adminBranches.branch_id],
    references: [branches.id],
  }),
}));

export const requestsRelations = relations(requests, ({ one, many }) => ({
  requester: one(users, {
    fields: [requests.requester_id],
    references: [users.id],
  }),
  branch: one(branches, {
    fields: [requests.branch_id],
    references: [branches.id],
  }),
  attachments: many(attachments),
  comments: many(comments),
  activityLogs: many(activityLogs),
  ratings: many(requestRatings),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  request: one(requests, {
    fields: [attachments.request_id],
    references: [requests.id],
  }),
  uploader: one(users, {
    fields: [attachments.uploaded_by],
    references: [users.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  request: one(requests, {
    fields: [comments.request_id],
    references: [requests.id],
  }),
  user: one(users, {
    fields: [comments.user_id],
    references: [users.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  request: one(requests, {
    fields: [activityLogs.request_id],
    references: [requests.id],
  }),
  actor: one(users, {
    fields: [activityLogs.actor_id],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.user_id],
    references: [users.id],
  }),
}));

export const requestRatingsRelations = relations(requestRatings, ({ one }) => ({
  request: one(requests, {
    fields: [requestRatings.request_id],
    references: [requests.id],
  }),
}));

// ============================================================================
// Type exports
// ============================================================================

export type Branch = typeof branches.$inferSelect;
export type NewBranch = typeof branches.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Request = typeof requests.$inferSelect;
export type NewRequest = typeof requests.$inferInsert;
export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type FormConfig = typeof formConfigs.$inferSelect;
export type NewFormConfig = typeof formConfigs.$inferInsert;
export type VisitorLog = typeof visitorLogs.$inferSelect;
export type NewVisitorLog = typeof visitorLogs.$inferInsert;
export type RequestRating = typeof requestRatings.$inferSelect;
export type NewRequestRating = typeof requestRatings.$inferInsert;

// ============================================================================
// Category metadata
// ============================================================================

export type CategoryMeta = {
  key: string;
  label: string;
  code: string;
  description: string;
  icon: string;
};

export const CATEGORIES: CategoryMeta[] = [
  {
    key: "flight_booking",
    label: "Flight Booking",
    code: "FLT",
    description: "Domestic and international air travel bookings.",
    icon: "Plane",
  },
  {
    key: "hotel_accommodation",
    label: "Hotel Accommodation",
    code: "HTL",
    description: "Overnight lodging and accommodation requests.",
    icon: "Hotel",
  },
  {
    key: "meals",
    label: "Meals",
    code: "MLS",
    description: "Staff meals, client entertainment, and per diems.",
    icon: "UtensilsCrossed",
  },
  {
    key: "room_reservation",
    label: "Room Reservation",
    code: "RSV",
    description: "Bookings for internal conference rooms and workspaces.",
    icon: "DoorOpen",
  },
  {
    key: "business_permits",
    label: "Business Permits",
    code: "BSP",
    description: "Commercial operation and regulatory compliance permits.",
    icon: "FileCheck",
  },
  {
    key: "radio_licenses",
    label: "Radio Licenses",
    code: "RAD",
    description: "Clearance and licensing for radio or transmission equipment.",
    icon: "Radio",
  },
  {
    key: "work_permit",
    label: "Work Permit",
    code: "WKP",
    description: "Employment authorization and site access documents.",
    icon: "HardHat",
  },
  {
    key: "equipments_assets",
    label: "Equipments & Assets",
    code: "EQP",
    description: "Hardware, machinery, office furniture, and peripherals.",
    icon: "Package",
  },
];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c])
);

// Required PDF labels per category
export const REQUIRED_PDFS: Record<string, string[]> = {
  flight_booking: ["Travel authority", "Supporting memo"],
  hotel_accommodation: ["Travel approval", "Event or meeting details", "Hotel booking confirmation"],
  meals: ["Receipt or invoice", "Approval memo"],
  room_reservation: ["Meeting agenda", "Authorization form"],
  business_permits: ["Application form", "Supporting documents"],
  radio_licenses: ["License application", "Technical specifications"],
  work_permit: ["Employment contract", "Authorization letter"],
  equipments_assets: ["Quotation", "Manager approval", "Delivery note", "Invoice", "Receipt"],
};

// Status display labels and variants
export const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "success" | "warning" | "error" | "info" | "default" }
> = {
  open: { label: "Open", variant: "info" },
  pending: { label: "Pending", variant: "warning" },
  resolved: { label: "Resolved", variant: "success" },
  cancelled: { label: "Cancelled", variant: "default" },
};

// Workflow steps for progress display
export const WORKFLOW_STEPS = [
  "Created",
  "Open",
  "Pending",
  "Resolved",
];
